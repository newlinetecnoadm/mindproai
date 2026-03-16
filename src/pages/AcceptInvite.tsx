import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { acceptInvitation } from "@/lib/invitations";

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

    let mounted = true;

    const handleAccept = async () => {
      setStatus("loading");

      try {
        const result = await acceptInvitation({ token });
        if (!mounted) return;

        setStatus("success");
        setMessage(result.message || "Convite aceito com sucesso!");

        const redirectPath = result.redirectPath || "/dashboard";
        setTimeout(() => navigate(redirectPath), 1500);
      } catch (err: any) {
        if (!mounted) return;
        setStatus("error");
        setMessage(err.message || "Erro ao aceitar convite.");
      }
    };

    handleAccept();

    return () => {
      mounted = false;
    };
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
