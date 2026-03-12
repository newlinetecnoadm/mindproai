import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PlanInfo {
  planName: string;
  displayName: string;
  status: string;
  trialEndsAt: string | null;
  features: Record<string, unknown>;
  priceBrl: number;
}

export function usePlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["plan", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PlanInfo | null> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, subscription_plans(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const plan = data.subscription_plans as any;
      return {
        planName: plan?.name ?? "free",
        displayName: plan?.display_name ?? "Gratuito",
        status: data.status,
        trialEndsAt: data.trial_ends_at,
        features: (plan?.features ?? {}) as Record<string, unknown>,
        priceBrl: plan?.price_brl ?? 0,
      };
    },
  });
}
