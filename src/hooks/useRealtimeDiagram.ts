import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Node, Edge } from "@xyflow/react";

export interface PresenceUser {
  userId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  color: string;
  onlineAt: string;
}

const presenceColors = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

function pickColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return presenceColors[Math.abs(hash) % presenceColors.length];
}

interface UseRealtimeDiagramOptions {
  diagramId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  userAvatar?: string;
  onRemoteUpdate?: (nodes: Node[], edges: Edge[], theme: string | null, title?: string) => void;
}

export function useRealtimeDiagram({
  diagramId,
  userId,
  userEmail,
  userName,
  userAvatar,
  onRemoteUpdate,
}: UseRealtimeDiagramOptions) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  useEffect(() => {
    if (!diagramId || !userId) return;

    const channel = supabase.channel(`diagram:${diagramId}`, {
      config: { presence: { key: userId } },
    });

    // Presence: track who's online
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceUser>();
      const users: PresenceUser[] = [];
      for (const [, presences] of Object.entries(state)) {
        if (presences.length > 0) {
          users.push(presences[0] as unknown as PresenceUser);
        }
      }
      setOnlineUsers(users.filter((u) => u.userId !== userId));
    });

    // Postgres changes: sync data when another user saves
    channel.on(
      "postgres_changes" as any,
      {
        event: "UPDATE",
        schema: "public",
        table: "diagrams",
        filter: `id=eq.${diagramId}`,
      },
      (payload: any) => {
        // Only process updates from other users
        const updatedData = payload.new;
        if (!updatedData?.data) return;

        const diagramData = updatedData.data as { nodes?: Node[]; edges?: Edge[]; last_updated_by?: string };
        
        // Reflection Protection: Skip updates that we initiated
        if (diagramData.last_updated_by === userId) {
          return;
        }

        if (diagramData?.nodes && onRemoteUpdateRef.current) {
          onRemoteUpdateRef.current(
            diagramData.nodes,
            diagramData.edges || [],
            updatedData.theme || null,
            updatedData.title || undefined
          );
        }
      }
    );

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId,
          email: userEmail,
          fullName: userName || userEmail.split("@")[0],
          avatarUrl: userAvatar,
          color: pickColor(userId),
          onlineAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [diagramId, userId, userEmail, userName, userAvatar]);

  return { onlineUsers };
}
