import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, Trash2, UserPlus, Users } from "lucide-react";

interface ShareWorkspaceDialogProps {
  workspaceId: string;
  workspaceTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ShareWorkspaceDialog = ({ workspaceId, workspaceTitle, open, onOpenChange }: ShareWorkspaceDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const { data: members } = useQuery({
    queryKey: ["ws-members", workspaceId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, user_id, role, joined_at")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      if (!data.length) return [];
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, email, full_name, avatar_url")
        .in("user_id", userIds);
      return data.map((m) => ({
        ...m,
        profile: profiles?.find((p) => p.user_id === m.user_id),
      }));
    },
  });

  const { data: invitations } = useQuery({
    queryKey: ["ws-invitations", workspaceId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("resource_id", workspaceId)
        .eq("resource_type", "workspace")
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
  });

  const inviteMut = useMutation({
    mutationFn: async () => {
      if (!user || !email.trim()) return;
      const { error } = await supabase.from("invitations").insert({
        invited_email: email.trim().toLowerCase(),
        invited_by: user.id,
        resource_id: workspaceId,
        resource_type: "workspace",
        role,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      const { data: inv } = await supabase
        .from("invitations")
        .select("token")
        .eq("resource_id", workspaceId)
        .eq("resource_type", "workspace")
        .eq("invited_email", email.trim().toLowerCase())
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (inv) {
        const inviteLink = `${window.location.origin}/convite?token=${inv.token}`;
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("full_name")
          .eq("user_id", user!.id)
          .single();

        supabase.functions
          .invoke("send-email", {
            body: {
              to: email.trim().toLowerCase(),
              template: "invite",
              inviterName: profile?.full_name || user!.email,
              resourceTitle: workspaceTitle,
              resourceType: "workspace",
              role,
              inviteLink,
            },
          })
          .catch(console.error);

        navigator.clipboard.writeText(inviteLink);
        toast.success(`Convite enviado para ${email}. Link copiado!`);
      } else {
        toast.success(`Convite criado para ${email}`);
      }
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["ws-invitations", workspaceId] });
    },
    onError: () => toast.error("Erro ao enviar convite"),
  });

  const removeMut = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro removido");
      queryClient.invalidateQueries({ queryKey: ["ws-members", workspaceId] });
    },
  });

  const cancelInviteMut = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.from("invitations").update({ status: "canceled" }).eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite cancelado");
      queryClient.invalidateQueries({ queryKey: ["ws-invitations", workspaceId] });
    },
  });

  const roleLabels: Record<string, string> = { admin: "Admin", member: "Membro", viewer: "Visualizar" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" /> Compartilhar "{workspaceTitle}"
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Membros do workspace terão acesso a todos os boards dentro dele.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 flex-1"
            type="email"
            onKeyDown={(e) => e.key === "Enter" && inviteMut.mutate()}
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Membro</SelectItem>
              <SelectItem value="viewer">Visualizar</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-9" onClick={() => inviteMut.mutate()} disabled={inviteMut.isPending || !email.trim()}>
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {members?.map((m: any) => (
            <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {m.profile?.avatar_url ? (
                  <img src={m.profile.avatar_url} className="w-full h-full rounded-full object-cover" />
                ) : (
                  (m.profile?.full_name || m.profile?.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{m.profile?.full_name || m.profile?.email}</p>
                {m.profile?.full_name && <p className="text-[10px] text-muted-foreground truncate">{m.profile.email}</p>}
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">{roleLabels[m.role] || m.role}</Badge>
              {m.user_id !== user?.id && (
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeMut.mutate(m.user_id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}

          {invitations?.map((inv: any) => (
            <div key={inv.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{inv.invited_email}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">Pendente</Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => cancelInviteMut.mutate(inv.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}

          {!members?.length && !invitations?.length && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum membro ainda.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareWorkspaceDialog;
