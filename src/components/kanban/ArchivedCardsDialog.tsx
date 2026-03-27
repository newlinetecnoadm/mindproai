import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Archive, RotateCcw, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import type { ColumnData } from "./KanbanColumn";

interface ArchivedCardsDialogProps {
  boardId: string;
  columns: ColumnData[];
  onCardRestored: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ArchivedCard {
  id: string;
  title: string;
  column_id: string;
  archived_at: string | null;
  position: number;
}

const ArchivedCardsDialog = ({ 
  boardId, 
  columns, 
  onCardRestored,
  trigger,
  open: externalOpen,
  onOpenChange: setExternalOpen 
}: ArchivedCardsDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;
  const queryClient = useQueryClient();

  const { data: archivedCards = [], isLoading } = useQuery({
    queryKey: ["archived-cards", boardId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_cards")
        .select("id, title, column_id, archived_at, position, is_archived")
        .eq("board_id", boardId) as any;
      if (error) throw error;
      const all = (data || []) as ArchivedCard[];
      return all
        .filter((c: any) => c.is_archived === true)
        .sort((a, b) => (b.archived_at || "").localeCompare(a.archived_at || ""));
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
    const date = card.archived_at ? new Date(card.archived_at) : new Date();
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    let dateKey = "Antigos";
    if (diffDays === 0) dateKey = "Hoje";
    else if (diffDays === 1) dateKey = "Ontem";
    else if (diffDays < 7) dateKey = "Últimos 7 dias";
    else if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) dateKey = "Este Mês";
    else dateKey = format(date, "MMMM 'de' yyyy", { locale: ptBR });

    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(card);
    return acc;
  }, {});

  const getColumnTitle = (columnId: string) =>
    columns.find((c) => c.id === columnId)?.title || "Coluna removida";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full"
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Cards arquivados">
              <Archive className="w-4 h-4" />
            </Button>
          )}
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
            <Accordion type="multiple" defaultValue={["Hoje", "Ontem", "Últimos 7 dias", "Este Mês"]} className="w-full">
              {Object.entries(grouped).map(([dateLabel, cards]) => (
                <AccordionItem key={dateLabel} value={dateLabel} className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Calendar className="w-3 h-3" />
                      {dateLabel}
                      <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded-full lowercase font-normal">
                        {cards.length} {cards.length === 1 ? "card" : "cards"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-3">
                    <div className="space-y-2">
                      {cards.map((card) => (
                        <div
                          key={card.id}
                          className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card/50 hover:bg-accent/50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {card.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              em {getColumnTitle(card.column_id)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              title="Restaurar"
                              onClick={() => restoreMut.mutate(card.id)}
                              disabled={restoreMut.isPending}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
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
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </ScrollArea>
    </DialogContent>
  </Dialog>
</motion.div>
  );
};

export default ArchivedCardsDialog;
