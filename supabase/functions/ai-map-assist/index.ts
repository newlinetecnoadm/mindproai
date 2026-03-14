import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GENERATE_SYSTEM = `Você é um assistente especializado em mapas mentais e diagramas do Mind Pro AI.

Quando o modo for "generate", o usuário enviará um TEMA e um TIPO de diagrama.
Você deve retornar uma estrutura de nós e arestas no formato JSON para criar o mapa.

Responda SOMENTE com JSON válido no formato:
{
  "nodes": [
    { "id": "1", "label": "Tema Central", "isRoot": true },
    { "id": "2", "label": "Subtópico 1" },
    { "id": "3", "label": "Subtópico 2" },
    { "id": "4", "label": "Detalhe 1.1" }
  ],
  "edges": [
    { "source": "1", "target": "2" },
    { "source": "1", "target": "3" },
    { "source": "2", "target": "4" }
  ]
}

Regras:
- Gere entre 6 e 15 nós, organizados hierarquicamente.
- O primeiro nó deve ser a raiz (isRoot: true) com o tema principal.
- Use labels descritivos, concisos e em português.
- Crie uma hierarquia lógica com 2-3 níveis de profundidade.
- NÃO inclua markdown, explicações ou texto fora do JSON.`;

const EXPAND_SYSTEM = `Você é um assistente especializado em mapas mentais do Mind Pro AI.

O usuário enviará o LABEL de um nó existente. Gere sub-nós filhos para expandir esse conceito.

Responda SOMENTE com JSON válido no formato:
{
  "nodes": [
    { "id": "child_1", "label": "Subtópico 1" },
    { "id": "child_2", "label": "Subtópico 2" }
  ],
  "edges": [
    { "source": "PARENT_ID", "target": "child_1" },
    { "source": "PARENT_ID", "target": "child_2" }
  ]
}

Regras:
- Gere entre 3 e 6 sub-nós relevantes ao conceito.
- Use IDs únicos com prefixo "child_".
- No campo "source" das edges, use exatamente o PARENT_ID fornecido.
- Labels descritivos, concisos e em português.
- NÃO inclua markdown, explicações ou texto fora do JSON.`;

const ANALYZE_SYSTEM = `Você é um analista especializado em mapas mentais e diagramas do Mind Pro AI.

O usuário enviará a estrutura atual de um mapa (nós e arestas).
Analise e forneça sugestões de melhoria.

Responda SOMENTE com JSON válido no formato:
{
  "summary": "Resumo breve da análise (1-2 frases)",
  "suggestions": [
    {
      "type": "add",
      "parentId": "id_do_pai",
      "label": "Novo tópico sugerido",
      "reason": "Razão breve"
    },
    {
      "type": "rename",
      "nodeId": "id_do_nó",
      "newLabel": "Texto melhorado",
      "reason": "Razão breve"
    },
    {
      "type": "restructure",
      "description": "Descrição da mudança estrutural sugerida",
      "reason": "Razão breve"
    }
  ]
}

Regras:
- Forneça 3 a 6 sugestões concretas e úteis.
- Identifique lacunas no conteúdo, nós vagos que precisam de detalhamento, e oportunidades de reestruturação.
- Seja conciso e prático. Responda em português.
- NÃO inclua markdown, explicações ou texto fora do JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, topic, diagramType, nodes, edges, parentId } = await req.json();

    if (!mode || !["generate", "analyze", "expand"].includes(mode)) {
      return new Response(
        JSON.stringify({ error: "Mode must be 'generate' or 'analyze'" }),
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

    let systemPrompt: string;
    let userMessage: string;

    if (mode === "generate") {
      systemPrompt = GENERATE_SYSTEM;
      userMessage = `Crie um mapa do tipo "${diagramType || "mindmap"}" sobre o tema: "${topic}"`;
    } else if (mode === "expand") {
      systemPrompt = EXPAND_SYSTEM.replace(/PARENT_ID/g, parentId || "parent");
      userMessage = `Gere sub-nós para expandir o conceito: "${topic}"`;
    } else {
      systemPrompt = ANALYZE_SYSTEM;
      const nodesSummary = (nodes || []).map((n: any) => `- [${n.id}] ${n.label || n.data?.label || "sem label"}`).join("\n");
      const edgesSummary = (edges || []).map((e: any) => `${e.source} -> ${e.target}`).join(", ");
      userMessage = `Analise este mapa:\n\nNós:\n${nodesSummary}\n\nConexões: ${edgesSummary}`;
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Contate o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse AI response as JSON:", jsonStr);
      return new Response(
        JSON.stringify({ error: "A IA retornou um formato inválido. Tente novamente.", raw: jsonStr }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("ai-map-assist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
