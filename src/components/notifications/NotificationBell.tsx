import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, MessageSquare, AtSign, ArrowRightLeft, UserPlus, Clock, Mail, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  comment: { icon: MessageSquare, color: "text-blue-500" },
  mention: { icon: AtSign, color: "text-purple-500" },
  card_moved: { icon: ArrowRightLeft, color: "text-amber-500" },
  member_added: { icon: UserPlus, color: "text-emerald-500" },
  due_soon: { icon: Clock, color: "text-orange-500" },
};

const NotificationBell = () => {
  const {
    notifications,
    pendingInvitations,
    unreadCount,
    markAsRead,
    markAllAsRead,
    acceptInvitation,
    declineInvitation,
  } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleClick = (notif: AppNotification) => {
    if (!notif.is_read) markAsRead.mutate(notif.id);
    if (notif.board_id) {
      navigate(`/boards/${notif.board_id}`);
      setOpen(false);
    }
  };

  const handleAccept = (invitation: any) => {
    acceptInvitation.mutate(invitation, {
      onSuccess: () => {
        toast.success(
          invitation.resource_type === "board"
            ? "Convite de board aceito!"
            : "Convite de diagrama aceito!"
        );
        if (invitation.resource_type === "board") {
          navigate(`/boards/${invitation.resource_id}`);
        } else {
          navigate(`/diagramas/${invitation.resource_id}`);
        }
        setOpen(false);
      },
      onError: (err: any) => toast.error(err.message || "Erro ao aceitar convite"),
    });
  };

  const handleDecline = (invitationId: string) => {
    declineInvitation.mutate(invitationId, {
      onSuccess: () => toast.info("Convite recusado"),
      onError: (err: any) => toast.error(err.message || "Erro ao recusar convite"),
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="w-3 h-3" />
              Marcar lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {/* Pending invitations */}
          {pendingInvitations.length > 0 && (
            <div className="border-b border-border">
              <div className="px-4 py-2 bg-primary/5">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Convites pendentes</p>
              </div>
              {pendingInvitations.map((inv: any) => (
                <div key={inv.id} className="px-4 py-3 border-b border-border/50 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-primary">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-relaxed">
                        Convite para {inv.resource_type === "board" ? "board" : inv.resource_type === "workspace" ? "workspace" : "diagrama"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Permissão: {inv.role === "editor" ? "Editar" : inv.role === "member" ? "Membro" : "Visualizar"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-6 text-[10px] px-3 gap-1"
                          onClick={() => handleAccept(inv)}
                          disabled={acceptInvitation.isPending}
                        >
                          <Check className="w-3 h-3" />
                          Aceitar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-3 gap-1"
                          onClick={() => handleDecline(inv.id)}
                          disabled={declineInvitation.isPending}
                        >
                          <X className="w-3 h-3" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Regular notifications */}
          {notifications.length === 0 && pendingInvitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => {
                const config = typeConfig[notif.type] || { icon: Bell, color: "text-muted-foreground" };
                const Icon = config.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      !notif.is_read && "bg-primary/5"
                    )}
                  >
                    <div className={cn("mt-0.5 shrink-0", config.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-relaxed", !notif.is_read && "font-medium")}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
