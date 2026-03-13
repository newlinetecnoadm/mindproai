import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import KanbanColumn, { type ColumnData } from "./KanbanColumn";
import KanbanCard, { type CardData } from "./KanbanCard";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KanbanBoardProps {
  columns: ColumnData[];
  cards: CardData[];
  onAddCard: (columnId: string, title: string) => void;
  onMoveCard: (cardId: string, newColumnId: string, newPosition: number) => void;
  onReorderCards: (columnId: string, cardIds: string[]) => void;
  onCardClick?: (card: CardData) => void;
  onAddColumn: (title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDropInboxItem?: (columnId: string, item: { id: string; title: string }) => void;
}

const KanbanBoard = ({
  columns,
  cards,
  onAddCard,
  onMoveCard,
  onReorderCards,
  onCardClick,
  onAddColumn,
  onDeleteColumn,
  onRenameColumn,
  onDropInboxItem,
}: KanbanBoardProps) => {
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getColumnCards = useCallback(
    (columnId: string) => cards.filter((c) => c.column_id === columnId).sort((a, b) => a.position - b.position),
    [cards]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    if (card) setActiveCard(card);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // handled in dragEnd
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    // Determine target column
    let targetColumnId: string;
    let targetCardId: string | null = null;

    if (over.data.current?.type === "column") {
      targetColumnId = over.data.current.columnId;
    } else {
      // Dropped on a card
      const overCard = cards.find((c) => c.id === over.id);
      if (!overCard) return;
      targetColumnId = overCard.column_id;
      targetCardId = overCard.id;
    }

    if (activeCard.column_id === targetColumnId) {
      // Reorder within same column
      const columnCards = getColumnCards(targetColumnId);
      const oldIndex = columnCards.findIndex((c) => c.id === active.id);
      const newIndex = targetCardId
        ? columnCards.findIndex((c) => c.id === targetCardId)
        : columnCards.length;

      if (oldIndex !== newIndex && oldIndex !== -1) {
        const reordered = arrayMove(columnCards, oldIndex, newIndex);
        onReorderCards(targetColumnId, reordered.map((c) => c.id));
      }
    } else {
      // Move to different column
      const targetCards = getColumnCards(targetColumnId);
      const newPosition = targetCardId
        ? targetCards.findIndex((c) => c.id === targetCardId)
        : targetCards.length;
      onMoveCard(activeCard.id, targetColumnId, newPosition);
    }
  };

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      onAddColumn(newColumnTitle.trim());
      setNewColumnTitle("");
      setAddingColumn(false);
    }
  };

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-6 overflow-x-auto h-full items-start">
        {sortedColumns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            cards={getColumnCards(col.id)}
            onAddCard={onAddCard}
            onCardClick={onCardClick}
            onDeleteColumn={onDeleteColumn}
            onRenameColumn={onRenameColumn}
          />
        ))}

        {/* Add column */}
        {addingColumn ? (
          <div className="w-72 shrink-0 p-3 bg-muted/50 rounded-xl border border-border space-y-2">
            <Input
              placeholder="Nome da coluna..."
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddColumn();
                if (e.key === "Escape") setAddingColumn(false);
              }}
              autoFocus
              className="text-sm h-9"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="hero" className="h-7 text-xs" onClick={handleAddColumn}>
                Adicionar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingColumn(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingColumn(true)}
            className="w-72 shrink-0 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" /> Adicionar coluna
          </button>
        )}
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="rotate-3 opacity-90">
            <KanbanCard card={activeCard} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
