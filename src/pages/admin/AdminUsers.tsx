import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Search, Settings2, Shield, CreditCard } from "lucide-react";
import { toast } from "sonner";

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [managingUser, setManagingUser] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_plans").select("*").order("price_brl");
      if (error) throw error;
      return data;
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

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

  // Change user plan manually
  const changePlanMut = useMutation({
    mutationFn: async ({ userId, planId }: { userId: string; planId: string }) => {
      // Check if user has a subscription
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (existing?.length) {
        const { error } = await supabase
          .from("subscriptions")
          .update({ plan_id: planId, status: "active", canceled_at: null })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscriptions")
          .insert({ user_id: userId, plan_id: planId, status: "active" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Plano alterado com sucesso");
    },
    onError: () => toast.error("Erro ao alterar plano"),
  });

  // Change subscription status
  const changeStatusMut = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const update: any = { status };
      if (status === "canceled") update.canceled_at = new Date().toISOString();
      if (status === "active") update.canceled_at = null;
      const { error } = await supabase.from("subscriptions").update(update).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  // Toggle role
  const toggleRoleMut = useMutation({
    mutationFn: async ({ userId, role, hasRole }: { userId: string; role: string; hasRole: boolean }) => {
      if (hasRole) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role atualizada");
    },
    onError: () => toast.error("Erro ao atualizar role"),
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      trialing: "bg-amber-500/10 text-amber-500 border-amber-500/20",
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ações</th>
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
                        {u.roles.length > 0 ? u.roles.map((r: string) => (
                          <Badge key={r} variant="outline" className="text-xs">
                            {r}
                          </Badge>
                        )) : <span className="text-muted-foreground text-xs">user</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: ptBR }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setManagingUser(u)}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        Gerenciar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* User Management Dialog */}
        <Dialog open={!!managingUser} onOpenChange={(open) => { if (!open) setManagingUser(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Gerenciar Usuário
              </DialogTitle>
            </DialogHeader>

            {managingUser && (
              <div className="space-y-6 pt-2">
                {/* User info */}
                <div className="flex items-center gap-3">
                  {managingUser.avatar_url ? (
                    <img src={managingUser.avatar_url} className="w-10 h-10 rounded-full" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {(managingUser.full_name || managingUser.email || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{managingUser.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{managingUser.email}</p>
                  </div>
                </div>

                {/* Plan section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    Plano de Assinatura
                  </label>
                  <Select
                    value={managingUser.subscription?.plan_id || ""}
                    onValueChange={(planId) => {
                      changePlanMut.mutate({ userId: managingUser.user_id, planId });
                      setManagingUser({
                        ...managingUser,
                        subscription: {
                          ...managingUser.subscription,
                          plan_id: planId,
                          subscription_plans: plans.find((p: any) => p.id === planId),
                        },
                      });
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan: any) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.display_name} — R$ {Number(plan.price_brl).toFixed(2).replace(".", ",")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status da Assinatura</label>
                  <Select
                    value={managingUser.subscription?.status || "none"}
                    onValueChange={(status) => {
                      if (status === "none") return;
                      changeStatusMut.mutate({ userId: managingUser.user_id, status });
                      setManagingUser({
                        ...managingUser,
                        subscription: { ...managingUser.subscription, status },
                      });
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="trialing">Em teste</SelectItem>
                      <SelectItem value="canceled">Cancelado</SelectItem>
                      <SelectItem value="none" disabled>Sem assinatura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Roles section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    Permissões (Roles)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(["admin", "moderator", "user"] as const).map((role) => {
                      const hasRole = managingUser.roles.includes(role);
                      return (
                        <Button
                          key={role}
                          variant={hasRole ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            toggleRoleMut.mutate({
                              userId: managingUser.user_id,
                              role,
                              hasRole,
                            });
                            setManagingUser({
                              ...managingUser,
                              roles: hasRole
                                ? managingUser.roles.filter((r: string) => r !== role)
                                : [...managingUser.roles, role],
                            });
                          }}
                        >
                          {role}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Clique para adicionar/remover roles. Admin tem acesso irrestrito.
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
