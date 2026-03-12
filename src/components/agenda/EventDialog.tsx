import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

export interface EventFormData {
  id?: string;
  title: string;
  description: string;
  start_at: Date;
  end_at: Date;
  all_day: boolean;
  color: string;
}

const COLORS = [
  "#6366f1", "#ef4444", "#f97316", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6",
];

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventFormData | null;
  onSave: (data: EventFormData) => void;
  onDelete?: (id: string) => void;
  defaultDate?: Date;
}

const EventDialog = ({ open, onOpenChange, event, onSave, onDelete, defaultDate }: EventDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setStartDate(event.start_at);
      setEndDate(event.end_at);
      setStartTime(format(event.start_at, "HH:mm"));
      setEndTime(format(event.end_at, "HH:mm"));
      setAllDay(event.all_day);
      setColor(event.color);
    } else {
      const d = defaultDate || new Date();
      setTitle("");
      setDescription("");
      setStartDate(d);
      setEndDate(d);
      setStartTime("09:00");
      setEndTime("10:00");
      setAllDay(false);
      setColor(COLORS[0]);
    }
  }, [event, open, defaultDate]);

  const handleSave = () => {
    if (!title.trim()) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!allDay) {
      start.setHours(sh, sm, 0, 0);
      end.setHours(eh, em, 0, 0);
    } else {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }
    onSave({ id: event?.id, title: title.trim(), description, start_at: start, end_at: end, all_day: allDay, color });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do evento" className="mt-1" />
          </div>

          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" rows={2} className="mt-1 resize-none" />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={allDay} onCheckedChange={setAllDay} id="all-day" />
            <Label htmlFor="all-day" className="text-sm">Dia inteiro</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1 h-9 text-sm">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(startDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {!allDay && <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1.5 h-9" />}
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1 h-9 text-sm">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(endDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {!allDay && <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1.5 h-9" />}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn("w-7 h-7 rounded-full transition-all", color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            {event?.id && onDelete ? (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(event.id!)}>
                <Trash2 className="w-4 h-4 mr-1" /> Excluir
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button variant="hero" onClick={handleSave} disabled={!title.trim()}>Salvar</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDialog;
