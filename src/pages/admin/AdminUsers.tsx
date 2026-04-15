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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Search, Settings2, Shield, CreditCard, KeyRound, Mail, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [managingUser, setManagingUser] = useState<any>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
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

  // Admin actions via edge function
  const adminActionMut = useMutation({
    mutationFn: async ({ action, targetUserId }: { action: string; targetUserId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action, targetUserId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data;
    },
  });

  const handleSendPasswordReset = async (userId: string, email: string) => {
    try {
      await adminActionMut.mutateAsync({ action: "send_password_reset", targetUserId: userId });
      toast.success(`Link de redefinição enviado para ${email}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar redefinição");
    }
  };

  const handleGenerateTempPassword = async (userId: string) => {
    try {
      const result = await adminActionMut.mutateAsync({ action: "set_temporary_password", targetUserId: userId });
      setTempPassword(result.temporaryPassword);
      toast.success("Senha temporária gerada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar senha");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminActionMut.mutateAsync({ action: "delete_user", targetUserId: userId });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setManagingUser(null);
      setDeleteConfirmUser(null);
      toast.success("Usuário excluído com sucesso");
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir usuário");
    }
  };

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
                        onClick={() => { setManagingUser(u); setTempPassword(null); }}
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
        <Dialog open={!!managingUser} onOpenChange={(open) => { if (!open) { setManagingUser(null); setTempPassword(null); } }}>
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

                {/* Account actions */}
                <div className="space-y-2 border-t border-border pt-4">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" />
                    Ações da Conta
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      disabled={adminActionMut.isPending}
                      onClick={() => handleSendPasswordReset(managingUser.user_id, managingUser.email)}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Enviar Redefinição de Senha
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      disabled={adminActionMut.isPending}
                      onClick={() => handleGenerateTempPassword(managingUser.user_id)}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Gerar Senha Temporária
                    </Button>
                  </div>

                  {/* Show temporary password */}
                  {tempPassword && (
                    <div className="mt-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                      <p className="text-xs text-amber-800 dark:text-amber-300 mb-1 font-medium">
                        Senha temporária gerada:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-background px-2 py-1 rounded border border-border flex-1">
                          {tempPassword}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(tempPassword);
                            toast.success("Senha copiada!");
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                        Compartilhe esta senha com o usuário. Ele deverá alterá-la no primeiro acesso.
                      </p>
                    </div>
                  )}

                  {/* Delete user */}
                  <div className="pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      disabled={adminActionMut.isPending}
                      onClick={() => setDeleteConfirmUser(managingUser)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir Usuário
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => { if (!open) setDeleteConfirmUser(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir usuário permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os dados de{" "}
                <strong>{deleteConfirmUser?.full_name || deleteConfirmUser?.email}</strong>{" "}
                serão removidos permanentemente, incluindo diagramas, boards e assinaturas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteConfirmUser && handleDeleteUser(deleteConfirmUser.user_id)}
              >
                Excluir permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
