import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin" as any, {
        _user_id: user!.id,
      });
      if (error) return false;
      return !!data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
