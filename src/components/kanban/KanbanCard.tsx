import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Calendar, MessageSquare, GitBranch, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface CardLabel {
  id: string;
  name: string | null;
  color: string;
}

export interface CardMemberProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
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
  members?: CardMemberProfile[];
}

const KanbanCard = ({ card, onClick, isHighlighted, labels, members }: KanbanCardProps) => {
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

  const initials = (profile: CardMemberProfile) => {
    if (profile.full_name) {
      return profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    }
    return (profile.email?.[0] || "U").toUpperCase();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-type="card"
      className={cn(
        "rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group",
        "bg-card border border-border hover:border-primary/30",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30",
        isHighlighted && "ring-2 ring-primary/40 shadow-md animate-[pulse_1s_ease-in-out_1]"
      )}
      onClick={onClick}
    >
      {card.cover_color && (
        <div className="h-2 rounded-t-lg" style={{ backgroundColor: card.cover_color }} />
      )}
      <div className="p-3">
        {/* Labels above title */}
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
            className="text-sm font-medium flex-1 leading-snug cursor-grab active:cursor-grabbing"
          >
            {card.title}
          </span>
        </div>

        {(card.due_date || card.description || card.diagram_id || (members && members.length > 0)) && (
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

            {/* Assigned members - push to the right */}
            {members && members.length > 0 && (
              <div className="ml-auto flex -space-x-1.5">
                <TooltipProvider delayDuration={300}>
                  {members.slice(0, 3).map((m) => (
                    <Tooltip key={m.user_id}>
                      <TooltipTrigger asChild>
                        <Avatar className="w-5 h-5 border border-card">
                          {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                          <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                            {initials(m)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {m.full_name || m.email}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {members.length > 3 && (
                    <Avatar className="w-5 h-5 border border-card">
                      <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                        +{members.length - 3}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </TooltipProvider>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanCard;
