import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

const AdminUsers = () => {
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch subscriptions for each user
      const userIds = profiles.map((p: any) => p.user_id);
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*, subscription_plans(name, display_name)")
        .in("user_id", userIds);

      const { data: roles } = await supabase
        .from("user_roles" as any)
        .select("user_id, role");

      return profiles.map((p: any) => ({
        ...p,
        subscription: subs?.find((s: any) => s.user_id === p.user_id),
        roles: (roles as any[])?.filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role) || [],
      }));
    },
  });

  const filtered = users?.filter((u: any) =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-success/10 text-success border-success/20",
      trialing: "bg-warning/10 text-warning border-warning/20",
      canceled: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return map[status] || "bg-muted text-muted-foreground border-border";
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Usuários</h1>
            <p className="text-muted-foreground">{users?.length ?? 0} usuários cadastrados</p>
          </div>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou e-mail..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plano</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roles</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((u: any) => (
                  <tr key={u.user_id} className="border-b border-border last:border-none hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} className="w-8 h-8 rounded-full" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {(u.full_name || u.email || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{u.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.subscription?.subscription_plans?.display_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {u.subscription ? (
                        <Badge variant="outline" className={statusBadge(u.subscription.status)}>
                          {u.subscription.status}
                        </Badge>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {u.roles.map((r: string) => (
                          <Badge key={r} variant="outline" className="text-xs">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: ptBR }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
