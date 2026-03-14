import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o assistente de IA do Mind Pro AI, uma plataforma de produtividade visual com mapas mentais, quadros Kanban e agenda.

Suas responsabilidades:
- Ajudar os usuários a entender e usar as funcionalidades do sistema
- Explicar como criar mapas mentais, boards, eventos e gerenciar cards
- Dar dicas de produtividade e organização
- Responder em português brasileiro de forma clara e amigável
- Ser conciso mas completo nas respostas

Funcionalidades disponíveis no Mind Pro AI:
- **Mapas Mentais**: 7 tipos (mapa mental, fluxograma, organograma, timeline, mapa conceitual, swimlane, wireframe)
- **Boards Kanban**: Quadros com colunas, cards, checklists, etiquetas, anexos e membros
- **Agenda**: Calendário mensal/semanal com eventos e integração com due dates dos cards
- **Inbox**: Área pessoal para anotar ideias rápidas
- **Planner**: Planejador de tarefas
- **Colaboração**: Convites por projeto (board ou mapa) com roles de acesso
- **Planos**: Gratuito, Pro e Business com diferentes limites

Responda sempre de forma útil e encoraje o uso produtivo da plataforma.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for external AI provider settings
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
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
      authHeader = `Bearer ${externalKey}`;
      bodyModel = model || "gemini-2.5-flash";
    } else {
      // Default: Lovable AI Gateway
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
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
