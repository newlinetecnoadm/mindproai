import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subHours, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ReminderPickerProps {
  cardId: string;
  dueDate: string;
}

const REMINDER_OPTIONS = [
  { label: "15 min antes", offset: 15 * 60 * 1000 },
  { label: "1 hora antes", offset: 60 * 60 * 1000 },
  { label: "1 dia antes", offset: 24 * 60 * 60 * 1000 },
  { label: "2 dias antes", offset: 2 * 24 * 60 * 60 * 1000 },
];

const ReminderPicker = ({ cardId, dueDate }: ReminderPickerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: reminders = [] } = useQuery({
    queryKey: ["card-reminders", cardId],
    enabled: !!cardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_reminders")
        .select("*")
        .eq("card_id", cardId)
        .eq("user_id", user!.id)
        .order("remind_at");
      if (error) throw error;
      return data || [];
    },
  });

  const addReminder = useMutation({
    mutationFn: async (offsetMs: number) => {
      const remindAt = new Date(new Date(dueDate).getTime() - offsetMs);
      if (remindAt < new Date()) {
        throw new Error("past");
      }
      const { error } = await supabase.from("card_reminders").insert({
        card_id: cardId,
        user_id: user!.id,
        remind_at: remindAt.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-reminders", cardId] });
      toast.success("Lembrete adicionado");
    },
    onError: (err: any) => {
      if (err.message === "past") {
        toast.error("Esse horário já passou");
      } else {
        toast.error("Erro ao criar lembrete");
      }
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("card_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-reminders", cardId] });
      toast.success("Lembrete removido");
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Bell className="w-3.5 h-3.5" />
          Lembrete
          {reminders.length > 0 && (
            <span className="ml-1 bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
              {reminders.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start">
        <p className="text-xs font-medium mb-2">Lembretes</p>
        
        {/* Existing reminders */}
        {reminders.length > 0 && (
          <div className="space-y-1 mb-3">
            {reminders.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/50 text-xs">
                <span>{format(new Date(r.remind_at), "dd MMM, HH:mm", { locale: ptBR })}</span>
                <button
                  onClick={() => deleteReminder.mutate(r.id)}
                  className="p-1 rounded hover:bg-destructive/10"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add reminder options */}
        <div className="space-y-1">
          {REMINDER_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => addReminder.mutate(opt.offset)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors text-left"
            >
              <Plus className="w-3 h-3 text-muted-foreground" />
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ReminderPicker;
