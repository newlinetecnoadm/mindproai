import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlignLeft, Calendar, CheckSquare, MessageSquare, Tag, Trash2, X, Plus, Send,
  Paperclip, Download, FileText, Upload, Copy, ArrowRightLeft, Activity, Users, GitBranch, ExternalLink,
} from "lucide-react";
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

  // Attachments
  const { data: attachments = [] } = useQuery({
    queryKey: ["card-attachments", cardId],
    enabled: !!cardId && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("card_attachments").select("*").eq("card_id", cardId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
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
    queryClient.invalidateQueries({ queryKey: ["card-attachments", cardId] });
    queryClient.invalidateQueries({ queryKey: ["board-labels", boardId] });
    queryClient.invalidateQueries({ queryKey: ["card-activities", cardId] });
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

  // Upload attachment
  const [uploading, setUploading] = useState(false);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !cardId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${cardId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("card-attachments").upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("card-attachments").getPublicUrl(path);
        await supabase.from("card_attachments").insert({
          card_id: cardId,
          name: file.name,
          url: urlData.publicUrl,
          mime_type: file.type || null,
        });
      }
      invalidateAll();
      toast.success("Anexo(s) adicionado(s)");
    } catch {
      toast.error("Erro ao fazer upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Delete attachment
  const deleteAttachment = useMutation({
    mutationFn: async (att: { id: string; url: string }) => {
      // Extract storage path from URL
      const urlParts = att.url.split("/card-attachments/");
      if (urlParts[1]) {
        await supabase.storage.from("card-attachments").remove([decodeURIComponent(urlParts[1])]);
      }
      const { error } = await supabase.from("card_attachments").delete().eq("id", att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Anexo removido");
    },
    onError: () => toast.error("Erro ao remover anexo"),
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
              <>
                <ReminderPicker cardId={cardId!} dueDate={card.due_date} />
                <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => updateCard.mutate({ due_date: null })}>
                  Remover data
                </Button>
              </>
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

          {/* Members */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Membros</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {allBoardUsers
                .filter((u: any) => cardMemberIds.includes(u.user_id))
                .map((u: any) => (
                  <Badge
                    key={u.user_id}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-destructive/10"
                    onClick={() => toggleMember.mutate(u.user_id)}
                  >
                    {u.full_name || u.email} ×
                  </Badge>
                ))}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Adicionar membro
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="start">
                <p className="text-xs font-medium mb-2">Membros do board</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {allBoardUsers.map((u: any) => (
                    <button
                      key={u.user_id}
                      onClick={() => toggleMember.mutate(u.user_id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors",
                        cardMemberIds.includes(u.user_id) ? "bg-muted ring-1 ring-primary/30" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{u.full_name || u.email}</span>
                      {cardMemberIds.includes(u.user_id) && <CheckSquare className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
                    </button>
                  ))}
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

          {/* Diagram link is now a direct redirect - no preview dialog */}

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

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Anexos</span>
                {attachments.length > 0 && (
                  <span className="text-xs text-muted-foreground">({attachments.length})</span>
                )}
              </div>
              <label className="cursor-pointer">
                <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "Enviando..." : "Adicionar"}
                </span>
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att: any) => {
                  const isImage = att.mime_type?.startsWith("image/");
                  return (
                    <div key={att.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30 group">
                      {isImage ? (
                        <img src={att.url} alt={att.name} className="w-16 h-12 object-cover rounded shrink-0" />
                      ) : (
                        <div className="w-16 h-12 flex items-center justify-center rounded bg-muted shrink-0">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{att.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {att.created_at && format(new Date(att.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted transition-colors" title="Download">
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                      <button onClick={() => deleteAttachment.mutate({ id: att.id, url: att.url })} className="p-1.5 rounded hover:bg-destructive/10 transition-colors" title="Excluir">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
                  <p className="text-sm whitespace-pre-wrap">
                    {renderCommentWithMentions(c.content)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <MentionInput
                value={newComment}
                onChange={setNewComment}
                onSubmit={() => { if (newComment.trim()) addComment.mutate(newComment.trim()); }}
                users={mentionUsers}
                placeholder="Escreva um comentário... Use @ para mencionar"
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

          {/* Activity Feed - collapsible */}
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Atividade</span>
              <span className="text-[10px] text-muted-foreground ml-auto group-open:rotate-90 transition-transform">▶</span>
            </summary>
            <div className="mt-2">
              <CardActivityFeed cardId={cardId!} />
            </div>
          </details>

          {/* Card actions */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {/* Copy card */}
              <Popover open={showCopyCard} onOpenChange={setShowCopyCard}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <p className="text-xs font-medium mb-3">Copiar card</p>
                  <div className="space-y-2 mb-3">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox checked={copyChecklists} onCheckedChange={(v) => setCopyChecklists(!!v)} />
                      Copiar checklists ({checklists.length})
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox checked={copyLabels} onCheckedChange={(v) => setCopyLabels(!!v)} />
                      Copiar labels ({cardLabelIds.length})
                    </label>
                  </div>
                  <Button size="sm" className="w-full h-7 text-xs" onClick={() => copyCardMut.mutate()} disabled={copyCardMut.isPending}>
                    {copyCardMut.isPending ? "Copiando..." : "Criar cópia"}
                  </Button>
                </PopoverContent>
              </Popover>

              {/* Move card */}
              <Popover open={showMoveCard} onOpenChange={(o) => { setShowMoveCard(o); if (!o) { setMoveTargetBoardId(""); setMoveTargetColumns([]); } }}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Mover
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <p className="text-xs font-medium mb-3">Mover para outro board</p>
                  <div className="space-y-2 mb-3">
                    <Select value={moveTargetBoardId} onValueChange={loadTargetColumns}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar board..." />
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
                          <SelectValue placeholder="Selecionar coluna..." />
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
                    className="w-full h-7 text-xs"
                    disabled={!moveTargetColumnId || moveCardToBoardMut.isPending}
                    onClick={() => moveCardToBoardMut.mutate()}
                  >
                    {moveCardToBoardMut.isPending ? "Movendo..." : "Mover card"}
                  </Button>
                </PopoverContent>
              </Popover>
            </div>

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
