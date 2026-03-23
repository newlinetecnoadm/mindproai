import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ColumnData } from "./KanbanColumn";

interface ArchivedCardsDialogProps {
  boardId: string;
  columns: ColumnData[];
  onCardRestored: () => void;
}

interface ArchivedCard {
  id: string;
  title: string;
  column_id: string;
  archived_at: string | null;
  position: number;
}

const ArchivedCardsDialog = ({ boardId, columns, onCardRestored }: ArchivedCardsDialogProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: archivedCards = [], isLoading } = useQuery({
    queryKey: ["archived-cards", boardId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_cards")
        .select("id, title, column_id, archived_at, position")
        .eq("board_id", boardId)
        .eq("is_archived" as any, true)
        .order("archived_at" as any, { ascending: false });
      if (error) throw error;
      return (data || []) as ArchivedCard[];
    },
  });

  const restoreMut = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from("board_cards")
        .update({ is_archived: false, archived_at: null } as any)
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-cards", boardId] });
      onCardRestored();
      toast.success("Card restaurado");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (cardId: string) => {
      await supabase.from("card_activities").delete().eq("card_id", cardId);
      await supabase.from("events").delete().eq("card_id", cardId);
      await supabase.from("card_comments").delete().eq("card_id", cardId);
      await supabase.from("card_label_assignments").delete().eq("card_id", cardId);
      await supabase.from("card_members").delete().eq("card_id", cardId);
      await supabase.from("card_attachments").delete().eq("card_id", cardId);
      const { data: cls } = await supabase.from("card_checklists").select("id").eq("card_id", cardId);
      if (cls?.length) {
        await supabase.from("checklist_items").delete().in("checklist_id", cls.map((c: any) => c.id));
      }
      await supabase.from("card_checklists").delete().eq("card_id", cardId);
      const { error } = await supabase.from("board_cards").delete().eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-cards", boardId] });
      toast.success("Card excluído permanentemente");
    },
  });

  // Group cards by archived date
  const grouped = archivedCards.reduce<Record<string, ArchivedCard[]>>((acc, card) => {
    const dateKey = card.archived_at
      ? format(new Date(card.archived_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : "Sem data";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(card);
    return acc;
  }, {});

  const getColumnTitle = (columnId: string) =>
    columns.find((c) => c.id === columnId)?.title || "Coluna removida";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Cards arquivados">
          <Archive className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Archive className="w-4 h-4" /> Cards Arquivados
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : archivedCards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum card arquivado
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([dateLabel, cards]) => (
                <div key={dateLabel}>
                  <p className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                    {dateLabel}
                  </p>
                  <div className="space-y-1.5">
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{card.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            em {getColumnTitle(card.column_id)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          title="Restaurar"
                          onClick={() => restoreMut.mutate(card.id)}
                          disabled={restoreMut.isPending}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                          title="Excluir permanentemente"
                          onClick={() => {
                            if (confirm("Excluir permanentemente este card?")) {
                              deleteMut.mutate(card.id);
                            }
                          }}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ArchivedCardsDialog;
