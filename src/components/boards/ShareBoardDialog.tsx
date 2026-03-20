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
import { Share2, Mail, Trash2, Copy, UserPlus, Users } from "lucide-react";

interface ShareBoardDialogProps {
  boardId: string;
  boardTitle: string;
}

const ShareBoardDialog = ({ boardId, boardTitle }: ShareBoardDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("member");
  const [open, setOpen] = useState(false);

  // Fetch board owner + members
  const { data: members } = useQuery({
    queryKey: ["board-members-share", boardId],
    enabled: open,
    queryFn: async () => {
      // Fetch board to get owner
      const { data: board } = await supabase
        .from("boards")
        .select("user_id")
        .eq("id", boardId)
        .single();

      const { data, error } = await supabase
        .from("board_members")
        .select("board_id, user_id, role, joined_at")
        .eq("board_id", boardId);
      if (error) throw error;

      // Collect all user IDs (owner + members), deduplicated
      const memberUserIds = data.map((m) => m.user_id);
      const allUserIds = board
        ? [...new Set([board.user_id, ...memberUserIds])]
        : memberUserIds;

      if (allUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, email, full_name, avatar_url")
        .in("user_id", allUserIds);

      // Build result: owner first (if not already a member row), then members
      const result: Array<{
        board_id: string;
        user_id: string;
        role: string;
        joined_at: string | null;
        isOwner?: boolean;
        profile?: { user_id: string; email: string | null; full_name: string | null; avatar_url: string | null };
      }> = [];

      if (board && !memberUserIds.includes(board.user_id)) {
        result.push({
          board_id: boardId,
          user_id: board.user_id,
          role: "owner",
          joined_at: null,
          isOwner: true,
          profile: profiles?.find((p) => p.user_id === board.user_id),
        });
      }

      for (const m of data) {
        result.push({
          ...m,
          isOwner: board?.user_id === m.user_id,
          profile: profiles?.find((p) => p.user_id === m.user_id),
        });
      }

      return result;
    },
  });

  // Fetch pending invitations
  const { data: invitations } = useQuery({
    queryKey: ["board-invitations", boardId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("resource_id", boardId)
        .eq("resource_type", "board")
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

      const normalizedEmail = email.trim().toLowerCase();

      const { data: existingInvite } = await supabase
        .from("invitations")
        .select("id")
        .eq("resource_id", boardId)
        .eq("resource_type", "board")
        .eq("invited_email", normalizedEmail)
        .eq("status", "pending");

      if (existingInvite && existingInvite.length > 0) {
        throw new Error("Já existe um convite pendente para este email");
      }

      const { data: invitedProfiles, error: invitedProfileError } = await supabase
        .from("user_profiles")
        .select("user_id")
        .ilike("email", normalizedEmail)
        .limit(1);

      if (invitedProfileError) throw invitedProfileError;
      const invitedUserId = invitedProfiles?.[0]?.user_id ?? null;

      const { error } = await supabase.from("invitations").insert({
        invited_email: normalizedEmail,
        invited_user_id: invitedUserId,
        invited_by: user.id,
        resource_id: boardId,
        resource_type: "board",
        role,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      const { data: inv } = await supabase
        .from("invitations")
        .select("token")
        .eq("resource_id", boardId)
        .eq("resource_type", "board")
        .eq("invited_email", email.trim().toLowerCase())
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const appOrigin = window.location.hostname.includes("lovable.app") || window.location.hostname.includes("lovableproject.com")
        ? "https://mindproai.com.br"
        : window.location.origin;
      const inviteLink = inv
        ? `${appOrigin}/convite?token=${inv.token}`
        : null;

      if (inviteLink) {
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
              resourceTitle: boardTitle,
              resourceType: "board",
              role,
              inviteLink,
            },
          })
          .catch((err) => console.error("Email send error:", err));

        navigator.clipboard.writeText(inviteLink);
        toast.success(
          `Convite enviado por email para ${email}. Link copiado!`
        );
      } else {
        toast.success(`Convite criado para ${email}`);
      }
      setEmail("");
      queryClient.invalidateQueries({
        queryKey: ["board-invitations", boardId],
      });
    },
    onError: (err: any) =>
      toast.error(err.message || "Erro ao enviar convite"),
  });

  // Remove member
  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("board_members")
        .delete()
        .eq("board_id", boardId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro removido");
      queryClient.invalidateQueries({
        queryKey: ["board-members-share", boardId],
      });
      queryClient.invalidateQueries({
        queryKey: ["board-members", boardId],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["board-invitations", boardId],
      });
    },
  });

  const roleLabels: Record<string, string> = {
    owner: "Proprietário",
    admin: "Admin",
    member: "Membro",
    viewer: "Visualizar",
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
            Compartilhar "{boardTitle}"
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
              <SelectItem value="member">Membro</SelectItem>
              <SelectItem value="viewer">Visualizar</SelectItem>
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

        {/* Members list */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {members?.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50"
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {m.profile?.avatar_url ? (
                  <img
                    src={m.profile.avatar_url}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (
                    m.profile?.full_name ||
                    m.profile?.email ||
                    "?"
                  )
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {m.profile?.full_name || m.profile?.email}
                </p>
                {m.profile?.full_name && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {m.profile.email}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {roleLabels[m.role] || m.role}
              </Badge>
              {m.user_id !== user?.id && !(m as any).isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeMutation.mutate(m.user_id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}

          {/* Pending invitations */}
          {invitations?.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50"
            >
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {inv.invited_email}
                </p>
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

          {!members?.length && !invitations?.length && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum membro ainda. Convide alguém acima.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareBoardDialog;
