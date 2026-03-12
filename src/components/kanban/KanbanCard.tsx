import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical, Calendar, MessageSquare, Paperclip, CheckSquare } from "lucide-react";

export interface CardData {
  id: string;
  title: string;
  description?: string | null;
  column_id: string;
  position: number;
  due_date?: string | null;
  is_complete?: boolean | null;
  cover_color?: string | null;
}

interface KanbanCardProps {
  card: CardData;
  onClick?: () => void;
}

const KanbanCard = ({ card, onClick }: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30"
      )}
      onClick={onClick}
    >
      {card.cover_color && (
        <div className="h-2 rounded-t-lg" style={{ backgroundColor: card.cover_color }} />
      )}
      <div className="p-3">
        <div className="flex items-start gap-1">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium flex-1 leading-snug">{card.title}</span>
        </div>

        {(card.due_date || card.description) && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {card.due_date && (
              <span className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded",
                card.is_complete ? "bg-success/10 text-success" : "bg-muted"
              )}>
                <Calendar className="w-3 h-3" />
                {new Date(card.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            )}
            {card.description && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanCard;
