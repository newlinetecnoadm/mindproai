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
import { arrayMove, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
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
  onReorderColumns?: (columnIds: string[]) => void;
  onDropInboxItem?: (columnId: string, item: { id: string; title: string }) => void;
  highlightedCardIds?: Set<string>;
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
  onReorderColumns,
  onDropInboxItem,
}: KanbanBoardProps) => {
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnData | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getColumnCards = useCallback(
    (columnId: string) => cards.filter((c) => c.column_id === columnId).sort((a, b) => a.position - b.position),
    [cards]
  );

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "column-sortable") {
      const col = sortedColumns.find((c) => c.id === active.data.current?.columnId);
      if (col) setActiveColumn(col);
    } else {
      const card = cards.find((c) => c.id === active.id);
      if (card) setActiveCard(card);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // handled in dragEnd
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset overlays
    setActiveCard(null);
    setActiveColumn(null);

    if (!over) return;

    // Column reorder
    if (active.data.current?.type === "column-sortable") {
      if (over.data.current?.type === "column-sortable") {
        const oldIndex = sortedColumns.findIndex((c) => c.id === active.data.current?.columnId);
        const newIndex = sortedColumns.findIndex((c) => c.id === over.data.current?.columnId);
        if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(sortedColumns, oldIndex, newIndex);
          onReorderColumns?.(reordered.map((c) => c.id));
        }
      }
      return;
    }

    // Card drag logic
    const activeCardData = cards.find((c) => c.id === active.id);
    if (!activeCardData) return;

    let targetColumnId: string;
    let targetCardId: string | null = null;

    if (over.data.current?.type === "column") {
      targetColumnId = over.data.current.columnId;
    } else if (over.data.current?.type === "column-sortable") {
      targetColumnId = over.data.current.columnId;
    } else {
      const overCard = cards.find((c) => c.id === over.id);
      if (!overCard) return;
      targetColumnId = overCard.column_id;
      targetCardId = overCard.id;
    }

    if (activeCardData.column_id === targetColumnId) {
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
      const targetCards = getColumnCards(targetColumnId);
      const newPosition = targetCardId
        ? targetCards.findIndex((c) => c.id === targetCardId)
        : targetCards.length;
      onMoveCard(activeCardData.id, targetColumnId, newPosition);
    }
  };

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      onAddColumn(newColumnTitle.trim());
      setNewColumnTitle("");
      setAddingColumn(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-6 overflow-x-auto h-full items-start">
        <SortableContext items={sortedColumns.map((c) => `col-${c.id}`)} strategy={horizontalListSortingStrategy}>
          {sortedColumns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={getColumnCards(col.id)}
              onAddCard={onAddCard}
              onCardClick={onCardClick}
              onDeleteColumn={onDeleteColumn}
              onRenameColumn={onRenameColumn}
              onDropInboxItem={onDropInboxItem}
            />
          ))}
        </SortableContext>

        {/* Add column */}
        {addingColumn ? (
          <div className="w-72 shrink-0 p-3 bg-secondary/80 rounded-xl border border-border space-y-2">
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
        {activeColumn && (
          <div className="rotate-2 opacity-80 w-72">
            <div className="bg-secondary/90 rounded-xl border border-border p-3">
              <h3 className="text-sm font-semibold text-foreground">{activeColumn.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{getColumnCards(activeColumn.id).length} cards</p>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
