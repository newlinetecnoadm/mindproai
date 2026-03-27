import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Check, X, Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export const InvitationPopup = () => {
  const { pendingInvitations, acceptInvitation, declineInvitation } = useNotifications();
  const [open, setOpen] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Show only once per "session" (or after a login) when pending invitations exist
    if (pendingInvitations.length > 0 && !hasShownThisSession) {
      setOpen(true);
      setHasShownThisSession(true);
    }
  }, [pendingInvitations.length, hasShownThisSession]);

  if (pendingInvitations.length === 0) return null;

  const currentInv = pendingInvitations[0]; // Show the most recent one

  const handleAccept = () => {
    acceptInvitation.mutate(currentInv, {
      onSuccess: () => {
        toast.success("Convite aceito com sucesso!");
        if (currentInv.resource_type === "board") {
          navigate(`/boards/${currentInv.resource_id}`);
        } else if (currentInv.resource_type === "workspace") {
          navigate("/boards");
        } else {
          navigate(`/diagramas/${currentInv.resource_id}`);
        }
        setOpen(false);
      },
      onError: (err: any) => toast.error(err.message || "Erro ao aceitar convite"),
    });
  };

  const handleDecline = () => {
    declineInvitation.mutate(currentInv.id, {
      onSuccess: () => {
        toast.info("Convite recusado");
        setOpen(false);
      },
      onError: (err: any) => toast.error(err.message || "Erro ao recusar convite"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="bg-primary/10 p-8 flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                <Mail className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center border-2 border-card animate-bounce">
                <span className="text-[10px] font-bold text-white">{pendingInvitations.length}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">
                Você recebeu um convite!
              </DialogTitle>
              <DialogDescription className="text-center pt-2">
                Você foi convidado para participar de um{" "}
                <span className="font-bold text-foreground">
                  {currentInv.resource_type === "board" ? "board" : currentInv.resource_type === "workspace" ? "workspace" : "diagrama"}
                </span>.
                Deseja aceitar agora?
              </DialogDescription>
            </DialogHeader>

            <div className="mt-8 flex flex-col gap-3">
              <Button 
                onClick={handleAccept} 
                className="w-full h-12 rounded-xl text-base font-bold gap-2 shadow-lg shadow-primary/20"
                disabled={acceptInvitation.isPending}
              >
                <Check className="w-5 h-5" />
                Aceitar Convite
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleDecline} 
                  className="flex-1 h-11 rounded-xl text-sm"
                  disabled={declineInvitation.isPending}
                >
                  Recusar
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setOpen(false)} 
                  className="flex-1 h-11 rounded-xl text-sm"
                >
                  Depois
                </Button>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-muted/30 border-t border-border/50 flex items-center justify-center gap-2">
            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold text-center">
              Você pode ver seus convites no sino de notificações
            </span>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
