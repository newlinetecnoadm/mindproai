import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  board_id: string | null;
  card_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AppNotification[];
    },
  });

  // Fetch pending invitations for the current user
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ["pending-invitations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("invited_email", user.email.toLowerCase())
        .eq("status", "pending");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "invitations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pending-invitations", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const unreadCount = notifications.filter((n) => !n.is_read).length + pendingInvitations.length;

  const markAsRead = useMutation({
    mutationFn: async (notifId: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notifId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const acceptInvitation = useMutation({
    mutationFn: async (invitation: any) => {
      if (!user) throw new Error("Não autenticado");

      if (invitation.resource_type === "diagram") {
        const { error } = await supabase
          .from("diagram_collaborators")
          .upsert({
            diagram_id: invitation.resource_id,
            user_id: user.id,
            role: invitation.role,
          }, { onConflict: "diagram_id,user_id" });
        if (error) throw error;
      } else if (invitation.resource_type === "board") {
        const { error } = await supabase
          .from("board_members")
          .upsert({
            board_id: invitation.resource_id,
            user_id: user.id,
            role: invitation.role === "viewer" ? "viewer" : "member",
          }, { onConflict: "board_id,user_id" });
        if (error) throw error;
      } else if (invitation.resource_type === "workspace") {
        const { error } = await supabase
          .from("workspace_members")
          .upsert({
            workspace_id: invitation.resource_id,
            user_id: user.id,
            role: invitation.role === "viewer" ? "viewer" : "member",
          }, { onConflict: "workspace_id,user_id" });
        if (error) throw error;
      }

      await supabase
        .from("invitations")
        .update({ status: "accepted", invited_user_id: user.id })
        .eq("id", invitation.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations", user?.id] });
    },
  });

  const declineInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      await supabase
        .from("invitations")
        .update({ status: "declined" })
        .eq("id", invitationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations", user?.id] });
    },
  });

  const createNotification = useCallback(
    async (params: { userId: string; type: string; title: string; body?: string; boardId?: string; cardId?: string }) => {
      if (params.userId === user?.id) return;
      await supabase.from("notifications").insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        body: params.body || null,
        board_id: params.boardId || null,
        card_id: params.cardId || null,
      });
    },
    [user]
  );

  return {
    notifications,
    pendingInvitations,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    acceptInvitation,
    declineInvitation,
    createNotification,
  };
}
