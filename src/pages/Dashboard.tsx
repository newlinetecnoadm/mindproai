import DashboardLayout from "@/components/layout/DashboardLayout";
import SEO from "@/components/SEO";
import { Calendar, Plus, ArrowRight, Brain, Kanban, Clock, FileText, Layers, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const quickActions = [
  { icon: Brain, label: "Novo Mapa Mental", description: "Organize suas ideias visualmente", path: "/diagramas/novo", color: "bg-primary/10 text-primary" },
  { icon: Kanban, label: "Novo Board", description: "Organize tarefas visualmente", path: "/boards", color: "bg-success/10 text-success" },
  { icon: Calendar, label: "Minha Agenda", description: "Veja seus próximos eventos", path: "/agenda", color: "bg-warning/10 text-warning" },
];

function useRecentItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-recent", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [diagrams, boards, events] = await Promise.all([
        supabase
          .from("diagrams")
          .select("id, title, type, updated_at, thumbnail")
          .eq("user_id", user!.id)
          .order("updated_at", { ascending: false })
          .limit(6),
        supabase
          .from("boards")
          .select("id, title, updated_at, cover_color")
          .eq("user_id", user!.id)
          .eq("is_closed", false)
          .order("updated_at", { ascending: false })
          .limit(4),
        supabase
          .from("events")
          .select("id, title, start_at, color, all_day")
          .eq("user_id", user!.id)
          .gte("start_at", new Date().toISOString())
          .order("start_at", { ascending: true })
          .limit(5),
      ]);

      return {
        diagrams: diagrams.data ?? [],
        boards: boards.data ?? [],
        events: events.data ?? [],
        stats: {
          totalDiagrams: diagrams.data?.length ?? 0,
          totalBoards: boards.data?.length ?? 0,
          upcomingEvents: events.data?.length ?? 0,
        },
      };
    },
  });
}

const diagramTypeLabel: Record<string, string> = {
  mindmap: "Mapa Mental",
};

const Dashboard = () => {
  const { user } = useAuth();
  const { data, isLoading } = useRecentItems();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "";

  return (
    <DashboardLayout>
      <SEO title="Dashboard — Meu Painel" />
      <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-2xl font-display font-bold mb-1">
            Olá, {firstName} 👋
          </h1>
          <p className="text-muted-foreground">Aqui está um resumo do seu espaço de trabalho</p>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <Link to={action.path}>
                <div className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 group cursor-pointer">
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    {action.label}
                    <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Stats Row */}
        {!isLoading && data && (
          <motion.div
            className="grid grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {[
              { label: "Diagramas", value: data.stats.totalDiagrams, icon: Layers, color: "text-primary" },
              { label: "Boards Ativos", value: data.stats.totalBoards, icon: Kanban, color: "text-success" },
              { label: "Próximos Eventos", value: data.stats.upcomingEvents, icon: Calendar, color: "text-warning" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                <stat.icon className={`w-5 h-5 ${stat.color} flex-shrink-0`} />
                <div>
                  <p className="text-xl font-bold leading-none">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recently Edited Diagrams */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Editados Recentemente
              </h2>
              <Link to="/diagramas" className="text-sm text-primary hover:underline">
                Ver todos
              </Link>
            </div>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : data && data.diagrams.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {data.diagrams.map((diagram, i) => (
                  <motion.div
                    key={diagram.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/diagramas/${diagram.id}`}>
                      <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all group">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {diagram.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {diagramTypeLabel[diagram.type] || diagram.type}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {diagram.updated_at
                              ? formatDistanceToNow(new Date(diagram.updated_at), { addSuffix: true, locale: ptBR })
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-10 text-center">
                <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground mb-4">Nenhum diagrama criado ainda</p>
                <Link to="/diagramas/novo">
                  <Button variant="hero" size="sm">
                    Criar Primeiro Diagrama <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Recent Boards */}
            {data && data.boards.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Kanban className="w-4 h-4 text-muted-foreground" />
                    Boards Recentes
                  </h2>
                  <Link to="/boards" className="text-sm text-primary hover:underline">
                    Ver todos
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {data.boards.map((board, i) => (
                    <motion.div
                      key={board.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link to={`/boards/${board.id}`}>
                        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all group">
                          <div
                            className="w-10 h-10 rounded-lg flex-shrink-0"
                            style={{ backgroundColor: board.cover_color || "hsl(var(--muted))" }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {board.title}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              {board.updated_at
                                ? formatDistanceToNow(new Date(board.updated_at), { addSuffix: true, locale: ptBR })
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Upcoming Events */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Próximos Eventos
              </h2>
              <Link to="/agenda" className="text-sm text-primary hover:underline">
                Agenda
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : data && data.events.length > 0 ? (
              <div className="space-y-2">
                {data.events.map((event) => {
                  const date = new Date(event.start_at);
                  return (
                    <Link key={event.id} to="/agenda">
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/20 transition-all">
                        <div
                          className="w-1 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: event.color || "hsl(var(--primary))" }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.all_day
                              ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                              : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) +
                                " · " +
                                date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhum evento próximo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
