import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import CardDetailModal from "@/components/kanban/CardDetailModal";
import type { ColumnData } from "@/components/kanban/KanbanColumn";
import type { CardData } from "@/components/kanban/KanbanCard";

const BoardDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [boardTitle, setBoardTitle] = useState("");

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

  useEffect(() => {
    if (board) setBoardTitle(board.title);
  }, [board]);

  // Fetch columns
  const { data: columns = [] } = useQuery({
    queryKey: ["board-columns", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_columns")
        .select("*")
        .eq("board_id", id!)
        .order("position");
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
        .from("board_cards")
        .select("*")
        .eq("board_id", id!)
        .order("position");
      if (error) throw error;
      return data as CardData[];
    },
  });

  // Add column
  const addColumnMut = useMutation({
    mutationFn: async (title: string) => {
      const position = columns.length;
      const { error } = await supabase.from("board_columns").insert({
        board_id: id!,
        title,
        position,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-columns", id] }),
    onError: () => toast.error("Erro ao criar coluna"),
  });

  // Delete column
  const deleteColumnMut = useMutation({
    mutationFn: async (columnId: string) => {
      // Delete cards in column first
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

  // Rename column
  const renameColumnMut = useMutation({
    mutationFn: async ({ columnId, title }: { columnId: string; title: string }) => {
      const { error } = await supabase.from("board_columns").update({ title }).eq("id", columnId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-columns", id] }),
  });

  // Add card
  const addCardMut = useMutation({
    mutationFn: async ({ columnId, title }: { columnId: string; title: string }) => {
      const columnCards = cards.filter((c) => c.column_id === columnId);
      const position = columnCards.length;
      const { error } = await supabase.from("board_cards").insert({
        board_id: id!,
        column_id: columnId,
        title,
        position,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-cards", id] }),
    onError: () => toast.error("Erro ao criar card"),
  });

  // Move card to another column
  const moveCardMut = useMutation({
    mutationFn: async ({ cardId, newColumnId, newPosition }: { cardId: string; newColumnId: string; newPosition: number }) => {
      // Update card's column and position
      const { error } = await supabase
        .from("board_cards")
        .update({ column_id: newColumnId, position: newPosition })
        .eq("id", cardId);
      if (error) throw error;

      // Reposition other cards in target column
      const targetCards = cards
        .filter((c) => c.column_id === newColumnId && c.id !== cardId)
        .sort((a, b) => a.position - b.position);

      for (let i = 0; i < targetCards.length; i++) {
        const pos = i >= newPosition ? i + 1 : i;
        if (targetCards[i].position !== pos) {
          await supabase.from("board_cards").update({ position: pos }).eq("id", targetCards[i].id);
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-cards", id] }),
  });

  // Reorder cards within column
  const reorderCardsMut = useMutation({
    mutationFn: async ({ columnId, cardIds }: { columnId: string; cardIds: string[] }) => {
      const updates = cardIds.map((cardId, index) =>
        supabase.from("board_cards").update({ position: index }).eq("id", cardId)
      );
      await Promise.all(updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-cards", id] }),
  });

  // Update board title
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
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          columns={columns}
          cards={cards}
          onAddCard={(columnId, title) => addCardMut.mutate({ columnId, title })}
          onMoveCard={(cardId, newColumnId, newPosition) => moveCardMut.mutate({ cardId, newColumnId, newPosition })}
          onReorderCards={(columnId, cardIds) => reorderCardsMut.mutate({ columnId, cardIds })}
          onAddColumn={(title) => addColumnMut.mutate(title)}
          onDeleteColumn={(columnId) => deleteColumnMut.mutate(columnId)}
          onRenameColumn={(columnId, title) => renameColumnMut.mutate({ columnId, title })}
        />
      </div>
    </div>
  );
};

export default BoardDetail;
