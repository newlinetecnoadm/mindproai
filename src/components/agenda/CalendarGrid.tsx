import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, format,
  startOfWeek as sow, endOfWeek as eow, addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  color: string | null;
  all_day: boolean | null;
  card_id?: string | null;
  board_name?: string | null;
}

interface CalendarGridProps {
  currentDate: Date;
  view: "month" | "week";
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6h-23h

const CalendarGrid = ({ currentDate, view, events, onDayClick, onEventClick }: CalendarGridProps) => {
  if (view === "month") return <MonthView currentDate={currentDate} events={events} onDayClick={onDayClick} onEventClick={onEventClick} />;
  return <WeekView currentDate={currentDate} events={events} onDayClick={onDayClick} onEventClick={onEventClick} />;
};

const MonthView = ({ currentDate, events, onDayClick, onEventClick }: Omit<CalendarGridProps, "view">) => {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { locale: ptBR });
    const calEnd = endOfWeek(monthEnd, { locale: ptBR });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => {
      const start = new Date(e.start_at);
      const end = new Date(e.end_at);
      return day >= new Date(start.toDateString()) && day <= new Date(end.toDateString());
    });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2.5 text-xs font-medium text-muted-foreground text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-[100px] p-1.5 border-b border-r border-border cursor-pointer transition-colors hover:bg-muted/50",
                !inMonth && "bg-muted/20 opacity-50",
                idx % 7 === 6 && "border-r-0",
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm",
                  isToday(day) && "bg-primary text-primary-foreground font-bold",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className="w-full text-left text-[11px] leading-tight px-1.5 py-0.5 rounded truncate text-white font-medium"
                    style={{ backgroundColor: ev.color || "#6366f1" }}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const WeekView = ({ currentDate, events, onDayClick, onEventClick }: Omit<CalendarGridProps, "view">) => {
  const weekDays = useMemo(() => {
    const start = sow(currentDate, { locale: ptBR });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => {
      const start = new Date(e.start_at);
      return isSameDay(start, day);
    });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
        <div className="border-r border-border" />
        {weekDays.map((day, i) => (
          <div
            key={i}
            onClick={() => onDayClick(day)}
            className={cn(
              "text-center py-2.5 border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/50",
              isToday(day) && "bg-primary/5"
            )}
          >
            <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</div>
            <div className={cn(
              "text-lg font-semibold inline-flex items-center justify-center w-9 h-9 rounded-full",
              isToday(day) && "bg-primary text-primary-foreground"
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>
      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-r border-b border-border px-2 py-3 text-[11px] text-muted-foreground text-right">
                {String(hour).padStart(2, "0")}:00
              </div>
              {weekDays.map((day, di) => {
                const dayEvents = getEventsForDay(day).filter((ev) => {
                  const h = new Date(ev.start_at).getHours();
                  return h === hour;
                });
                return (
                  <div
                    key={di}
                    onClick={() => onDayClick(day)}
                    className={cn(
                      "border-r border-b border-border last:border-r-0 min-h-[48px] p-0.5 cursor-pointer hover:bg-muted/30 relative",
                      isToday(day) && "bg-primary/[0.02]"
                    )}
                  >
                    {dayEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                        className="w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded text-white font-medium truncate"
                        style={{ backgroundColor: ev.color || "#6366f1" }}
                      >
                        {ev.title}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
