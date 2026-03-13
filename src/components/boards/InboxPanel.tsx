import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Inbox, X, SlidersHorizontal, MoreHorizontal, AlertCircle, Clock, Calendar, Kanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface InboxPanelProps {
  onClose: () => void;
}

const InboxPanel = ({ onClose }: InboxPanelProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quickAdd, setQuickAdd] = useState("");

  const { data: dueCards = [] } = useQuery({
    queryKey: ["inbox-due-cards", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_cards")
        .select("id, title, due_date, is_complete, board_id")
        .not("due_date", "is", null)
        .eq("is_complete", false)
        .order("due_date");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["inbox-invitations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("user_id", user!.id)
        .single();
      if (!profile?.email) return [];
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("invited_email", profile.email)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: todayEvents = [] } = useQuery({
    queryKey: ["inbox-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user!.id)
        .gte("start_at", startOfDay)
        .lt("start_at", endOfDay)
        .order("start_at");
      if (error) throw error;
      return data || [];
    },
  });

  const now = new Date();
  const items: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
    link?: string;
    icon: typeof Inbox;
    color: string;
  }> = [];

  dueCards.forEach((card) => {
    const dueDate = new Date(card.due_date!);
    const isOverdue = dueDate < now;
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isDueSoon = !isOverdue && diffHours <= 48;
    if (isOverdue || isDueSoon) {
      items.push({
        id: `card-${card.id}`,
        type: isOverdue ? "overdue" : "due_soon",
        title: card.title,
        description: isOverdue
          ? `Venceu ${formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true })}`
          : `Vence ${formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true })}`,
        date: card.due_date!,
        link: `/boards/${card.board_id}`,
        icon: isOverdue ? AlertCircle : Clock,
        color: isOverdue ? "text-destructive" : "text-warning",
      });
    }
  });

  invitations.forEach((inv) => {
    items.push({
      id: `inv-${inv.id}`,
      type: "invitation",
      title: `Convite para ${inv.resource_type === "board" ? "Board" : "Diagrama"}`,
      description: `Você foi convidado como ${inv.role}`,
      date: inv.created_at!,
      link: `/convite?token=${inv.token}`,
      icon: Kanban,
      color: "text-primary",
    });
  });

  todayEvents.forEach((ev) => {
    items.push({
      id: `event-${ev.id}`,
      type: "event_today",
      title: ev.title,
      description: `Hoje às ${new Date(ev.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      date: ev.start_at,
      link: "/agenda",
      icon: Calendar,
      color: "text-success",
    });
  });

  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full border-r border-border bg-card flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Inbox</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick add */}
      <div className="p-3 border-b border-border">
        <Input
          placeholder="Add a card"
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          className="h-8 text-sm bg-muted/50 border-border"
        />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm font-medium mb-1">Consolidate your to-dos</p>
            <p className="text-xs text-muted-foreground">
              Email it, say it, forward it — however it comes, get it into MindPro fast.
            </p>
          </div>
        ) : (
          items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => item.link && navigate(item.link)}
              className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className={`mt-0.5 ${item.color}`}>
                <item.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{item.description}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          🔒 Inbox is only visible to you
        </p>
      </div>
    </motion.div>
  );
};

export default InboxPanel;
