import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import KanbanCard, { type CardData } from "./KanbanCard";
import { useState } from "react";

export interface ColumnData {
  id: string;
  title: string;
  position: number;
}

interface KanbanColumnProps {
  column: ColumnData;
  cards: CardData[];
  onAddCard: (columnId: string, title: string) => void;
  onCardClick?: (card: CardData) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDropInboxItem?: (columnId: string, item: { id: string; title: string }) => void;
  highlightedCardIds?: Set<string>;
}

const KanbanColumn = ({ column, cards, onAddCard, onCardClick, onDeleteColumn, onRenameColumn, onDropInboxItem, highlightedCardIds }: KanbanColumnProps) => {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [columnTitle, setColumnTitle] = useState(column.title);

  const [nativeDragOver, setNativeDragOver] = useState(false);

  // Sortable for column reordering
  const {
    attributes: sortableAttributes,
    listeners: sortableListeners,
    setNodeRef: setSortableRef,
    transform,
    transition: sortableTransition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: `col-${column.id}`,
    data: { type: "column-sortable", columnId: column.id },
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition: sortableTransition,
  };

  // Droppable for cards
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  const handleNativeDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/inbox-item")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setNativeDragOver(true);
    }
  };

  const handleNativeDragLeave = () => setNativeDragOver(false);

  const handleNativeDrop = (e: React.DragEvent) => {
    setNativeDragOver(false);
    const data = e.dataTransfer.getData("application/inbox-item");
    if (data && onDropInboxItem) {
      try {
        const item = JSON.parse(data);
        onDropInboxItem(column.id, item);
      } catch {}
    }
  };

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      onAddCard(column.id, newCardTitle.trim());
      setNewCardTitle("");
      setAddingCard(false);
    }
  };

  const handleRename = () => {
    if (columnTitle.trim() && columnTitle !== column.title) {
      onRenameColumn(column.id, columnTitle.trim());
    }
    setEditingTitle(false);
  };

  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  return (
    <div
      ref={setSortableRef}
      style={sortableStyle}
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-xl border transition-all",
        "bg-secondary/70 border-border/60",
        (isOver || nativeDragOver) && "ring-2 ring-primary/30",
        isColumnDragging && "opacity-40"
      )}
      onDragOver={handleNativeDragOver}
      onDragLeave={handleNativeDragLeave}
      onDrop={handleNativeDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
        {editingTitle ? (
          <Input
            value={columnTitle}
            onChange={(e) => setColumnTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="h-7 text-sm font-semibold flex-1"
            autoFocus
          />
        ) : (
          <h3
            {...sortableAttributes}
            {...sortableListeners}
            className="text-sm font-semibold truncate cursor-grab active:cursor-grabbing hover:text-primary transition-colors flex-1"
            onDoubleClick={() => setEditingTitle(true)}
          >
            {column.title}
          </h3>
        )}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">{cards.length}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingTitle(true)}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => { if (confirm("Excluir coluna e todos os cards?")) onDeleteColumn(column.id); }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cards */}
      <div ref={setDropRef} className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        <SortableContext items={sortedCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {sortedCards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={() => onCardClick?.(card)} />
          ))}
        </SortableContext>

        {addingCard ? (
          <div className="space-y-2">
            <Input
              placeholder="Título do card..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCard();
                if (e.key === "Escape") setAddingCard(false);
              }}
              autoFocus
              className="text-sm h-9"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="hero" className="h-7 text-xs" onClick={handleAddCard}>
                Adicionar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingCard(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="w-full flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Adicionar card
          </button>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
