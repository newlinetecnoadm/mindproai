import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlignLeft, Calendar, CheckSquare, MessageSquare, Tag, Trash2, X, Plus, Send,
  Download, FileText, Upload, Copy, ArrowRightLeft, Activity, Users, GitBranch, ExternalLink, Archive, Pencil, GripVertical, Check, LayoutGrid
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCardActivity } from "@/hooks/useCardActivity";
import CardActivityFeed from "./CardActivityFeed";
import MentionInput, { extractMentionedUserIds, type MentionUser } from "./MentionInput";
import ReminderPicker from "./ReminderPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { useIsMobile } from "@/hooks/use-mobile";

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

const SortableChecklistItem = ({ 
  item, 
  onToggle, 
  onEdit, 
  onDelete, 
  isEditing, 
  editingText, 
  onEditingTextChange, 
  onSave, 
  onCancel 
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 group"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <Checkbox
        checked={item.is_checked}
        onCheckedChange={(v) => onToggle(item.id, !!v)}
      />
      {isEditing ? (
        <div className="flex-1 flex gap-1">
          <Input
            autoFocus
            value={editingText}
            onChange={(e) => onEditingTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(item.id);
              else if (e.key === "Escape") onCancel();
            }}
            className="h-7 text-xs flex-1"
          />
          <Button size="sm" variant="hero" className="h-7 w-7 p-0" onClick={() => onSave(item.id)}>
            <Check className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <span
          className={cn("text-sm flex-1 cursor-pointer hover:text-primary py-1", item.is_checked && "line-through text-muted-foreground")}
          onClick={() => onEdit(item.id, item.text)}
          title="Clique para editar"
        >{item.text}</span>
      )}
      {!isEditing && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};

const CardDetailModal = ({ cardId, boardId, open, onOpenChange, onCardUpdated }: CardDetailModalProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logActivity } = useCardActivity();

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

  // Board members for @mentions
  const { data: mentionUsers = [] } = useQuery<MentionUser[]>({
    queryKey: ["board-mention-users", boardId],
    enabled: !!boardId && open,
    queryFn: async () => {
      // Get board owner + members
      const { data: board } = await supabase.from("boards").select("user_id").eq("id", boardId).single();
      const { data: members } = await supabase.from("board_members").select("user_id").eq("board_id", boardId);
      const allIds = [...new Set([board?.user_id, ...(members || []).map((m: any) => m.user_id)].filter(Boolean))] as string[];
      if (!allIds.length) return [];
      const { data: profiles } = await supabase.from("user_profiles").select("user_id, full_name, email").in("user_id", allIds);
      return (profiles || []).filter((p: any) => p.user_id !== user?.id) as MentionUser[];
    },
  });

  // All board users (including current user, for member picker)
  const { data: allBoardUsers = [] } = useQuery<MentionUser[]>({
    queryKey: ["board-all-users", boardId],
    enabled: !!boardId && open,
    queryFn: async () => {
      const { data: board } = await supabase.from("boards").select("user_id").eq("id", boardId).single();
      const { data: members } = await supabase.from("board_members").select("user_id").eq("board_id", boardId);
      const allIds = [...new Set([board?.user_id, ...(members || []).map((m: any) => m.user_id)].filter(Boolean))] as string[];
      if (!allIds.length) return [];
      const { data: profiles } = await supabase.from("user_profiles").select("user_id, full_name, email").in("user_id", allIds);
      return (profiles || []) as MentionUser[];
    },
  });

  // Card members
  const { data: cardMemberIds = [] } = useQuery({
    queryKey: ["card-members", cardId],
    enabled: !!cardId && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("card_members").select("user_id").eq("card_id", cardId!);
      if (error) throw error;
      return data.map((d: any) => d.user_id);
    },
  });



  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].color);
  // diagramPreviewId removed - now redirects directly
  const [showDiagramPicker, setShowDiagramPicker] = useState(false);

  // User's diagrams for linking
  const { data: userDiagrams = [] } = useQuery({
    queryKey: ["user-diagrams-for-link"],
    enabled: open && showDiagramPicker,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagrams")
        .select("id, title, type, thumbnail")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const cardDiagramId = (card as any)?.diagram_id as string | null | undefined;
  const { data: linkedDiagram } = useQuery({
    queryKey: ["linked-diagram", cardDiagramId],
    enabled: !!cardDiagramId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagrams")
        .select("id, title, type, thumbnail")
        .eq("id", cardDiagramId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

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
    queryClient.invalidateQueries({ queryKey: ["board-label-assignments"] });

    queryClient.invalidateQueries({ queryKey: ["board-labels", boardId] });
    queryClient.invalidateQueries({ queryKey: ["card-activities", cardId] });
    queryClient.invalidateQueries({ queryKey: ["card-members"] });
    queryClient.invalidateQueries({ queryKey: ["linked-diagram"] });
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
      
      // Determine if it's an all-day event (default to 00:00:00 local time)
      const isAllDay = d.getHours() === 0 && d.getMinutes() === 0;
      
      await supabase.from("events").insert({
        user_id: user.id,
        card_id: cardId,
        title: `📋 ${cardTitle}`,
        start_at: d.toISOString(),
        end_at: d.toISOString(),
        all_day: isAllDay,
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
      // Log activities (skip due_date — it's just an editable field)
      if (cardId) {
        if ("is_complete" in updates) {
          await logActivity(cardId, updates.is_complete ? "completed" : "uncompleted");
        }
        if ("description" in updates) {
          await logActivity(cardId, "description_updated");
        }
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
      await supabase.from("card_activities").delete().eq("card_id", cardId!);
      await supabase.from("events").delete().eq("card_id", cardId!);
      await supabase.from("card_comments").delete().eq("card_id", cardId!);
      const cls = checklists.map((c: any) => c.id);
      if (cls.length) await supabase.from("checklist_items").delete().in("checklist_id", cls);
      await supabase.from("card_checklists").delete().eq("card_id", cardId!);
      await supabase.from("card_label_assignments").delete().eq("card_id", cardId!);
      await supabase.from("card_members").delete().eq("card_id", cardId!);

      const { error } = await supabase.from("board_cards").delete().eq("id", cardId!);
      if (error) throw error;
    },
    onSuccess: () => {
      onCardUpdated();
      onOpenChange(false);
      toast.success("Card excluído");
    },
  });

  // Archive card
  const archiveCardMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("board_cards").update({ is_archived: true, archived_at: new Date().toISOString() } as any).eq("id", cardId!);
      if (error) throw error;
    },
    onSuccess: () => {
      onCardUpdated();
      onOpenChange(false);
      toast.success("Card arquivado");
    },
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("card_comments").insert({ card_id: cardId!, user_id: user!.id, content });
      if (error) throw error;
      // Extract mentioned user IDs and notify only them
      const mentionedIds = extractMentionedUserIds(content, mentionUsers);
      const boardUrl = `${window.location.origin}/boards/${boardId}`;
      supabase.functions.invoke("notify-card-comment", {
        body: {
          card_id: cardId,
          comment: content,
          board_url: boardUrl,
          ...(mentionedIds.length > 0 ? { mentioned_user_ids: mentionedIds } : {}),
        },
      }).catch(() => { /* silent */ });

      // In-app notifications for mentions
      const cardTitle = card?.title || "card";
      for (const uid of mentionedIds) {
        supabase.from("notifications").insert({
          user_id: uid,
          type: "mention",
          title: `Você foi mencionado em "${cardTitle}"`,
          body: content.substring(0, 200),
          board_id: boardId,
          card_id: cardId,
        }).then(() => {});
      }

      // In-app notification for comment (to card members excluding commenter and already-mentioned)
      const { data: cMembers } = await supabase.from("card_members").select("user_id").eq("card_id", cardId!);
      const mentionedSet = new Set(mentionedIds);
      const commentRecipients = (cMembers || []).filter((m: any) => m.user_id !== user!.id && !mentionedSet.has(m.user_id));
      for (const r of commentRecipients) {
        supabase.from("notifications").insert({
          user_id: r.user_id,
          type: "comment",
          title: `Novo comentário em "${cardTitle}"`,
          body: content.substring(0, 200),
          board_id: boardId,
          card_id: cardId,
        }).then(() => {});
      }
    },
    onSuccess: () => {
      setNewComment("");
      invalidateAll();
    },
  });

  // Update comment
  const updateComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase.from("card_comments").update({ content, updated_at: new Date().toISOString() }).eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingCommentId(null);
      invalidateAll();
      toast.success("Comentário atualizado");
    },
  });

  // Delete comment
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("card_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Comentário excluído");
    },
  });

  // Reorder checklist items
  const reorderChecklistItems = useMutation({
    mutationFn: async ({ checklistId, itemIds }: { checklistId: string; itemIds: string[] }) => {
      await Promise.all(itemIds.map((id, i) => supabase.from("checklist_items").update({ position: i }).eq("id", id)));
    },
    onSuccess: invalidateAll,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleChecklistDragEnd = (event: DragEndEvent, checklistId: string) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const items = checklistItems.filter((i: any) => i.checklist_id === checklistId).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
      const oldIndex = items.findIndex((i: any) => i.id === active.id);
      const newIndex = items.findIndex((i: any) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(items, oldIndex, newIndex);
        reorderChecklistItems.mutate({ checklistId, itemIds: reordered.map((i: any) => i.id) });
      }
    }
  };

  // Add checklist
  const addChecklist = useMutation({
    mutationFn: async (clTitle: string) => {
      const { error } = await supabase.from("card_checklists").insert({ card_id: cardId!, title: clTitle, position: checklists.length });
      if (error) throw error;
      if (cardId) await logActivity(cardId, "checklist_added", { checklist_title: clTitle });
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

  // Update checklist item text
  const updateChecklistItem = useMutation({
    mutationFn: async ({ itemId, text }: { itemId: string; text: string }) => {
      const { error } = await supabase.from("checklist_items").update({ text }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => { setEditingItemId(null); invalidateAll(); },
  });

  // Delete checklist item
  const deleteChecklistItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("checklist_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // Update checklist title
  const updateChecklistTitle = useMutation({
    mutationFn: async ({ checklistId, title: newTitle }: { checklistId: string; title: string }) => {
      const { error } = await supabase.from("card_checklists").update({ title: newTitle }).eq("id", checklistId);
      if (error) throw error;
    },
    onSuccess: () => { setEditingChecklistId(null); invalidateAll(); },
  });

  // Delete checklist
  const deleteChecklist = useMutation({
    mutationFn: async (checklistId: string) => {
      const cl = checklists.find((c: any) => c.id === checklistId);
      await supabase.from("checklist_items").delete().eq("checklist_id", checklistId);
      const { error } = await supabase.from("card_checklists").delete().eq("id", checklistId);
      if (error) throw error;
      if (cardId) await logActivity(cardId, "checklist_removed", { checklist_title: (cl as any)?.title || "" });
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
      const label = boardLabels.find((l: any) => l.id === labelId);
      if (cardLabelIds.includes(labelId)) {
        await supabase.from("card_label_assignments").delete().eq("card_id", cardId!).eq("label_id", labelId);
        if (cardId) await logActivity(cardId, "label_removed", { label_name: label?.name || "Sem nome", label_color: label?.color });
      } else {
        await supabase.from("card_label_assignments").insert({ card_id: cardId!, label_id: labelId });
        if (cardId) await logActivity(cardId, "label_added", { label_name: label?.name || "Sem nome", label_color: label?.color });
      }
    },
    onSuccess: invalidateAll,
  });

  // Toggle card member
  const toggleMember = useMutation({
    mutationFn: async (userId: string) => {
      if (cardMemberIds.includes(userId)) {
        await supabase.from("card_members").delete().eq("card_id", cardId!).eq("user_id", userId);
        if (cardId) await logActivity(cardId, "member_removed", {});
      } else {
        await supabase.from("card_members").insert({ card_id: cardId!, user_id: userId });
        if (cardId) await logActivity(cardId, "member_added", {});
        // Notify the added member
        const cardTitle = title || card?.title || "Card";
        const boardUrl = `${window.location.origin}/boards/${boardId}`;
        supabase.functions.invoke("notify-board-event", {
          body: {
            type: "member_added",
            user_ids: [userId],
            data: { card_title: cardTitle, board_url: boardUrl },
          },
        }).catch(() => {});
        // In-app notification
        if (userId !== user!.id) {
          supabase.from("notifications").insert({
            user_id: userId,
            type: "member_added",
            title: `Você foi adicionado ao card "${cardTitle}"`,
            board_id: boardId,
            card_id: cardId,
          }).then(() => {});
        }
      }
    },
    onSuccess: invalidateAll,
  });



  // All boards for move card
  const { data: allBoards = [] } = useQuery({
    queryKey: ["boards-for-move"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("boards").select("id, title").eq("is_closed", false).order("title");
      if (error) throw error;
      return data;
    },
  });

  const [showMoveCard, setShowMoveCard] = useState(false);
  const [moveTargetBoardId, setMoveTargetBoardId] = useState<string>("");
  const [moveTargetColumns, setMoveTargetColumns] = useState<{ id: string; title: string }[]>([]);
  const [moveTargetColumnId, setMoveTargetColumnId] = useState<string>("");

  const [showCopyCard, setShowCopyCard] = useState(false);
  const [copyChecklists, setCopyChecklists] = useState(true);
  const [copyLabels, setCopyLabels] = useState(true);

  const loadTargetColumns = async (targetBoardId: string) => {
    setMoveTargetBoardId(targetBoardId);
    const { data } = await supabase.from("board_columns").select("id, title").eq("board_id", targetBoardId).order("position");
    setMoveTargetColumns(data || []);
    setMoveTargetColumnId(data?.[0]?.id || "");
  };

  const copyCardMut = useMutation({
    mutationFn: async () => {
      if (!card || !cardId) return;
      const { count } = await supabase.from("board_cards").select("*", { count: "exact", head: true }).eq("column_id", card.column_id);
      const { data: newCard, error } = await supabase.from("board_cards").insert({
        board_id: boardId,
        column_id: card.column_id,
        title: `${card.title} (cópia)`,
        description: card.description,
        cover_color: card.cover_color,
        due_date: card.due_date,
        position: count || 0,
      }).select("id").single();
      if (error) throw error;

      if (copyLabels && cardLabelIds.length > 0) {
        await supabase.from("card_label_assignments").insert(
          cardLabelIds.map((lid: string) => ({ card_id: newCard.id, label_id: lid }))
        );
      }

      if (copyChecklists && checklists.length > 0) {
        for (const cl of checklists) {
          const { data: newCl } = await supabase.from("card_checklists").insert({
            card_id: newCard.id, title: (cl as any).title, position: (cl as any).position,
          }).select("id").single();
          if (newCl) {
            const items = checklistItems.filter((i: any) => i.checklist_id === (cl as any).id);
            if (items.length > 0) {
              await supabase.from("checklist_items").insert(
                items.map((i: any) => ({ checklist_id: newCl.id, text: i.text, position: i.position, is_checked: false }))
              );
            }
          }
        }
      }
    },
    onSuccess: () => {
      invalidateAll();
      setShowCopyCard(false);
      toast.success("Card copiado");
    },
    onError: () => toast.error("Erro ao copiar card"),
  });

  const moveCardToBoardMut = useMutation({
    mutationFn: async () => {
      if (!cardId || !moveTargetColumnId || !moveTargetBoardId) return;
      const { count } = await supabase.from("board_cards").select("*", { count: "exact", head: true }).eq("column_id", moveTargetColumnId);
      const { error } = await supabase.from("board_cards").update({
        board_id: moveTargetBoardId,
        column_id: moveTargetColumnId,
        position: count || 0,
      }).eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      onOpenChange(false);
      setShowMoveCard(false);
      toast.success("Card movido para outro board");
    },
    onError: () => toast.error("Erro ao mover card"),
  });

  if (!card) return null;
  const assignedLabels = boardLabels.filter((l: any) => cardLabelIds.includes(l.id));

  // Render comment text with highlighted @mentions
  const renderCommentWithMentions = (text: string) => {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-primary font-medium">{part}</span>
        );
      }
      return part;
    });
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <div className={cn("space-y-6", isMobile ? "pb-4 -mt-2" : "p-0")}>
        {/* Cover */}
        {card.cover_color && (
          <div className="h-8 rounded-t-lg -mx-4 -mt-4 mb-4" style={{ backgroundColor: card.cover_color }} />
        )}

        <div className={cn("flex flex-col gap-6", !isMobile && "p-0")}>
          {/* Title and ID */}
          <div className="space-y-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { if (title.trim() && title !== card.title) updateCard.mutate({ title }); }}
              className="text-xl font-bold border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:bg-muted rounded-lg px-2 -mx-2"
            />
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span>Card {cardId?.substring(0, 8)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <LayoutGrid className="w-3 h-3" />
                No Board
              </span>
            </div>
          </div>

          <div className={cn("grid gap-8", !isMobile && "grid-cols-4")}>
            <div className={cn("space-y-8", !isMobile ? "col-span-3" : "col-span-1")}>
              {/* Labels + Diagram link */}
              <div className="flex flex-wrap items-center gap-1.5">
                {assignedLabels.map((l: any) => (
                  <Badge key={l.id} className="text-white text-xs" style={{ backgroundColor: l.color }}>
                    {l.name || "Sem nome"}
                  </Badge>
                ))}
                {linkedDiagram ? (
                  <Badge
                    variant="outline"
                    className="text-xs gap-1 cursor-pointer hover:bg-primary/10 border-primary/30 text-primary"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/diagramas/${linkedDiagram.id}`);
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {linkedDiagram.title}
                  </Badge>
                ) : (
                  <Popover open={showDiagramPicker} onOpenChange={setShowDiagramPicker} modal={true}>
                    <PopoverTrigger asChild>
                      <button type="button" className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border border-border cursor-pointer hover:bg-muted/80 transition-colors">
                        <GitBranch className="w-3 h-3" /> Diagrama
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="start">
                      <p className="text-xs font-medium mb-2">Seus diagramas</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {userDiagrams.length === 0 && (
                          <p className="text-xs text-muted-foreground py-2 text-center">Nenhum diagrama encontrado</p>
                        )}
                        {userDiagrams.map((d: any) => (
                          <button
                            key={d.id}
                            onClick={() => {
                              updateCard.mutate({ diagram_id: d.id });
                              setShowDiagramPicker(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-left text-xs hover:bg-muted/50 transition-colors"
                          >
                            {d.thumbnail ? (
                              <img src={d.thumbnail} alt="" className="w-10 h-7 object-cover rounded shrink-0" />
                            ) : (
                              <div className="w-10 h-7 flex items-center justify-center rounded bg-muted shrink-0">
                                <GitBranch className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{d.title}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{d.type?.replace("_", " ")}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {linkedDiagram && (
                  <Button variant="ghost" size="sm" className="h-5 px-1 text-destructive" onClick={() => updateCard.mutate({ diagram_id: null })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Due date and reminders */}
              <div className="flex items-center gap-3 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {card.due_date ? format(new Date(card.due_date), "dd MMM yyyy, HH:mm", { locale: ptBR }) : "Data de entrega"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b border-border flex items-center justify-between gap-4">
                      <span className="text-xs font-medium">Definir data e hora</span>
                      <Input
                        type="time"
                        className="h-8 w-32 text-xs"
                        value={card.due_date ? format(new Date(card.due_date), "HH:mm") : "12:00"}
                        onChange={(e) => {
                          const timeStr = e.target.value;
                          if (!timeStr) return;
                          const [hours, minutes] = timeStr.split(":").map(Number);
                          const currentFullDate = card.due_date ? new Date(card.due_date) : new Date();
                          currentFullDate.setHours(hours, minutes, 0, 0);
                          updateCard.mutate({ due_date: currentFullDate.toISOString() });
                        }}
                      />
                    </div>
                    <CalendarPicker
                      mode="single"
                      selected={card.due_date ? new Date(card.due_date) : undefined}
                      onSelect={(d) => {
                        if (d) {
                          const currentDateTime = card.due_date ? new Date(card.due_date) : new Date();
                          d.setHours(currentDateTime.getHours(), currentDateTime.getMinutes(), 0, 0);
                          updateCard.mutate({ due_date: d.toISOString() });
                        }
                      }}
                      locale={ptBR}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {card.due_date && (
                  <>
                    <ReminderPicker cardId={cardId!} dueDate={card.due_date} />
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => updateCard.mutate({ due_date: null })}>
                      Remover data
                    </Button>
                  </>
                )}
              </div>

              {/* Description */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlignLeft className="w-4 h-4" />
                  Descrição
                </div>
                {isEditingDescription ? (
                  <div className="space-y-3 px-1">
                    <Textarea
                      autoFocus
                      placeholder="Adicione uma descrição mais detalhada..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[120px] text-sm resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => { updateCard.mutate({ description }); setIsEditingDescription(false); }}>Salvar</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDescription(card.description || ""); setIsEditingDescription(false); }}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDescription(true)}
                    className={cn(
                      "min-h-[60px] p-3 rounded-lg text-sm cursor-pointer border border-transparent transition-all",
                      description ? "hover:bg-muted/50" : "bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {description || "Adicionar uma descrição..."}
                  </div>
                )}
              </div>

              {/* Checklists */}
              {checklists.map((cl: any) => (
                <div key={cl.id} className="space-y-4">
                  <div className="flex items-center justify-between group px-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CheckSquare className="w-4 h-4" />
                      {editingChecklistId === cl.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            autoFocus
                            value={editingChecklistTitle}
                            onChange={(e) => setEditingChecklistTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") updateChecklistTitle.mutate({ checklistId: cl.id, title: editingChecklistTitle }); }}
                            className="h-8 text-sm w-48"
                          />
                          <Button size="sm" className="h-8" onClick={() => updateChecklistTitle.mutate({ checklistId: cl.id, title: editingChecklistTitle })}>Salvar</Button>
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditingChecklistId(null)}>Cancelar</Button>
                        </div>
                      ) : (
                        <span className="cursor-pointer hover:underline" onClick={() => { setEditingChecklistId(cl.id); setEditingChecklistTitle(cl.title); }}>{cl.title}</span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteChecklist.mutate(cl.id)}>Excluir</Button>
                  </div>

                  {(() => {
                    const items = checklistItems.filter((i: any) => i.checklist_id === cl.id).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                    const progress = items.length ? Math.round((items.filter((i: any) => i.is_checked).length / items.length) * 100) : 0;
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                          <span className="text-[10px] font-bold w-7 text-right">{progress}%</span>
                          <Progress value={progress} className="h-2 flex-1" />
                        </div>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleChecklistDragEnd(e, cl.id)}>
                          <SortableContext items={items.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-0.5 ml-1">
                              {items.map((item: any) => (
                                <SortableChecklistItem
                                  key={item.id}
                                  item={item}
                                  isEditing={editingItemId === item.id}
                                  editingText={editingItemText}
                                  onEditingTextChange={setEditingItemText}
                                  onToggle={(itemId: string, checked: boolean) => toggleItem.mutate({ itemId, checked })}
                                  onEdit={(itemId: string, text: string) => { setEditingItemId(itemId); setEditingItemText(text); }}
                                  onSave={(itemId: string) => updateChecklistItem.mutate({ itemId, text: editingItemText })}
                                  onDelete={(itemId: string) => deleteChecklistItem.mutate(itemId)}
                                  onCancel={() => setEditingItemId(null)}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                        <div className="px-7">
                          {newItemTexts[cl.id] !== undefined ? (
                            <div className="space-y-2">
                              <Textarea
                                autoFocus
                                placeholder="Adicionar um item"
                                value={newItemTexts[cl.id]}
                                onChange={(e) => setNewItemTexts({ ...newItemTexts, [cl.id]: e.target.value })}
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addChecklistItem.mutate({ checklistId: cl.id, text: newItemTexts[cl.id] }); } }}
                                className="min-h-[60px] text-xs resize-none"
                              />
                              <div className="flex items-center gap-2">
                                <Button size="sm" className="h-8 text-xs" onClick={() => addChecklistItem.mutate({ checklistId: cl.id, text: newItemTexts[cl.id] })}>Adicionar</Button>
                                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { const n = { ...newItemTexts }; delete n[cl.id]; setNewItemTexts(n); }}>Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-8 text-xs -ml-2" onClick={() => setNewItemTexts({ ...newItemTexts, [cl.id]: "" })}>Adicionar um item</Button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}

              {/* Comments */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold px-1">
                  <MessageSquare className="w-4 h-4" />
                  Atividade
                </div>
                <div className="flex gap-3 px-1">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 space-y-2">
                    <MentionInput
                      value={newComment}
                      onChange={setNewComment}
                      users={mentionUsers}
                      placeholder="Escreva um comentário... (use @ para mencionar)"
                      className="min-h-[80px]"
                    />
                    <Button size="sm" disabled={!newComment.trim()} onClick={() => addComment.mutate(newComment)}>Comentar</Button>
                  </div>
                </div>

                <div className="space-y-6 pb-4">
                  {comments.map((c: any) => (
                    <div key={c.id} className="flex gap-3 px-1 group">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {/* Try to find full name for avatar letter if possible */}
                        {allBoardUsers.find((u: any) => u.user_id === c.user_id)?.full_name?.charAt(0).toUpperCase() || c.user_id?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{allBoardUsers.find((u: any) => u.user_id === c.user_id)?.full_name || "Usuário"}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                        {editingCommentId === c.id ? (
                          <div className="space-y-2 mt-2">
                            <MentionInput
                              value={editingCommentContent}
                              onChange={setEditingCommentContent}
                              users={mentionUsers}
                              className="min-h-[80px]"
                            />
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => updateComment.mutate({ commentId: c.id, content: editingCommentContent })}>Salvar</Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-wrap break-words">
                            {renderCommentWithMentions(c.content)}
                          </div>
                        )}
                        {c.user_id === user?.id && !editingCommentId && (
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="hover:underline" onClick={() => { setEditingCommentId(c.id); setEditingCommentContent(c.content); }}>Editar</button>
                            <button className="hover:underline text-destructive" onClick={() => { if (confirm("Excluir comentário?")) deleteComment.mutate(c.id); }}>Excluir</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <details className="text-xs text-muted-foreground px-1 group cursor-pointer border-t border-border pt-4">
                  <summary className="hover:text-foreground transition-colors font-medium flex items-center gap-1 list-none">
                    <Activity className="w-3 h-3" />
                    Mostrar histórico de atividades
                  </summary>
                  <div className="mt-4 pl-4 border-l border-muted">
                    <CardActivityFeed cardId={cardId!} />
                  </div>
                </details>
              </div>
            </div>

            {/* Sidebar Actions */}
          <div className={cn("space-y-6", isMobile ? "border-t border-border pt-6" : "col-span-1")}>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ações</p>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                  <Popover open={showLabelPicker} onOpenChange={setShowLabelPicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 justify-start text-xs gap-2">
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
                            {cardLabelIds.includes(l.id) && <Check className="w-3 h-3 text-primary" />}
                          </button>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-border">
                        <p className="text-[10px] font-bold text-muted-foreground mb-2 px-1">Criar nova label</p>
                        <div className="space-y-2 px-1">
                          <Input
                            placeholder="Nome da label"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            className="h-7 text-xs"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {LABEL_COLORS.map((c) => (
                              <button
                                key={c.color}
                                className={cn("w-5 h-5 rounded flex items-center justify-center transition-transform", newLabelColor === c.color && "ring-2 ring-primary ring-offset-1 scale-110")}
                                style={{ backgroundColor: c.color }}
                                onClick={() => setNewLabelColor(c.color)}
                              >
                                {newLabelColor === c.color && <Check className="w-3 h-3 text-white" />}
                              </button>
                            ))}
                          </div>
                          <Button 
                            className="w-full h-7 text-xs" 
                            disabled={!newLabelName.trim()} 
                            onClick={() => createLabel.mutate({ name: newLabelName.trim(), color: newLabelColor })}
                          >
                            Criar e adicionar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button variant="outline" size="sm" className="h-9 justify-start text-xs gap-2" onClick={() => addChecklist.mutate("Checklist")}>
                    <CheckSquare className="w-3.5 h-3.5" /> Checklist
                  </Button>



                  {/* Move/Copy actions */}
                  <div className="grid grid-cols-2 gap-2 w-full col-span-2 sm:col-span-1">
                    <Popover open={showCopyCard} onOpenChange={setShowCopyCard}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 justify-start text-xs gap-2">
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="start">
                        <p className="text-xs font-medium mb-3">Copiar card</p>
                        <div className="space-y-2 mb-3">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={copyChecklists} onCheckedChange={(v) => setCopyChecklists(!!v)} />
                            Checklists ({checklists.length})
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={copyLabels} onCheckedChange={(v) => setCopyLabels(!!v)} />
                            Labels ({cardLabelIds.length})
                          </label>
                        </div>
                        <Button size="sm" className="w-full h-8 text-xs font-semibold" onClick={() => copyCardMut.mutate()} disabled={copyCardMut.isPending}>
                          {copyCardMut.isPending ? "Copiando..." : "Criar cópia"}
                        </Button>
                      </PopoverContent>
                    </Popover>

                    <Popover open={showMoveCard} onOpenChange={(o) => { setShowMoveCard(o); if (!o) { setMoveTargetBoardId(""); setMoveTargetColumns([]); } }}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 justify-start text-xs gap-2">
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Mover
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="start">
                        <p className="text-xs font-medium mb-3">Mover card</p>
                        <div className="space-y-2 mb-3">
                          <Select value={moveTargetBoardId} onValueChange={loadTargetColumns}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Board..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allBoards.filter((b: any) => b.id !== boardId).map((b: any) => (
                                <SelectItem key={b.id} value={b.id} className="text-xs">{b.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {moveTargetColumns.length > 0 && (
                            <Select value={moveTargetColumnId} onValueChange={setMoveTargetColumnId}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Coluna..." />
                              </SelectTrigger>
                              <SelectContent>
                                {moveTargetColumns.map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.title}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs font-semibold"
                          disabled={!moveTargetColumnId || moveCardToBoardMut.isPending}
                          onClick={() => moveCardToBoardMut.mutate()}
                        >
                          {moveCardToBoardMut.isPending ? "Movendo..." : "Mover agora"}
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Members */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Membros</p>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {cardMemberIds.map((uid: string) => {
                    const profile = allBoardUsers.find((u: any) => u.user_id === uid);
                    return (
                      <div
                        key={uid}
                        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white cursor-help border-2 border-background"
                        title={profile?.full_name || profile?.email || "Membro"}
                      >
                        {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || "?"}
                      </div>
                    );
                  })}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 text-muted-foreground">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <p className="text-xs font-medium mb-2">Membros do board</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {allBoardUsers.map((u: any) => (
                          <button
                            key={u.user_id}
                            onClick={() => toggleMember.mutate(u.user_id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-muted/50 transition-colors"
                          >
                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", cardMemberIds.includes(u.user_id) ? "bg-primary" : "bg-muted text-muted-foreground")}>
                              {u.full_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <span className="flex-1 truncate">{u.full_name || u.email}</span>
                            {cardMemberIds.includes(u.user_id) && <Check className="w-3 h-3 text-primary" />}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Dangerous actions */}
              <div className="pt-4 border-t border-border space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-9 gap-2" onClick={() => archiveCardMut.mutate()}>
                  <Archive className="w-3.5 h-3.5" /> Arquivar este card
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-9 gap-2 text-destructive hover:text-destructive hover:bg-destructive/5" onClick={() => { if (confirm("Excluir card permanentemente?")) deleteCard.mutate(); }}>
                  <Trash2 className="w-3.5 h-3.5" /> Excluir permanentemente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default CardDetailModal;
