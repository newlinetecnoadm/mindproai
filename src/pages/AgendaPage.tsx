import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { addMonths, subMonths, addWeeks, subWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition } from "@/components/ui/transitions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarGrid from "@/components/agenda/CalendarGrid";
import EventDialog, { type EventFormData } from "@/components/agenda/EventDialog";
import UpgradeModal from "@/components/UpgradeModal";

const AgendaPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventFormData | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date>(new Date());
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const limits = usePlanLimits();

  const { data: events = [] } = useQuery({
    queryKey: ["events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user!.id)
        .order("start_at");
      if (error) throw error;

      // For events linked to cards, fetch board names
      const cardIds = data.filter((e: any) => e.card_id).map((e: any) => e.card_id);
      let boardMap: Record<string, string> = {};
      if (cardIds.length > 0) {
        const { data: cards } = await supabase
          .from("board_cards")
          .select("id, board_id")
          .in("id", cardIds);
        if (cards && cards.length > 0) {
          const boardIds = [...new Set(cards.map((c: any) => c.board_id))];
          const { data: boards } = await supabase
            .from("boards")
            .select("id, title")
            .in("id", boardIds);
          const boardTitleMap: Record<string, string> = {};
          boards?.forEach((b: any) => { boardTitleMap[b.id] = b.title; });
          cards.forEach((c: any) => { boardMap[c.id] = boardTitleMap[c.board_id] || "Board"; });
        }
      }

      return data.map((e: any) => ({
        ...e,
        board_name: e.card_id ? (boardMap[e.card_id] || null) : null,
      }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const payload = {
        title: data.title,
        description: data.description || null,
        start_at: data.start_at.toISOString(),
        end_at: data.end_at.toISOString(),
        all_day: data.all_day,
        color: data.color,
        user_id: user!.id,
      };
      if (data.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setDialogOpen(false);
      toast.success(editingEvent?.id ? "Evento atualizado" : "Evento criado");
    },
    onError: () => toast.error("Erro ao salvar evento"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setDialogOpen(false);
      toast.success("Evento excluído");
    },
    onError: () => toast.error("Erro ao excluir evento"),
  });

  const navigate = (dir: -1 | 1) => {
    setCurrentDate((d) => view === "month" ? (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)) : (dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)));
  };

  const openNew = (date?: Date) => {
    if (!limits.canCreateEvent) {
      setUpgradeOpen(true);
      return;
    }
    setEditingEvent(null);
    setDefaultDate(date || new Date());
    setDialogOpen(true);
  };

  const openEdit = (ev: any) => {
    setEditingEvent({
      id: ev.id,
      title: ev.title,
      description: ev.description || "",
      start_at: new Date(ev.start_at),
      end_at: new Date(ev.end_at),
      all_day: ev.all_day ?? false,
      color: ev.color || "#6366f1",
    });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <PageTransition className="p-4 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Agenda</h1>
            <p className="text-muted-foreground text-sm">Gerencie seus eventos e prazos</p>
          </div>
          <Button variant="hero" onClick={() => openNew()}>
            <Plus className="w-4 h-4 mr-1" /> Novo Evento
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[180px] text-center capitalize">
              {view === "month"
                ? format(currentDate, "MMMM yyyy", { locale: ptBR })
                : `Semana de ${format(currentDate, "dd MMM", { locale: ptBR })}`}
            </h2>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs ml-1" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")}>
            <TabsList className="h-9">
              <TabsTrigger value="month" className="text-xs px-3">Mês</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-3">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Calendar */}
        <CalendarGrid
          currentDate={currentDate}
          view={view}
          events={events}
          onDayClick={(date) => openNew(date)}
          onEventClick={openEdit}
        />

        {/* Event Dialog */}
        <EventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          event={editingEvent}
          onSave={(data) => saveMutation.mutate(data)}
          onDelete={(id) => deleteMutation.mutate(id)}
          defaultDate={defaultDate}
        />
      </PageTransition>
    </DashboardLayout>
  );
};

export default AgendaPage;
