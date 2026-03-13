import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Share2, Mail, Trash2, Copy, Globe, Lock, UserPlus, Users } from "lucide-react";

interface ShareDiagramDialogProps {
  diagramId: string;
  diagramTitle: string;
  isPublic?: boolean;
  publicToken?: string | null;
  onPublicToggle?: (isPublic: boolean) => void;
}

const ShareDiagramDialog = ({
  diagramId,
  diagramTitle,
  isPublic,
  publicToken,
}: ShareDiagramDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("viewer");
  const [open, setOpen] = useState(false);

  // Fetch collaborators
  const { data: collaborators } = useQuery({
    queryKey: ["diagram-collaborators", diagramId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagram_collaborators")
        .select("id, user_id, role, created_at")
        .eq("diagram_id", diagramId);
      if (error) throw error;

      // Fetch profiles for collaborators
      if (data.length === 0) return [];
      const userIds = data.map((c) => c.user_id);
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, email, full_name, avatar_url")
        .in("user_id", userIds);

      return data.map((c) => ({
        ...c,
        profile: profiles?.find((p) => p.user_id === c.user_id),
      }));
    },
  });

  // Fetch pending invitations
  const { data: invitations } = useQuery({
    queryKey: ["diagram-invitations", diagramId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("resource_id", diagramId)
        .eq("resource_type", "diagram")
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
  });

  // Send invitation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      if (!email.trim()) throw new Error("Email obrigatório");

      // Check if already a collaborator
      const { data: existing } = await supabase
        .from("diagram_collaborators")
        .select("id")
        .eq("diagram_id", diagramId)
        .eq("user_id", user.id);

      // Check if invitation already exists
      const { data: existingInvite } = await supabase
        .from("invitations")
        .select("id")
        .eq("resource_id", diagramId)
        .eq("resource_type", "diagram")
        .eq("invited_email", email.trim().toLowerCase())
        .eq("status", "pending");

      if (existingInvite && existingInvite.length > 0) {
        throw new Error("Já existe um convite pendente para este email");
      }

      const { error } = await supabase.from("invitations").insert({
        invited_email: email.trim().toLowerCase(),
        invited_by: user.id,
        resource_id: diagramId,
        resource_type: "diagram",
        role,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      // Get the created invitation to provide the link
      const { data: inv } = await supabase
        .from("invitations")
        .select("token")
        .eq("resource_id", diagramId)
        .eq("resource_type", "diagram")
        .eq("invited_email", email.trim().toLowerCase())
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const inviteLink = inv ? `${window.location.origin}/convite?token=${inv.token}` : null;

      // Send email via edge function
      if (inviteLink) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("full_name")
          .eq("user_id", user!.id)
          .single();

        supabase.functions.invoke("send-email", {
          body: {
            to: email.trim().toLowerCase(),
            template: "invite",
            inviterName: profile?.full_name || user!.email,
            resourceTitle: diagramTitle,
            resourceType: "diagram",
            role,
            inviteLink,
          },
        }).catch((err) => console.error("Email send error:", err));

        navigator.clipboard.writeText(inviteLink);
        toast.success(`Convite enviado por email para ${email}. Link copiado!`);
      } else {
        toast.success(`Convite criado para ${email}`);
      }
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["diagram-invitations", diagramId] });
    },
    onError: (err: any) => toast.error(err.message || "Erro ao enviar convite"),
  });

  // Remove collaborator
  const removeMutation = useMutation({
    mutationFn: async (collabId: string) => {
      const { error } = await supabase
        .from("diagram_collaborators")
        .delete()
        .eq("id", collabId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Colaborador removido");
      queryClient.invalidateQueries({ queryKey: ["diagram-collaborators", diagramId] });
    },
  });

  // Cancel invitation
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("invitations")
        .update({ status: "canceled" })
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite cancelado");
      queryClient.invalidateQueries({ queryKey: ["diagram-invitations", diagramId] });
    },
  });

  // Toggle public
  const togglePublicMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("diagrams")
        .update({ is_public: !isPublic })
        .eq("id", diagramId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagram-detail", diagramId] });
      toast.success(isPublic ? "Diagrama agora é privado" : "Diagrama agora é público");
    },
  });

  const copyPublicLink = () => {
    if (publicToken) {
      navigator.clipboard.writeText(`${window.location.origin}/diagramas/publico/${publicToken}`);
      toast.success("Link copiado!");
    }
  };

  const roleLabels: Record<string, string> = {
    viewer: "Visualizar",
    editor: "Editar",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Share2 className="w-4 h-4" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Compartilhar "{diagramTitle}"
          </DialogTitle>
        </DialogHeader>

        {/* Invite form */}
        <div className="flex gap-2">
          <Input
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 flex-1"
            type="email"
            onKeyDown={(e) => e.key === "Enter" && inviteMutation.mutate()}
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Visualizar</SelectItem>
              <SelectItem value="editor">Editar</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-9"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending || !email.trim()}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>

        {/* Collaborators list */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {collaborators?.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
              <div
                className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0"
              >
                {c.profile?.avatar_url ? (
                  <img src={c.profile.avatar_url} className="w-full h-full rounded-full object-cover" />
                ) : (
                  (c.profile?.full_name || c.profile?.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{c.profile?.full_name || c.profile?.email}</p>
                {c.profile?.full_name && (
                  <p className="text-[10px] text-muted-foreground truncate">{c.profile.email}</p>
                )}
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {roleLabels[c.role] || c.role}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => removeMutation.mutate(c.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}

          {/* Pending invitations */}
          {invitations?.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{inv.invited_email}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                Pendente
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => cancelInviteMutation.mutate(inv.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}

          {(!collaborators?.length && !invitations?.length) && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum colaborador ainda. Convide alguém acima.
            </p>
          )}
        </div>

        {/* Public link section */}
        <div className="border-t border-border pt-3 mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe className="w-4 h-4 text-emerald-500" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs font-medium">
                {isPublic ? "Público — qualquer pessoa com o link" : "Privado — apenas convidados"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => togglePublicMutation.mutate()}
            >
              {isPublic ? "Tornar privado" : "Tornar público"}
            </Button>
          </div>
          {isPublic && publicToken && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] mt-2 gap-1 w-full"
              onClick={copyPublicLink}
            >
              <Copy className="w-3 h-3" />
              Copiar link público
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDiagramDialog;
