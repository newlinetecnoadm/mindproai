import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useCardActivity() {
  const { user } = useAuth();

  const logActivity = useCallback(
    async (cardId: string, action: string, details?: Record<string, any>) => {
      if (!user) return;
      try {
        await supabase.from("card_activities").insert({
          card_id: cardId,
          user_id: user.id,
          action,
          details: details || {},
        });
      } catch {
        // silent fail — activity logging should never block UX
      }
    },
    [user]
  );

  return { logActivity };
}
