import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Calendar, MessageSquare, GitBranch } from "lucide-react";

export interface CardData {
  id: string;
  title: string;
  description?: string | null;
  column_id: string;
  position: number;
  due_date?: string | null;
  is_complete?: boolean | null;
  cover_color?: string | null;
  diagram_id?: string | null;
}

interface KanbanCardProps {
  card: CardData;
  onClick?: () => void;
  isHighlighted?: boolean;
}

const KanbanCard = ({ card, onClick, isHighlighted }: KanbanCardProps) => {
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
        "rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group",
        "bg-muted/80 border border-border/50 hover:border-border",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30",
        isHighlighted && "ring-2 ring-primary/40 shadow-md animate-[pulse_1s_ease-in-out_1]"
      )}
      onClick={onClick}
    >
      {card.cover_color && (
        <div className="h-2 rounded-t-lg" style={{ backgroundColor: card.cover_color }} />
      )}
      <div className="p-3">
        <div className="flex items-start">
          <span
            {...attributes}
            {...listeners}
            className="text-sm font-medium flex-1 leading-snug cursor-grab active:cursor-grabbing"
          >
            {card.title}
          </span>
        </div>

        {(card.due_date || card.description || card.diagram_id) && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {card.due_date && (
              <span className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded",
                card.is_complete ? "bg-success/10 text-success" : "bg-secondary"
              )}>
                <Calendar className="w-3 h-3" />
                {new Date(card.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            )}
            {card.diagram_id && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                <GitBranch className="w-3 h-3" />
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
