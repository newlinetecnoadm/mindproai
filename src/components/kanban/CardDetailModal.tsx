import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlignLeft, Calendar, CheckSquare, MessageSquare, Tag, Trash2, X, Plus, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";

interface CardDetailModalProps {
  cardId: string | null;
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardUpdated: () => void;
}

const LABEL_COLORS = [
  { color: "#ef4444", name: "Vermelho" },
  { color: "#f97316", name: "Laranja" },
  { color: "#eab308", name: "Amarelo" },
  { color: "#22c55e", name: "Verde" },
  { color: "#3b82f6", name: "Azul" },
  { color: "#8b5cf6", name: "Roxo" },
  { color: "#ec4899", name: "Rosa" },
  { color: "#14b8a6", name: "Teal" },
];

const CardDetailModal = ({ cardId, boardId, open, onOpenChange, onCardUpdated }: CardDetailModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Card data
  const { data: card } = useQuery({
    queryKey: ["card-detail", cardId],
    enabled: !!cardId && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("board_cards").select("*").eq("id", cardId!).single();
      if (error) throw error;
      return data;
    },
  });

  // Labels for this board
  const { data: boardLabels = [] } = useQuery({
    queryKey: ["board-labels", boardId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("card_labels").select("*").eq("board_id", boardId);
      if (error) throw error;
      return data;
    },
  });

  // Card's assigned labels
  const { data: cardLabelIds = [] } = useQuery({
    queryKey: ["card-label-assignments", cardId],
    enabled: !!cardId && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("card_label_assignments").select("label_id").eq("card_id", cardId!);
      if (error) throw error;
      return data.map((d: any) => d.label_id);
    },
  });

  // Checklists
  const { data: checklists = [] } = useQuery({
    queryKey: ["card-checklists", cardId],
    enabled: !!cardId && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("card_checklists").select("*").eq("card_id", cardId!).order("position");
      if (error) throw error;
      return data;
    },
  });

  // Checklist items
  const { data: checklistItems = [] } = useQuery({
    queryKey: ["checklist-items", cardId],
    enabled: !!cardId && open && checklists.length > 0,
    queryFn: async () => {
      const ids = checklists.map((c: any) => c.id);
      const { data, error } = await supabase.from("checklist_items").select("*").in("checklist_id", ids).order("position");
      if (error) throw error;
      return data;
    },
  });

  // Comments
  const { data: comments = [] } = useQuery({
    queryKey: ["card-comments", cardId],
    enabled: !!cardId && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("card_comments").select("*").eq("card_id", cardId!).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Local state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].color);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || "");
    }
  }, [card]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["card-detail", cardId] });
    queryClient.invalidateQueries({ queryKey: ["card-checklists", cardId] });
    queryClient.invalidateQueries({ queryKey: ["checklist-items", cardId] });
    queryClient.invalidateQueries({ queryKey: ["card-comments", cardId] });
    queryClient.invalidateQueries({ queryKey: ["card-label-assignments", cardId] });
    queryClient.invalidateQueries({ queryKey: ["board-labels", boardId] });
    onCardUpdated();
  };

  // Sync due_date with events table
  const syncCardEvent = async (dueDate: string | null) => {
    if (!user || !cardId) return;
    // Remove existing event for this card
    await supabase.from("events").delete().eq("card_id", cardId).eq("user_id", user.id);
    // Create new event if due_date is set
    if (dueDate) {
      const cardTitle = title || card?.title || "Card";
      const d = new Date(dueDate);
      await supabase.from("events").insert({
        user_id: user.id,
        card_id: cardId,
        title: `📋 ${cardTitle}`,
        start_at: d.toISOString(),
        end_at: d.toISOString(),
        all_day: true,
        color: "#f97316",
      });
    }
  };

  // Update card
  const updateCard = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("board_cards").update(updates).eq("id", cardId!);
      if (error) throw error;
      // Sync event when due_date changes
      if ("due_date" in updates) {
        await syncCardEvent(updates.due_date);
      }
    },
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  // Delete card
  const deleteCard = useMutation({
    mutationFn: async () => {
      // Delete related data first
      await supabase.from("events").delete().eq("card_id", cardId!);
      await supabase.from("card_comments").delete().eq("card_id", cardId!);
      const cls = checklists.map((c: any) => c.id);
      if (cls.length) await supabase.from("checklist_items").delete().in("checklist_id", cls);
      await supabase.from("card_checklists").delete().eq("card_id", cardId!);
      await supabase.from("card_label_assignments").delete().eq("card_id", cardId!);
      await supabase.from("card_members").delete().eq("card_id", cardId!);
      await supabase.from("card_attachments").delete().eq("card_id", cardId!);
      const { error } = await supabase.from("board_cards").delete().eq("id", cardId!);
      if (error) throw error;
    },
    onSuccess: () => {
      onCardUpdated();
      onOpenChange(false);
      toast.success("Card excluído");
    },
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("card_comments").insert({ card_id: cardId!, user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      invalidateAll();
    },
  });

  // Add checklist
  const addChecklist = useMutation({
    mutationFn: async (clTitle: string) => {
      const { error } = await supabase.from("card_checklists").insert({ card_id: cardId!, title: clTitle, position: checklists.length });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewChecklistTitle("");
      invalidateAll();
    },
  });

  // Add checklist item
  const addChecklistItem = useMutation({
    mutationFn: async ({ checklistId, text }: { checklistId: string; text: string }) => {
      const items = checklistItems.filter((i: any) => i.checklist_id === checklistId);
      const { error } = await supabase.from("checklist_items").insert({ checklist_id: checklistId, text, position: items.length });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewItemTexts({});
      invalidateAll();
    },
  });

  // Toggle checklist item
  const toggleItem = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase.from("checklist_items").update({ is_checked: checked }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // Delete checklist
  const deleteChecklist = useMutation({
    mutationFn: async (checklistId: string) => {
      await supabase.from("checklist_items").delete().eq("checklist_id", checklistId);
      const { error } = await supabase.from("card_checklists").delete().eq("id", checklistId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // Create label
  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data, error } = await supabase.from("card_labels").insert({ board_id: boardId, name, color }).select("id").single();
      if (error) throw error;
      // Assign to card
      await supabase.from("card_label_assignments").insert({ card_id: cardId!, label_id: data.id });
    },
    onSuccess: () => {
      setNewLabelName("");
      invalidateAll();
    },
  });

  // Toggle label assignment
  const toggleLabel = useMutation({
    mutationFn: async (labelId: string) => {
      if (cardLabelIds.includes(labelId)) {
        await supabase.from("card_label_assignments").delete().eq("card_id", cardId!).eq("label_id", labelId);
      } else {
        await supabase.from("card_label_assignments").insert({ card_id: cardId!, label_id: labelId });
      }
    },
    onSuccess: invalidateAll,
  });

  if (!card) return null;

  const assignedLabels = boardLabels.filter((l: any) => cardLabelIds.includes(l.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Cover */}
        {card.cover_color && (
          <div className="h-8 rounded-t-lg" style={{ backgroundColor: card.cover_color }} />
        )}

        <div className="p-6 space-y-6">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title !== card.title) updateCard.mutate({ title }); }}
            className="text-xl font-bold border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:bg-muted rounded-lg px-2 -mx-2"
          />

          {/* Labels */}
          {assignedLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {assignedLabels.map((l: any) => (
                <Badge key={l.id} className="text-white text-xs" style={{ backgroundColor: l.color }}>
                  {l.name || "Sem nome"}
                </Badge>
              ))}
            </div>
          )}

          {/* Due date */}
          <div className="flex items-center gap-3 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {card.due_date ? format(new Date(card.due_date), "dd MMM yyyy", { locale: ptBR }) : "Data de entrega"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={card.due_date ? new Date(card.due_date) : undefined}
                  onSelect={(d) => { if (d) updateCard.mutate({ due_date: d.toISOString() }); }}
                  locale={ptBR}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {card.due_date && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => updateCard.mutate({ due_date: null })}>
                Remover data
              </Button>
            )}

            {/* Label picker */}
            <Popover open={showLabelPicker} onOpenChange={setShowLabelPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Labels
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <p className="text-xs font-medium mb-2">Labels do board</p>
                <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                  {boardLabels.map((l: any) => (
                    <button
                      key={l.id}
                      onClick={() => toggleLabel.mutate(l.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors",
                        cardLabelIds.includes(l.id) ? "bg-muted ring-1 ring-primary/30" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="w-6 h-4 rounded" style={{ backgroundColor: l.color }} />
                      <span className="flex-1 truncate">{l.name || "Sem nome"}</span>
                      {cardLabelIds.includes(l.id) && <CheckSquare className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-border pt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">Criar nova label</p>
                  <Input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} placeholder="Nome" className="h-7 text-xs" />
                  <div className="flex gap-1 flex-wrap">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c.color}
                        onClick={() => setNewLabelColor(c.color)}
                        className={cn("w-6 h-6 rounded", newLabelColor === c.color && "ring-2 ring-offset-1 ring-primary")}
                        style={{ backgroundColor: c.color }}
                      />
                    ))}
                  </div>
                  <Button size="sm" className="h-7 text-xs w-full" onClick={() => { if (newLabelName.trim()) createLabel.mutate({ name: newLabelName, color: newLabelColor }); }}>
                    Criar label
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlignLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Descrição</span>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => { if (description !== (card.description || "")) updateCard.mutate({ description: description || null }); }}
              placeholder="Adicione uma descrição..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Checklists */}
          {checklists.map((cl: any) => {
            const items = checklistItems.filter((i: any) => i.checklist_id === cl.id);
            const checked = items.filter((i: any) => i.is_checked).length;
            const progress = items.length > 0 ? (checked / items.length) * 100 : 0;

            return (
              <div key={cl.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{cl.title}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteChecklist.mutate(cl.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-muted-foreground w-8">{Math.round(progress)}%</span>
                  <Progress value={progress} className="h-1.5 flex-1" />
                </div>
                <div className="space-y-1 ml-6">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={item.is_checked}
                        onCheckedChange={(v) => toggleItem.mutate({ itemId: item.id, checked: !!v })}
                      />
                      <span className={cn("text-sm", item.is_checked && "line-through text-muted-foreground")}>{item.text}</span>
                    </div>
                  ))}
                  <div className="flex gap-1 mt-1">
                    <Input
                      value={newItemTexts[cl.id] || ""}
                      onChange={(e) => setNewItemTexts({ ...newItemTexts, [cl.id]: e.target.value })}
                      placeholder="Adicionar item..."
                      className="h-7 text-xs flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newItemTexts[cl.id]?.trim()) {
                          addChecklistItem.mutate({ checklistId: cl.id, text: newItemTexts[cl.id].trim() });
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={!newItemTexts[cl.id]?.trim()}
                      onClick={() => {
                        if (newItemTexts[cl.id]?.trim()) addChecklistItem.mutate({ checklistId: cl.id, text: newItemTexts[cl.id].trim() });
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add checklist */}
          <div className="flex gap-2">
            <Input
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              placeholder="Nova checklist..."
              className="h-8 text-xs flex-1"
              onKeyDown={(e) => { if (e.key === "Enter" && newChecklistTitle.trim()) addChecklist.mutate(newChecklistTitle.trim()); }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              disabled={!newChecklistTitle.trim()}
              onClick={() => { if (newChecklistTitle.trim()) addChecklist.mutate(newChecklistTitle.trim()); }}
            >
              <CheckSquare className="w-3.5 h-3.5" /> Checklist
            </Button>
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Comentários</span>
            </div>
            <div className="space-y-3 mb-3">
              {comments.map((c: any) => (
                <div key={c.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">Você</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(c.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                rows={2}
                className="resize-none text-sm flex-1"
              />
              <Button
                size="sm"
                variant="hero"
                className="h-auto self-end"
                disabled={!newComment.trim()}
                onClick={() => { if (newComment.trim()) addComment.mutate(newComment.trim()); }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Delete card */}
          <div className="border-t border-border pt-4">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs gap-1" onClick={() => deleteCard.mutate()}>
              <Trash2 className="w-3.5 h-3.5" /> Excluir card
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CardDetailModal;
