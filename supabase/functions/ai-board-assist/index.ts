import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um assistente de produtividade do Mind Pro AI, especializado em gestão de projetos e quadros Kanban.

O usuário vai descrever um OBJETIVO ou PROJETO. Você deve gerar uma estrutura de colunas e cards para um quadro Kanban.

Responda SOMENTE com JSON válido no formato:
{
  "columns": [
    {
      "title": "A Fazer",
      "cards": [
        { "title": "Tarefa 1", "description": "Descrição opcional" },
        { "title": "Tarefa 2" }
      ]
    },
    {
      "title": "Em Progresso",
      "cards": []
    },
    {
      "title": "Concluído",
      "cards": []
    }
  ]
}

Regras:
- Gere entre 3 e 6 colunas que façam sentido para o objetivo.
- Distribua entre 3 e 15 cards nas colunas, priorizando a primeira coluna.
- Use títulos de cards concisos e acionáveis (comece com verbo quando possível).
- Descrições são opcionais — use apenas quando agregar valor.
- Adapte os nomes das colunas ao contexto (ex: "Backlog", "Sprint", "Review", "Deploy" para projetos de software).
- Responda em português.
- NÃO inclua markdown, explicações ou texto fora do JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { objective } = await req.json();

    if (!objective || typeof objective !== "string" || objective.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Objetivo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve AI provider
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const provider = settings?.provider ?? "lovable";
    const model = settings?.model ?? "google/gemini-3-flash-preview";
    const externalKey = settings?.api_key_encrypted;

    let apiUrl: string;
    let authHeader: string;
    let bodyModel: string;

    if (provider === "openai" && externalKey) {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      authHeader = `Bearer ${externalKey}`;
      bodyModel = model || "gpt-4o-mini";
    } else if (provider === "gemini" && externalKey) {
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      authHeader = `Bearer ${externalKey}`;
      bodyModel = model || "gemini-2.5-flash";
    } else {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) {
        return new Response(
          JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      authHeader = `Bearer ${lovableKey}`;
      bodyModel = model;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: bodyModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Crie um quadro Kanban para o seguinte objetivo: "${objective.trim()}"` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Erro do provedor de IA (${response.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON robustly
    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    // Find JSON boundaries
    const jsonStart = jsonStr.search(/[\{\[]/);
    const jsonEnd = jsonStr.lastIndexOf(jsonStart !== -1 && jsonStr[jsonStart] === '[' ? ']' : '}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      // Try fixing common issues
      const cleaned = jsonStr
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "");
      try {
        const parsed = JSON.parse(cleaned);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Failed to parse AI response:", jsonStr);
        return new Response(
          JSON.stringify({ error: "A IA retornou um formato inválido. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  } catch (e) {
    console.error("ai-board-assist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
