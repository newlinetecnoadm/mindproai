import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type InvitationRow = {
  id: string;
  resource_id: string;
  resource_type: string;
  role: string;
  invited_user_id: string | null;
  invited_email: string;
  expires_at: string | null;
};

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const getRedirectPath = (resourceType: string, resourceId: string) => {
  if (resourceType === "board") return `/boards/${resourceId}`;
  if (resourceType === "diagram") return `/diagramas/${resourceId}`;
  if (resourceType === "workspace") return "/boards";
  return "/dashboard";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invitationId, token: invitationToken } = await req.json().catch(() => ({}));

    if (!invitationId && !invitationToken) {
      return new Response(JSON.stringify({ error: "Convite inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let invitationQuery = adminClient
      .from("invitations")
      .select("id, resource_id, resource_type, role, invited_user_id, invited_email, expires_at")
      .eq("status", "pending")
      .limit(1);

    invitationQuery = invitationId
      ? invitationQuery.eq("id", invitationId)
      : invitationQuery.eq("token", invitationToken);

    const { data: invitation, error: invitationError } =
      await invitationQuery.maybeSingle<InvitationRow>();

    if (invitationError) {
      return new Response(JSON.stringify({ error: invitationError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invitation) {
      return new Response(JSON.stringify({ error: "Convite não encontrado ou já foi usado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invitedEmail = normalizeEmail(invitation.invited_email);
    const userEmail = normalizeEmail(user.email);
    const isRecipientById = invitation.invited_user_id === user.id;
    const isRecipientByEmail = invitedEmail.length > 0 && invitedEmail === userEmail;

    if (!isRecipientById && !isRecipientByEmail) {
      return new Response(JSON.stringify({ error: "Este convite não pertence a esta conta." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Este convite expirou." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invitation.resource_type === "board") {
      const { error } = await adminClient.from("board_members").upsert(
        {
          board_id: invitation.resource_id,
          user_id: user.id,
          role: invitation.role === "viewer" ? "viewer" : "member",
        },
        { onConflict: "board_id,user_id" }
      );
      if (error) throw error;
    } else if (invitation.resource_type === "workspace") {
      const { error } = await adminClient.from("workspace_members").upsert(
        {
          workspace_id: invitation.resource_id,
          user_id: user.id,
          role: invitation.role === "viewer" ? "viewer" : "member",
        },
        { onConflict: "workspace_id,user_id" }
      );
      if (error) throw error;
    } else if (invitation.resource_type === "diagram") {
      const { error } = await adminClient.from("diagram_collaborators").upsert(
        {
          diagram_id: invitation.resource_id,
          user_id: user.id,
          role: invitation.role === "editor" ? "editor" : "viewer",
        },
        { onConflict: "diagram_id,user_id" }
      );
      if (error) throw error;
    } else {
      return new Response(JSON.stringify({ error: "Tipo de convite não suportado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await adminClient
      .from("invitations")
      .update({ status: "accepted", invited_user_id: user.id })
      .eq("id", invitation.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        invitationId: invitation.id,
        resourceType: invitation.resource_type,
        resourceId: invitation.resource_id,
        redirectPath: getRedirectPath(invitation.resource_type, invitation.resource_id),
        message: "Convite aceito com sucesso!",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("accept-invitation error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno ao aceitar convite." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
