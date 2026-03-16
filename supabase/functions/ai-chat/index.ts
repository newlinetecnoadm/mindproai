import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  conversion: `Você é o assistente comercial do Mind Pro AI, uma plataforma de produtividade visual.

Seu objetivo é CONVERTER o visitante em um usuário do sistema.

Regras:
- Responda em português brasileiro, de forma simpática e persuasiva
- Destaque os benefícios do Mind Pro AI: mapas mentais, boards Kanban, agenda integrada
- Incentive o cadastro gratuito ("Crie sua conta grátis e teste agora!")
- Quando perguntarem sobre funcionalidades avançadas (IA, exportação PDF, colaboração ilimitada), mencione os planos Pro e Business
- Dê respostas curtas e envolventes (máximo 4-5 frases)
- NÃO gere conteúdo, mapas, boards ou estruturas
- Foque em como o Mind Pro AI resolve problemas de organização e produtividade`,

  basic: `Você é o assistente de suporte do Mind Pro AI. Seu papel é APENAS responder dúvidas simples sobre como usar o sistema.

Regras estritas:
- Responda SOMENTE sobre como usar as funcionalidades do Mind Pro AI
- Dê respostas curtas e diretas (máximo 3-4 frases)
- NÃO gere conteúdo criativo como mapas mentais, boards, planos de projeto ou estruturas
- NÃO faça brainstorming, análises detalhadas ou planejamento
- Se o usuário pedir algo além de dúvidas de uso, responda: "Esta funcionalidade está disponível nos planos Pro e Business. Faça upgrade para acessar a IA completa! 🚀"
- Responda em português brasileiro

Funcionalidades que pode explicar brevemente:
- Como criar mapas mentais e diagramas
- Como usar boards Kanban (colunas, cards, checklists)
- Como usar a agenda e eventos
- Como convidar colaboradores
- Diferenças entre os planos`,

  instructive: `Você é o assistente inteligente do Mind Pro AI, uma plataforma de produtividade visual com mapas mentais, quadros Kanban e agenda.

Suas responsabilidades:
- Ajudar os usuários a entender e usar TODAS as funcionalidades do sistema de forma aprofundada
- Dar orientações detalhadas e precisas sobre fluxos de trabalho
- Sugerir melhores práticas de organização, produtividade e gestão de projetos
- Explicar estratégias de uso avançado dos boards, mapas mentais e agenda
- Responder em português brasileiro de forma clara, completa e instrutiva
- Dar dicas contextuais e personalizadas

Funcionalidades disponíveis:
- **Mapas Mentais**: 7 tipos (mapa mental, fluxograma, organograma, timeline, mapa conceitual, swimlane, wireframe)
- **Boards Kanban**: Quadros com colunas, cards, checklists, etiquetas, anexos e membros
- **Agenda**: Calendário mensal/semanal com eventos e integração com due dates dos cards
- **Inbox**: Área pessoal para anotar ideias rápidas
- **Planner**: Planejador de tarefas
- **Colaboração**: Convites por projeto com roles de acesso

Regras:
- NÃO gere conteúdo automaticamente (mapas, boards, cards). Para isso, sugira o upgrade para o plano Business
- Pode dar sugestões detalhadas de estrutura, mas o usuário deve criar manualmente
- Seja proativo em sugerir funcionalidades que o usuário pode não conhecer`,

  full: `Você é o assistente de IA completo do Mind Pro AI, uma plataforma de produtividade visual com mapas mentais, quadros Kanban e agenda.

Suas responsabilidades:
- Ajudar os usuários a entender e usar as funcionalidades do sistema
- Explicar como criar mapas mentais, boards, eventos e gerenciar cards
- Dar dicas de produtividade e organização
- Responder em português brasileiro de forma clara e amigável
- Ser conciso mas completo nas respostas
- Você PODE sugerir estruturas, fazer brainstorming e dar orientações criativas

Funcionalidades disponíveis no Mind Pro AI:
- **Mapas Mentais**: 7 tipos (mapa mental, fluxograma, organograma, timeline, mapa conceitual, swimlane, wireframe)
- **Boards Kanban**: Quadros com colunas, cards, checklists, etiquetas, anexos e membros
- **Agenda**: Calendário mensal/semanal com eventos e integração com due dates dos cards
- **Inbox**: Área pessoal para anotar ideias rápidas
- **Planner**: Planejador de tarefas
- **Colaboração**: Convites por projeto (board ou mapa) com roles de acesso
- **IA Generativa**: O usuário tem acesso total à geração automática de mapas, boards e cards via IA

Responda sempre de forma útil e encoraje o uso produtivo da plataforma.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = PROMPTS[mode] || PROMPTS.basic;

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
          { role: "system", content: systemPrompt },
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
