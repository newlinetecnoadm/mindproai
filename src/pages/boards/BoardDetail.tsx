import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import CardDetailModal from "@/components/kanban/CardDetailModal";
import BoardFilters, { type BoardFilterState, EMPTY_FILTERS } from "@/components/kanban/BoardFilters";
import InboxPanel from "@/components/boards/InboxPanel";
import ShareBoardDialog from "@/components/boards/ShareBoardDialog";
import PlannerPanel from "@/components/boards/PlannerPanel";
import FloatingNavBar from "@/components/layout/FloatingNavBar";
import type { ColumnData } from "@/components/kanban/KanbanColumn";
import type { CardData } from "@/components/kanban/KanbanCard";
import { AnimatePresence } from "framer-motion";

const BoardDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [boardTitle, setBoardTitle] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BoardFilterState>(EMPTY_FILTERS);
  const [activePanel, setActivePanel] = useState<"inbox" | "planner" | null>(null);

  const handleTogglePanel = (panel: "inbox" | "planner") => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  // Fetch board
  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ["board", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("boards").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  // Apply dark theme only inside boards
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  useEffect(() => {
    if (board) setBoardTitle(board.title);
  }, [board]);

  // Fetch columns
  const { data: columns = [] } = useQuery({
    queryKey: ["board-columns", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_columns").select("*").eq("board_id", id!).order("position");
      if (error) throw error;
      return data as ColumnData[];
    },
  });

  // Fetch cards
  const { data: cards = [] } = useQuery({
    queryKey: ["board-cards", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_cards").select("*").eq("board_id", id!).order("position");
      if (error) throw error;
      return data as CardData[];
    },
  });

  // Fetch labels for filter UI
  const { data: boardLabels = [] } = useQuery({
    queryKey: ["board-labels", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("card_labels").select("*").eq("board_id", id!);
      if (error) throw error;
      return data;
    },
  });

  // Fetch label assignments for filtering
  const { data: labelAssignments = [] } = useQuery({
    queryKey: ["board-label-assignments", id],
    enabled: !!id,
    queryFn: async () => {
      const cardIds = cards.map((c) => c.id);
      if (!cardIds.length) return [];
      const { data, error } = await supabase
        .from("card_label_assignments").select("card_id, label_id").in("card_id", cardIds);
      if (error) throw error;
      return data;
    },
  });

  // Fetch members for filter UI
  const { data: boardMembers = [] } = useQuery({
    queryKey: ["board-members-profiles", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("board_members").select("user_id").eq("board_id", id!);
      if (error) throw error;
      const allUserIds = [...new Set([board?.user_id, ...members.map((m: any) => m.user_id)].filter(Boolean))] as string[];
      const { data: profiles } = await supabase
        .from("user_profiles").select("user_id, full_name, email").in("user_id", allUserIds);
      return profiles || [];
    },
  });

  // Fetch card member assignments for filtering
  const { data: cardMembers = [] } = useQuery({
    queryKey: ["board-card-members", id],
    enabled: !!id,
    queryFn: async () => {
      const cardIds = cards.map((c) => c.id);
      if (!cardIds.length) return [];
      const { data, error } = await supabase
        .from("card_members").select("card_id, user_id").in("card_id", cardIds);
      if (error) throw error;
      return data;
    },
  });

  // Filter cards
  const filteredCards = useMemo(() => {
    let result = cards;
    const { search, labelIds, dueDateFilter, memberIds } = filters;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }
    if (labelIds.length > 0) {
      const cardIdsWithLabel = new Set(
        labelAssignments.filter((a: any) => labelIds.includes(a.label_id)).map((a: any) => a.card_id)
      );
      result = result.filter((c) => cardIdsWithLabel.has(c.id));
    }
    if (dueDateFilter === "overdue") {
      const now = new Date();
      result = result.filter((c) => c.due_date && new Date(c.due_date) < now && !c.is_complete);
    } else if (dueDateFilter === "has_date") {
      result = result.filter((c) => !!c.due_date);
    } else if (dueDateFilter === "no_date") {
      result = result.filter((c) => !c.due_date);
    }
    if (memberIds.length > 0) {
      const cardIdsWithMember = new Set(
        cardMembers.filter((m: any) => memberIds.includes(m.user_id)).map((m: any) => m.card_id)
      );
      result = result.filter((c) => cardIdsWithMember.has(c.id));
    }
    return result;
  }, [cards, filters, labelAssignments, cardMembers]);

  // Mutations
  const addColumnMut = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("board_columns").insert({ board_id: id!, title, position: columns.length });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-columns", id] }),
    onError: () => toast.error("Erro ao criar coluna"),
  });

  const deleteColumnMut = useMutation({
    mutationFn: async (columnId: string) => {
      await supabase.from("board_cards").delete().eq("column_id", columnId);
      const { error } = await supabase.from("board_columns").delete().eq("id", columnId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-columns", id] });
      queryClient.invalidateQueries({ queryKey: ["board-cards", id] });
    },
    onError: () => toast.error("Erro ao excluir coluna"),
  });

  const renameColumnMut = useMutation({
    mutationFn: async ({ columnId, title }: { columnId: string; title: string }) => {
      const { error } = await supabase.from("board_columns").update({ title }).eq("id", columnId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-columns", id] }),
  });

  const addCardMut = useMutation({
    mutationFn: async ({ columnId, title }: { columnId: string; title: string }) => {
      const columnCards = cards.filter((c) => c.column_id === columnId);
      const { error } = await supabase.from("board_cards").insert({ board_id: id!, column_id: columnId, title, position: columnCards.length });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-cards", id] }),
    onError: () => toast.error("Erro ao criar card"),
  });

  const moveCardMut = useMutation({
    mutationFn: async ({ cardId, newColumnId, newPosition }: { cardId: string; newColumnId: string; newPosition: number }) => {
      const { error } = await supabase.from("board_cards").update({ column_id: newColumnId, position: newPosition }).eq("id", cardId);
      if (error) throw error;
      const targetCards = cards.filter((c) => c.column_id === newColumnId && c.id !== cardId).sort((a, b) => a.position - b.position);
      for (let i = 0; i < targetCards.length; i++) {
        const pos = i >= newPosition ? i + 1 : i;
        if (targetCards[i].position !== pos) {
          await supabase.from("board_cards").update({ position: pos }).eq("id", targetCards[i].id);
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-cards", id] }),
  });

  const reorderCardsMut = useMutation({
    mutationFn: async ({ columnId, cardIds }: { columnId: string; cardIds: string[] }) => {
      await Promise.all(cardIds.map((cid, i) => supabase.from("board_cards").update({ position: i }).eq("id", cid)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-cards", id] }),
  });

  const updateTitleMut = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("boards").update({ title }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  });

  if (boardLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Board não encontrado</p>
      </div>
    );
  }


  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/boards")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Input
          value={boardTitle}
          onChange={(e) => setBoardTitle(e.target.value)}
          onBlur={() => { if (boardTitle.trim() && boardTitle !== board.title) updateTitleMut.mutate(boardTitle); }}
          className="h-8 w-64 text-sm font-semibold border-none bg-transparent hover:bg-muted focus-visible:bg-muted"
        />
        <div className="ml-auto">
          <BoardFilters
            filters={filters}
            onChange={setFilters}
            labels={boardLabels}
            members={boardMembers}
          />
        </div>
      </div>

      {/* Main content with panels */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence>
          {activePanel === "inbox" && (
            <InboxPanel onClose={() => setActivePanel(null)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activePanel === "planner" && (
            <PlannerPanel onClose={() => setActivePanel(null)} />
          )}
        </AnimatePresence>

        {/* Board */}
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            columns={columns}
            cards={filteredCards}
            onAddCard={(columnId, title) => addCardMut.mutate({ columnId, title })}
            onMoveCard={(cardId, newColumnId, newPosition) => moveCardMut.mutate({ cardId, newColumnId, newPosition })}
            onReorderCards={(columnId, cardIds) => reorderCardsMut.mutate({ columnId, cardIds })}
            onCardClick={(card) => setSelectedCardId(card.id)}
            onAddColumn={(title) => addColumnMut.mutate(title)}
            onDeleteColumn={(columnId) => deleteColumnMut.mutate(columnId)}
            onRenameColumn={(columnId, title) => renameColumnMut.mutate({ columnId, title })}
          />
        </div>
      </div>

      <CardDetailModal
        cardId={selectedCardId}
        boardId={id!}
        open={!!selectedCardId}
        onOpenChange={(open) => { if (!open) setSelectedCardId(null); }}
        onCardUpdated={() => queryClient.invalidateQueries({ queryKey: ["board-cards", id] })}
      />

      {/* Floating nav within board */}
      <FloatingNavBar activePanel={activePanel} onTogglePanel={handleTogglePanel} />
    </div>
  );
};

export default BoardDetail;
