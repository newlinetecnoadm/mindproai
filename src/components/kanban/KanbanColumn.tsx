import { useDroppable } from "@dnd-kit/core";
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
}

const KanbanColumn = ({ column, cards, onAddCard, onCardClick, onDeleteColumn, onRenameColumn, onDropInboxItem }: KanbanColumnProps) => {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [columnTitle, setColumnTitle] = useState(column.title);

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

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
    <div className={cn(
      "flex flex-col w-72 shrink-0 bg-muted/50 rounded-xl border border-border",
      isOver && "ring-2 ring-primary/30"
    )}>
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        {editingTitle ? (
          <Input
            value={columnTitle}
            onChange={(e) => setColumnTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="h-7 text-sm font-semibold"
            autoFocus
          />
        ) : (
          <h3
            className="text-sm font-semibold truncate cursor-pointer hover:text-primary transition-colors"
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
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
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
