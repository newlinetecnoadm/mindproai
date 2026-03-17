import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Calendar, MessageSquare, GitBranch } from "lucide-react";

export interface CardLabel {
  id: string;
  name: string | null;
  color: string;
}

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
  labels?: CardLabel[];
}

const KanbanCard = ({ card, onClick, isHighlighted, labels }: KanbanCardProps) => {
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
        "rounded-lg transition-all duration-300 cursor-pointer group",
        "bg-[hsl(var(--board-card-bg))] border border-[hsl(var(--board-card-border))]",
        "hover:border-[hsl(var(--board-card-hover-border))] hover:shadow-md",
        "shadow-[0_1px_3px_hsl(0_0%_0%/0.3)]",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30",
        isHighlighted && "ring-2 ring-primary/40 shadow-md animate-[pulse_1s_ease-in-out_1]"
      )}
      onClick={onClick}
    >
      {card.cover_color && (
        <div className="h-2 rounded-t-lg" style={{ backgroundColor: card.cover_color }} />
      )}
      <div className="p-3">
        {labels && labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {labels.map((label) => (
              <span
                key={label.id}
                className="inline-block h-2 w-8 rounded-full"
                style={{ backgroundColor: label.color }}
                title={label.name || undefined}
              />
            ))}
          </div>
        )}

        <div className="flex items-start">
          <span
            {...attributes}
            {...listeners}
            className="text-sm font-medium flex-1 leading-snug cursor-grab active:cursor-grabbing text-[hsl(var(--board-text))]"
          >
            {card.title}
          </span>
        </div>

        {(card.due_date || card.description || card.diagram_id) && (
          <div className="flex items-center gap-2 mt-2 text-xs text-[hsl(var(--board-text-muted))]">
            {card.due_date && (
              <span className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded",
                card.is_complete ? "bg-success/20 text-success" : "bg-[hsl(0_0%_25%)]"
              )}>
                <Calendar className="w-3 h-3" />
                {new Date(card.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            )}
            {card.diagram_id && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/15 text-primary">
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
