import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "auth_required">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("auth_required");
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("Token de convite inválido.");
      return;
    }

    const acceptInvitation = async () => {
      try {
        // Find the invitation
        const { data: invitation, error: fetchErr } = await supabase
          .from("invitations")
          .select("*")
          .eq("token", token)
          .eq("status", "pending")
          .single();

        if (fetchErr || !invitation) {
          setStatus("error");
          setMessage("Convite não encontrado ou já foi usado.");
          return;
        }

        // Check expiration
        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
          setStatus("error");
          setMessage("Este convite expirou.");
          return;
        }

        if (invitation.resource_type === "diagram") {
          const { error: collabErr } = await supabase
            .from("diagram_collaborators")
            .upsert({
              diagram_id: invitation.resource_id,
              user_id: user.id,
              role: invitation.role,
            }, { onConflict: "diagram_id,user_id" });

          if (collabErr) throw collabErr;

          await supabase
            .from("invitations")
            .update({ status: "accepted", invited_user_id: user.id })
            .eq("id", invitation.id);

          setStatus("success");
          setMessage("Você agora é colaborador deste diagrama!");
          setTimeout(() => navigate(`/diagramas/${invitation.resource_id}`), 2000);

        } else if (invitation.resource_type === "board") {
          const { error: memberErr } = await supabase
            .from("board_members")
            .upsert({
              board_id: invitation.resource_id,
              user_id: user.id,
              role: invitation.role === "viewer" ? "viewer" : "member",
            }, { onConflict: "board_id,user_id" });

          if (memberErr) throw memberErr;

          await supabase
            .from("invitations")
            .update({ status: "accepted", invited_user_id: user.id })
            .eq("id", invitation.id);

          setStatus("success");
          setMessage("Você agora é membro deste board!");
          setTimeout(() => navigate(`/boards/${invitation.resource_id}`), 2000);

        } else if (invitation.resource_type === "workspace") {
          const { error: wsMemberErr } = await supabase
            .from("workspace_members")
            .upsert({
              workspace_id: invitation.resource_id,
              user_id: user.id,
              role: invitation.role === "viewer" ? "viewer" : "member",
            }, { onConflict: "workspace_id,user_id" });

          if (wsMemberErr) throw wsMemberErr;

          await supabase
            .from("invitations")
            .update({ status: "accepted", invited_user_id: user.id })
            .eq("id", invitation.id);

          setStatus("success");
          setMessage("Você agora é membro deste workspace!");
          setTimeout(() => navigate("/boards"), 2000);

        } else {
          setStatus("error");
          setMessage("Tipo de convite não suportado.");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Erro ao aceitar convite.");
      }
    };

    acceptInvitation();
  }, [token, user, authLoading, navigate]);

  if (status === "auth_required") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold mb-2">Faça login para aceitar o convite</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Você precisa estar logado para aceitar este convite de colaboração.
          </p>
          <Button onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}>
            Fazer login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-sm">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Processando convite...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Convite aceito!</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Erro</h2>
            <p className="text-sm text-muted-foreground mb-4">{message}</p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Ir para o Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
