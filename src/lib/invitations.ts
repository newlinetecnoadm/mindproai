import { supabase } from "@/integrations/supabase/client";

interface AcceptInvitationParams {
  invitationId?: string;
  token?: string;
}

export interface AcceptedInvitationResult {
  invitationId: string;
  resourceType: string;
  resourceId: string;
  redirectPath: string;
  message: string;
}

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() ?? "";

export async function fetchPendingInvitations(userId: string, userEmail?: string | null) {
  const normalizedEmail = normalizeEmail(userEmail);

  const [byUserResult, byEmailResult] = await Promise.all([
    supabase
      .from("invitations")
      .select("*")
      .eq("status", "pending")
      .eq("invited_user_id", userId)
      .order("created_at", { ascending: false }),
    normalizedEmail
      ? supabase
          .from("invitations")
          .select("*")
          .eq("status", "pending")
          .ilike("invited_email", normalizedEmail)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (byUserResult.error) throw byUserResult.error;
  if (byEmailResult.error) throw byEmailResult.error;

  const merged = new Map<string, any>();
  [...(byUserResult.data || []), ...(byEmailResult.data || [])].forEach((invitation) => {
    merged.set(invitation.id, invitation);
  });

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
}

export async function acceptInvitation(params: AcceptInvitationParams): Promise<AcceptedInvitationResult> {
  if (!params.invitationId && !params.token) {
    throw new Error("Convite inválido.");
  }

  const { data, error } = await supabase.functions.invoke("accept-invitation", {
    body: {
      invitationId: params.invitationId,
      token: params.token,
    },
  });

  if (error) {
    throw new Error(error.message || "Erro ao aceitar convite.");
  }

  if (!data || data.error) {
    throw new Error(data?.error || "Erro ao aceitar convite.");
  }

  return data as AcceptedInvitationResult;
}
