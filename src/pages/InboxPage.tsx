import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition } from "@/components/ui/transitions";
import { Inbox, Calendar, Kanban, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface InboxItem {
  id: string;
  type: "due_soon" | "overdue" | "invitation" | "event_today";
  title: string;
  description: string;
  date: string;
  link?: string;
  icon: typeof Inbox;
  color: string;
}

const InboxPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Cards with due dates coming soon or overdue
  const { data: dueCards = [] } = useQuery({
    queryKey: ["inbox-due-cards", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_cards")
        .select("id, title, due_date, is_complete, board_id, column_id")
        .not("due_date", "is", null)
        .eq("is_complete", false)
        .order("due_date");
      if (error) throw error;
      return data || [];
    },
  });

  // Pending invitations
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

  // Today's events
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

  // Build inbox items
  const items: InboxItem[] = [];
  const now = new Date();

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

  // Sort by date (most urgent first)
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <DashboardLayout>
      <PageTransition className="p-4 lg:p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Inbox</h1>
            <p className="text-muted-foreground text-sm">
              {items.length === 0 ? "Tudo em dia!" : `${items.length} ${items.length === 1 ? "item" : "itens"} pendentes`}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-lg font-medium mb-1">Tudo em dia!</p>
            <p className="text-muted-foreground text-sm">Nenhuma notificação pendente.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => item.link && navigate(item.link)}
                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer group"
              >
                <div className={`mt-0.5 ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {item.type === "overdue" && "Atrasado"}
                  {item.type === "due_soon" && "Em breve"}
                  {item.type === "invitation" && "Convite"}
                  {item.type === "event_today" && "Hoje"}
                </Badge>
              </motion.div>
            ))}
          </div>
        )}
      </PageTransition>
    </DashboardLayout>
  );
};

export default InboxPage;
