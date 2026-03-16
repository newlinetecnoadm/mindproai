import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition } from "@/components/ui/transitions";
import { CalendarDays, CheckCircle2, Circle, Clock, Kanban, Calendar } from "lucide-react";
import { format, isToday, isTomorrow, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const PlannerPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  // Today's events
  const { data: events = [] } = useQuery({
    queryKey: ["planner-events", user?.id, todayStr],
    enabled: !!user,
    queryFn: async () => {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
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

  // Cards due today or soon (next 3 days)
  const { data: dueTasks = [] } = useQuery({
    queryKey: ["planner-tasks", user?.id, todayStr],
    enabled: !!user,
    queryFn: async () => {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endRange = addDays(today, 3).toISOString();
      const { data, error } = await supabase
        .from("board_cards")
        .select("id, title, due_date, is_complete, board_id, column_id")
        .not("due_date", "is", null)
        .gte("due_date", startOfDay)
        .lte("due_date", endRange)
        .order("due_date");
      if (error) throw error;

      // Get board titles
      if (data && data.length > 0) {
        const boardIds = [...new Set(data.map((c) => c.board_id))];
        const { data: boards } = await supabase
          .from("boards")
          .select("id, title")
          .in("id", boardIds);
        const boardMap: Record<string, string> = {};
        boards?.forEach((b) => { boardMap[b.id] = b.title; });
        return data.map((c) => ({ ...c, board_title: boardMap[c.board_id] || "Board" }));
      }
      return data || [];
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, isComplete }: { id: string; isComplete: boolean }) => {
      const { error } = await supabase
        .from("board_cards")
        .update({ is_complete: isComplete })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-due-cards"] });
    },
    onError: () => toast.error("Erro ao atualizar tarefa"),
  });

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Hoje";
    if (isTomorrow(d)) return "Amanhã";
    return format(d, "EEEE, dd MMM", { locale: ptBR });
  };

  // Group tasks by day
  const tasksByDay: Record<string, typeof dueTasks> = {};
  dueTasks.forEach((task: any) => {
    const dayKey = format(new Date(task.due_date), "yyyy-MM-dd");
    if (!tasksByDay[dayKey]) tasksByDay[dayKey] = [];
    tasksByDay[dayKey].push(task);
  });

  return (
    <DashboardLayout>
      <PageTransition className="p-4 lg:p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Planner</h1>
            <p className="text-muted-foreground text-sm capitalize">
              {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Today's schedule */}
        {events.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Agenda de Hoje
            </h2>
            <div className="space-y-2">
              {events.map((ev: any, i: number) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                >
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: ev.color || "hsl(var(--primary))" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ev.title}</p>
                    {!ev.all_day && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(ev.start_at), "HH:mm")} — {format(new Date(ev.end_at), "HH:mm")}
                      </p>
                    )}
                  </div>
                  {ev.all_day && (
                    <Badge variant="outline" className="text-xs">Dia inteiro</Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks grouped by day */}
        {Object.keys(tasksByDay).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(tasksByDay)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dayKey, tasks]) => (
                <div key={dayKey}>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Kanban className="w-4 h-4" /> {getDayLabel(tasks[0]?.due_date || dayKey)}
                  </h2>
                  <div className="space-y-2">
                    {(tasks as any[]).map((task, i) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card group"
                      >
                        <Checkbox
                          checked={task.is_complete}
                          onCheckedChange={(checked) =>
                            toggleComplete.mutate({ id: task.id, isComplete: !!checked })
                          }
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${task.is_complete ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{task.board_title}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {format(new Date(task.due_date), "HH:mm")}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-lg font-medium mb-1">Dia livre!</p>
            <p className="text-muted-foreground text-sm">Nenhum evento ou tarefa para hoje.</p>
          </div>
        ) : null}
      </PageTransition>
    </DashboardLayout>
  );
};

export default PlannerPage;
