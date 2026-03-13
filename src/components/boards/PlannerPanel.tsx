import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, ChevronLeft, ChevronRight, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

interface PlannerPanelProps {
  onClose: () => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6am to 7pm

const PlannerPanel = ({ onClose }: PlannerPanelProps) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());

  const dateStr = format(currentDate, "yyyy-MM-dd");

  const { data: events = [] } = useQuery({
    queryKey: ["planner-panel-events", user?.id, dateStr],
    enabled: !!user,
    queryFn: async () => {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1).toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user!.id)
        .gte("start_at", start)
        .lt("start_at", end)
        .order("start_at");
      if (error) throw error;
      return data || [];
    },
  });

  const now = new Date();
  const isToday = format(now, "yyyy-MM-dd") === dateStr;

  // Calculate current time position
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentTimeTop = ((currentHour - 6) / 14) * 100;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full border-r border-border bg-card flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">
            {format(currentDate, "MMM", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Day label */}
      <div className="px-3 py-2 text-center border-b border-border">
        <span className="text-sm capitalize">
          {format(currentDate, "EEEE", { locale: ptBR })}
        </span>
        <span className={`ml-2 inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
          isToday ? "bg-primary text-primary-foreground" : ""
        }`}>
          {format(currentDate, "d")}
        </span>
      </div>

      {/* All day section */}
      <div className="px-3 py-1.5 border-b border-border">
        <span className="text-[11px] text-muted-foreground">All day</span>
        {events.filter((e: any) => e.all_day).map((ev: any) => (
          <div key={ev.id} className="mt-1 px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary">
            {ev.title}
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="relative" style={{ height: `${HOURS.length * 60}px` }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full flex items-start"
              style={{ top: `${((hour - 6) / 14) * 100}%`, height: `${100 / 14}%` }}
            >
              <span className="text-[11px] text-muted-foreground w-12 text-right pr-2 shrink-0 -mt-1.5">
                {hour === 12 ? "12 pm" : hour < 12 ? `${hour} am` : `${hour - 12} pm`}
              </span>
              <div className="flex-1 border-t border-border/50 h-full" />
            </div>
          ))}

          {/* Current time indicator */}
          {isToday && currentHour >= 6 && currentHour <= 20 && (
            <div
              className="absolute left-10 right-0 flex items-center z-10"
              style={{ top: `${currentTimeTop}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 -ml-1" />
              <div className="flex-1 h-0.5 bg-primary" />
            </div>
          )}

          {/* Events on timeline */}
          {events.filter((e: any) => !e.all_day).map((ev: any) => {
            const startH = new Date(ev.start_at).getHours() + new Date(ev.start_at).getMinutes() / 60;
            const endH = new Date(ev.end_at).getHours() + new Date(ev.end_at).getMinutes() / 60;
            const top = ((startH - 6) / 14) * 100;
            const height = ((endH - startH) / 14) * 100;
            return (
              <div
                key={ev.id}
                className="absolute left-12 right-2 rounded px-2 py-1 text-xs font-medium overflow-hidden"
                style={{
                  top: `${top}%`,
                  height: `${Math.max(height, 2)}%`,
                  backgroundColor: ev.color || "hsl(var(--primary))",
                  color: "white",
                  opacity: 0.9,
                }}
              >
                {ev.title}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default PlannerPanel;
