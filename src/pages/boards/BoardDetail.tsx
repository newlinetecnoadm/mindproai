import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCardActivity } from "@/hooks/useCardActivity";
import { useNotifications } from "@/hooks/useNotifications";
import { usePlanLimits } from "@/hooks/usePlanLimits";
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
import NotificationBell from "@/components/notifications/NotificationBell";
import BoardThemePicker, { applyBoardTheme, removeBoardTheme } from "@/components/boards/BoardThemePicker";
import AIBoardAssistDialog from "@/components/boards/AIBoardAssistDialog";
import type { ColumnData } from "@/components/kanban/KanbanColumn";
import type { CardData } from "@/components/kanban/KanbanCard";
import { AnimatePresence } from "framer-motion";

const BoardDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const limits = usePlanLimits();
  const [boardTitle, setBoardTitle] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BoardFilterState>(EMPTY_FILTERS);
  const [activePanel, setActivePanel] = useState<"inbox" | "planner" | null>(null);
  const [realtimeHighlightedCards, setRealtimeHighlightedCards] = useState<Set<string>>(new Set());
  const { logActivity } = useCardActivity();
  const { createNotification } = useNotifications();

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

  // Apply dark theme + board theme
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
      removeBoardTheme();
    };
  }, []);

  useEffect(() => {
    if (board) {
      setBoardTitle(board.title);
      applyBoardTheme((board as any).theme || "default");
    }
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
        .from("board_cards").select("*").eq("board_id", id!).eq("is_archived" as any, false).order("position");
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
  const cardIds = cards.map((c) => c.id);
  const { data: labelAssignments = [] } = useQuery({
    queryKey: ["board-label-assignments", id, cardIds],
    enabled: !!id && cardIds.length > 0,
    queryFn: async () => {
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
        .from("user_profiles").select("user_id, full_name, email, avatar_url").in("user_id", allUserIds);
      return profiles || [];
    },
  });

  // Fetch card member assignments for filtering
  const { data: cardMembers = [] } = useQuery({
    queryKey: ["board-card-members", id, cardIds],
    enabled: !!id && cardIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_members").select("card_id, user_id").in("card_id", cardIds);
      if (error) throw error;
      return data;
    },
  });

  // Build card→labels map for display on cards
  const labelsMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string | null; color: string }[]>();
    for (const a of labelAssignments) {
      const label = boardLabels.find((l: any) => l.id === (a as any).label_id);
      if (label) {
        const cardId = (a as any).card_id;
        if (!map.has(cardId)) map.set(cardId, []);
        map.get(cardId)!.push({ id: label.id, name: label.name, color: label.color });
      }
    }
    return map;
  }, [labelAssignments, boardLabels]);

  // Build card→members map for display on cards
  const membersMap = useMemo(() => {
    const map = new Map<string, { user_id: string; full_name: string | null; email: string | null; avatar_url?: string | null }[]>();
    for (const cm of cardMembers) {
      const profile = boardMembers.find((p: any) => p.user_id === (cm as any).user_id);
      const cardId = (cm as any).card_id;
      if (!map.has(cardId)) map.set(cardId, []);
      map.get(cardId)!.push({
        user_id: (cm as any).user_id,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        avatar_url: (profile as any)?.avatar_url ?? null,
      });
    }
    return map;
  }, [cardMembers, boardMembers]);

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

  // Realtime sync for board columns/cards/theme
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`board-realtime-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "board_cards", filter: `board_id=eq.${id}` },
        (payload) => {
          const rowId = (payload.new as { id?: string } | null)?.id ?? (payload.old as { id?: string } | null)?.id;
          if (!rowId) return;

          // Highlight remotely updated cards
          if (payload.eventType !== "DELETE") {
            setRealtimeHighlightedCards((prev) => {
              const next = new Set(prev);
              next.add(rowId);
              return next;
            });
            setTimeout(() => {
              setRealtimeHighlightedCards((prev) => {
                const next = new Set(prev);
                next.delete(rowId);
                return next;
              });
            }, 1500);
          }

          queryClient.setQueryData<CardData[]>(["board-cards", id], (old = []) => {
            if (!rowId) return old;

            if (payload.eventType === "DELETE") {
              return old.filter((c) => c.id !== rowId);
            }

            const nextRow = payload.new as CardData;
            const existingIndex = old.findIndex((c) => c.id === rowId);
            if (existingIndex === -1) return [...old, nextRow];

            const next = [...old];
            next[existingIndex] = nextRow;
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "board_columns", filter: `board_id=eq.${id}` },
        (payload) => {
          queryClient.setQueryData<ColumnData[]>(["board-columns", id], (old = []) => {
            const rowId = (payload.new as { id?: string } | null)?.id ?? (payload.old as { id?: string } | null)?.id;
            if (!rowId) return old;

            if (payload.eventType === "DELETE") {
              return old.filter((c) => c.id !== rowId);
            }

            const nextRow = payload.new as ColumnData;
            const existingIndex = old.findIndex((c) => c.id === rowId);
            if (existingIndex === -1) return [...old, nextRow];

            const next = [...old];
            next[existingIndex] = nextRow;
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "boards", filter: `id=eq.${id}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated?.theme) {
            applyBoardTheme(updated.theme);
          }
          queryClient.setQueryData(["board", id], (old: any) => old ? { ...old, ...updated } : updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

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
      const { data: newCard, error } = await supabase.from("board_cards").insert({ board_id: id!, column_id: columnId, title, position: columnCards.length }).select("id").single();
      if (error) throw error;
      if (newCard) await logActivity(newCard.id, "created");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-cards", id] }),
    onError: () => toast.error("Erro ao criar card"),
  });

  const moveCardMut = useMutation({
    mutationFn: async ({ cardId, newColumnId, newPosition }: { cardId: string; newColumnId: string; newPosition: number }) => {
      const oldCard = cards.find((c) => c.id === cardId);
      const oldCol = columns.find((c) => c.id === oldCard?.column_id);
      const newCol = columns.find((c) => c.id === newColumnId);

      const { error } = await supabase.from("board_cards").update({ column_id: newColumnId, position: newPosition }).eq("id", cardId);
      if (error) throw error;

      const targetCards = cards
        .filter((c) => c.column_id === newColumnId && c.id !== cardId)
        .sort((a, b) => a.position - b.position);

      for (let i = 0; i < targetCards.length; i++) {
        const pos = i >= newPosition ? i + 1 : i;
        if (targetCards[i].position !== pos) {
          await supabase.from("board_cards").update({ position: pos }).eq("id", targetCards[i].id);
        }
      }

      if (oldCol && newCol && oldCol.id !== newCol.id) {
        await logActivity(cardId, "moved", { from: oldCol.title, to: newCol.title });
        const boardUrl = `${window.location.origin}/boards/${id}`;
        const { data: members } = await supabase.from("board_members").select("user_id").eq("board_id", id!);
        const { data: boardData } = await supabase.from("boards").select("user_id").eq("id", id!).single();
        const allUserIds = [...new Set([boardData?.user_id, ...(members || []).map((m: any) => m.user_id)].filter(Boolean))] as string[];

        supabase.functions.invoke("notify-board-event", {
          body: {
            type: "card_moved",
            user_ids: allUserIds,
            data: { card_title: oldCard?.title || "", from_column: oldCol.title, to_column: newCol.title, board_url: boardUrl },
          },
        }).catch(() => {});

        const cardTitle = oldCard?.title || "Card";
        for (const uid of allUserIds) {
          if (uid === user?.id) continue;
          supabase.from("notifications").insert({
            user_id: uid,
            type: "card_moved",
            title: `"${cardTitle}" movido de ${oldCol.title} para ${newCol.title}`,
            board_id: id,
            card_id: cardId,
          }).then(() => {});
        }
      }
    },
    onMutate: async ({ cardId, newColumnId, newPosition }) => {
      await queryClient.cancelQueries({ queryKey: ["board-cards", id] });
      const previous = queryClient.getQueryData<CardData[]>(["board-cards", id]);

      queryClient.setQueryData<CardData[]>(["board-cards", id], (old = []) => {
        const movingCard = old.find((c) => c.id === cardId);
        if (!movingCard) return old;

        const sourceColumnId = movingCard.column_id;
        const withoutMoving = old.filter((c) => c.id !== cardId).map((c) => ({ ...c }));

        const targetCards = withoutMoving
          .filter((c) => c.column_id === newColumnId)
          .sort((a, b) => a.position - b.position);

        const insertAt = Math.max(0, Math.min(newPosition, targetCards.length));
        const movedCard: CardData = { ...movingCard, column_id: newColumnId, position: insertAt };

        targetCards.splice(insertAt, 0, movedCard);

        const targetIds = new Set(targetCards.map((c) => c.id));
        let next = [
          ...withoutMoving.filter((c) => !targetIds.has(c.id)),
          ...targetCards.map((c, index) => ({ ...c, position: index })),
        ];

        if (sourceColumnId !== newColumnId) {
          const sourceCards = next
            .filter((c) => c.column_id === sourceColumnId)
            .sort((a, b) => a.position - b.position)
            .map((c, index) => ({ ...c, position: index }));

          const sourceIds = new Set(sourceCards.map((c) => c.id));
          next = [
            ...next.filter((c) => !sourceIds.has(c.id)),
            ...sourceCards,
          ];
        }

        return next;
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["board-cards", id], context.previous);
      toast.error("Erro ao mover card");
    },
  });

  const reorderCardsMut = useMutation({
    mutationFn: async ({ cardIds }: { columnId: string; cardIds: string[] }) => {
      await Promise.all(cardIds.map((cid, i) => supabase.from("board_cards").update({ position: i }).eq("id", cid)));
    },
    onMutate: async ({ columnId, cardIds }) => {
      await queryClient.cancelQueries({ queryKey: ["board-cards", id] });
      const previous = queryClient.getQueryData<CardData[]>(["board-cards", id]);
      const orderMap = new Map(cardIds.map((cardId, index) => [cardId, index]));

      queryClient.setQueryData<CardData[]>(["board-cards", id], (old = []) =>
        old.map((c) => {
          if (c.column_id !== columnId) return c;
          const index = orderMap.get(c.id);
          return index === undefined ? c : { ...c, position: index };
        })
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["board-cards", id], context.previous);
      toast.error("Erro ao reordenar cards");
    },
  });

  const reorderColumnsMut = useMutation({
    mutationFn: async (columnIds: string[]) => {
      await Promise.all(columnIds.map((cid, i) => supabase.from("board_columns").update({ position: i }).eq("id", cid)));
    },
    onMutate: async (columnIds) => {
      await queryClient.cancelQueries({ queryKey: ["board-columns", id] });
      const previous = queryClient.getQueryData<ColumnData[]>(["board-columns", id]);
      const orderMap = new Map(columnIds.map((columnId, index) => [columnId, index]));

      queryClient.setQueryData<ColumnData[]>(["board-columns", id], (old = []) =>
        old.map((column) => {
          const index = orderMap.get(column.id);
          return index === undefined ? column : { ...column, position: index };
        })
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["board-columns", id], context.previous);
      toast.error("Erro ao reordenar colunas");
    },
  });

  const updateTitleMut = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("boards").update({ title }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  });

  const updateThemeMut = useMutation({
    mutationFn: async (theme: string) => {
      const { error } = await supabase.from("boards").update({ theme } as any).eq("id", id!);
      if (error) throw error;
    },
    onMutate: async (theme: string) => {
      await queryClient.cancelQueries({ queryKey: ["board", id] });
      const previous = queryClient.getQueryData(["board", id]);
      queryClient.setQueryData(["board", id], (old: any) => old ? { ...old, theme } : old);
      applyBoardTheme(theme);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["board", id], context.previous);
      toast.error("Erro ao salvar tema");
    },
  });

  // Handle inbox item drop onto a column
  const handleDropInboxItem = useCallback(async (columnId: string, item: { id: string; title: string }) => {
    const columnCards = cards.filter((c) => c.column_id === columnId);
    const { data: newCard, error } = await supabase.from("board_cards").insert({
      board_id: id!,
      column_id: columnId,
      title: item.title,
      position: columnCards.length,
    }).select("id").single();
    if (error) {
      toast.error("Erro ao criar card");
      return;
    }
    await supabase.from("inbox_items").delete().eq("id", item.id);
    if (newCard) await logActivity(newCard.id, "created");
    queryClient.invalidateQueries({ queryKey: ["board-cards", id] });
    queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
    toast.success("Item movido para o board");
  }, [cards, id, logActivity, queryClient]);

  // AI: apply generated board structure
  const handleAIApply = useCallback(async (generatedColumns: { title: string; cards: { title: string; description?: string }[] }[]) => {
    for (let i = 0; i < generatedColumns.length; i++) {
      const col = generatedColumns[i];
      const { data: newCol, error: colErr } = await supabase
        .from("board_columns")
        .insert({ board_id: id!, title: col.title, position: columns.length + i })
        .select("id")
        .single();
      if (colErr || !newCol) continue;

      for (let j = 0; j < col.cards.length; j++) {
        const card = col.cards[j];
        await supabase.from("board_cards").insert({
          board_id: id!,
          column_id: newCol.id,
          title: card.title,
          description: card.description || null,
          position: j,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["board-columns", id] });
    queryClient.invalidateQueries({ queryKey: ["board-cards", id] });
  }, [id, columns.length, queryClient]);

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
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          {limits.aiGeneration && <AIBoardAssistDialog boardId={id!} onApply={handleAIApply} />}
          <BoardThemePicker
            currentTheme={(board as any).theme || "default"}
            onThemeChange={(themeId) => updateThemeMut.mutate(themeId)}
          />
          <ShareBoardDialog boardId={id!} boardTitle={board.title} />
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
            <InboxPanel onClose={() => setActivePanel(null)} boardId={id} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activePanel === "planner" && (
            <PlannerPanel onClose={() => setActivePanel(null)} />
          )}
        </AnimatePresence>

        {/* Board */}
        <div
          id="board-theme-container"
          className="flex-1 overflow-hidden"
        >
          <KanbanBoard
            columns={columns}
            cards={filteredCards}
            onAddCard={(columnId, title) => addCardMut.mutate({ columnId, title })}
            onMoveCard={(cardId, newColumnId, newPosition) => moveCardMut.mutate({ cardId, newColumnId, newPosition })}
            onReorderCards={(columnId, cardIds) => reorderCardsMut.mutate({ columnId, cardIds })}
            onReorderColumns={(columnIds) => reorderColumnsMut.mutate(columnIds)}
            onCardClick={(card) => setSelectedCardId(card.id)}
            onAddColumn={(title) => addColumnMut.mutate(title)}
            onDeleteColumn={(columnId) => deleteColumnMut.mutate(columnId)}
            onRenameColumn={(columnId, title) => renameColumnMut.mutate({ columnId, title })}
            onDropInboxItem={handleDropInboxItem}
            highlightedCardIds={realtimeHighlightedCards}
            labelsMap={labelsMap}
            membersMap={membersMap}
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
