import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import KanbanColumn, { type ColumnData } from "./KanbanColumn";
import KanbanCard, { type CardData, type CardLabel, type CardMemberProfile } from "./KanbanCard";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  labelsMap?: Map<string, CardLabel[]>;
  membersMap?: Map<string, CardMemberProfile[]>;
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
  highlightedCardIds,
  labelsMap,
  membersMap,
}: KanbanBoardProps) => {
  const isMobile = useIsMobile();
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnData | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
  const [activeTab, setActiveTab] = useState<string>(sortedColumns[0]?.id || "");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getColumnCards = useCallback(
    (columnId: string) => cards.filter((c) => c.column_id === columnId).sort((a, b) => a.position - b.position),
    [cards]
  );

  const collisionDetectionStrategy = useCallback(
    (args: any) => {
      if (activeColumn) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container: any) => container.data.current?.type === "column-sortable" || container.data.current?.type === "column"
          ),
        });
      }
      return closestCorners(args);
    },
    [activeColumn]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;
    console.log("Drag Start:", { id: active.id, type, data: active.data.current });

    if (type === "column-sortable") {
      const colId = active.data.current?.columnId;
      const col = sortedColumns.find((c) => c.id === colId);
      if (col) {
        console.log("Active column set:", col.title);
        setActiveColumn(col);
      } else {
        console.warn("Could not find active column with ID:", colId);
      }
    } else {
      const card = cards.find((c) => c.id === active.id);
      if (card) {
        console.log("Active card set:", card.title);
        setActiveCard(card);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (active.data.current?.type === "column-sortable" && over) {
       // Debugging column hover
       // console.log("Column hovering over:", over.id, over.data.current?.type);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log("Drag End:", { 
      activeId: active.id, 
      activeType: active.data.current?.type,
      overId: over?.id, 
      overType: over?.data.current?.type,
      overData: over?.data.current
    });

    // Reset overlays
    setActiveCard(null);
    setActiveColumn(null);

    if (!over) {
      console.log("Drag ended over nothing");
      return;
    }

    // Column reorder
    if (active.data.current?.type === "column-sortable") {
      const overData = over.data.current;
      let overColumnId: string | undefined;

      if (overData?.type === "column-sortable" || overData?.type === "column") {
        overColumnId = overData.columnId;
      } else if (overData?.type === "card") {
        overColumnId = overData.card.column_id;
      }

      // Fallback: extract from ID strings if data attributes are missing
      if (!overColumnId && typeof over.id === "string") {
        overColumnId = over.id.replace(/^col-|^column-/, "");
      }

      console.log("Target column ID for reorder:", overColumnId);
      
      const activeData = active.data.current;
      let activeColumnId = activeData?.columnId;
      
      if (!activeColumnId && typeof active.id === "string") {
        activeColumnId = active.id.replace(/^col-|^column-/, "");
      }

      if (activeColumnId && overColumnId) {
        const oldIndex = sortedColumns.findIndex((c) => c.id === activeColumnId);
        const newIndex = sortedColumns.findIndex((c) => c.id === overColumnId);

        console.log("Reorder indexes:", { oldIndex, newIndex, activeColumnId, overColumnId });

        if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(sortedColumns, oldIndex, newIndex);
          console.log("Calling onReorderColumns with:", reordered.map(c => c.title));
          onReorderColumns?.(reordered.map((c) => c.id));
        } else {
          console.log("Skipping reorder: same index or column not found");
        }
      } else {
        console.warn("Missing Column IDs for reorder:", { activeColumnId, overColumnId });
      }
      return;
    }

    // Card drag logic
    const activeCardData = cards.find((c) => c.id === active.id);
    if (!activeCardData) {
      console.warn("Active card not found in cards array:", active.id);
      return;
    }

    let targetColumnId: string;
    let targetCardId: string | null = null;

    if (over.data.current?.type === "column") {
      targetColumnId = over.data.current.columnId;
    } else if (over.data.current?.type === "column-sortable") {
      targetColumnId = over.data.current.columnId;
    } else if (over.data.current?.type === "card") {
      targetColumnId = over.data.current.card.column_id;
      targetCardId = over.data.current.card.id;
    } else {
      console.log("Dragged card over unknown target type:", over.data.current?.type);
      return;
    }

    console.log("Card target column:", targetColumnId, "Target card:", targetCardId);

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

  if (isMobile) {
    return (
      <div className="h-full flex flex-col w-full overflow-x-hidden">
        <Tabs value={activeTab || sortedColumns[0]?.id} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden px-4 pb-20"> {/* Margin for floating nav and bottom tabs */}
            {sortedColumns.map((col) => (
              <TabsContent key={col.id} value={col.id} className="h-full mt-0 focus-visible:ring-0">
                <KanbanColumn
                  column={col}
                  cards={getColumnCards(col.id)}
                  onAddCard={onAddCard}
                  onCardClick={onCardClick}
                  onDeleteColumn={onDeleteColumn}
                  onRenameColumn={onRenameColumn}
                  onDropInboxItem={onDropInboxItem}
                  highlightedCardIds={highlightedCardIds}
                  labelsMap={labelsMap}
                  membersMap={membersMap}
                />
              </TabsContent>
            ))}
          </div>

          <div className="bg-background/80 backdrop-blur-xl border-t border-border/50 pb-safe z-40 shrink-0">
            <TabsList className="bg-transparent justify-start px-4 h-16 overflow-x-auto overflow-y-hidden no-scrollbar gap-3 py-2">
              {sortedColumns.map((col) => (
                <TabsTrigger
                  key={col.id}
                  value={col.id}
                  className="rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/50 transition-all shadow-sm shrink-0 h-10 min-w-[90px]"
                >
                  {col.title}
                </TabsTrigger>
              ))}
              <button
                onClick={() => setAddingColumn(true)}
                className="flex items-center justify-center w-10 h-10 rounded-xl border-2 border-dashed border-border text-muted-foreground shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </TabsList>
          </div>
        </Tabs>

        {addingColumn && (
          <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-sm p-4 bg-card rounded-2xl border border-border shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold">Nova Coluna</h3>
              <Input
                placeholder="Nome da coluna..."
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") setAddingColumn(false);
                }}
                autoFocus
                className="h-12 text-base rounded-xl"
              />
              <div className="flex gap-3">
                <Button className="flex-1 h-11 rounded-xl font-bold" onClick={handleAddColumn}>
                  Adicionar
                </Button>
                <Button variant="ghost" className="flex-1 h-11 rounded-xl" onClick={() => setAddingColumn(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn("flex gap-4 p-6 overflow-x-auto h-full items-start", activeColumn && "is-dragging-column")}>
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
              highlightedCardIds={highlightedCardIds}
              labelsMap={labelsMap}
              membersMap={membersMap}
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
