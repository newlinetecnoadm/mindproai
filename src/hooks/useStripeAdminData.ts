import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StripeAdminData {
  activeSubs: number;
  trialingSubs: number;
  mrrBrl: number;
  mrrCents: number;
  revenueByPrice: Record<string, { amount: number; count: number; nickname: string }>;
  monthlyRevenue: Record<string, number>;   // key: "YYYY-MM", value: cents
  monthlyChurn: Record<string, number>;     // key: "YYYY-MM", value: count
  paidInvoicesLast12Months: number;
  totalPaidLast12MonthsCents: number;
}

export function useStripeAdminData() {
  return useQuery<StripeAdminData>({
    queryKey: ["stripe-admin-data"],
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("stripe-admin-data", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data as StripeAdminData;
    },
  });
}
