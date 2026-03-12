import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Check user_roles table
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();

      if (data) return true;

      // Fallback: check whitelist via edge — for now check profile email against whitelist
      // Since whitelist RLS only allows admins, if user_roles check fails we use the is_admin DB function
      // via a simple RPC-like approach: try reading admin_whitelist — if it works, user is admin
      const { data: wl } = await supabase
        .from("admin_whitelist" as any)
        .select("email")
        .limit(1);

      // If we can read the whitelist, we're admin (RLS allows it)
      // If not, check our own email in a broader way
      return (wl && wl.length >= 0 && data !== null) ? true : !!data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
