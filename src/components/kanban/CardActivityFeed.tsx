import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity, Plus, ArrowRightLeft, Tag, CheckCircle2, AlignLeft,
  Calendar, Trash2, CheckSquare, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CardActivityFeedProps {
  cardId: string;
}

const actionConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  created: { icon: Plus, label: "criou este card", color: "text-emerald-500" },
  moved: { icon: ArrowRightLeft, label: "moveu este card", color: "text-blue-500" },
  label_added: { icon: Tag, label: "adicionou uma label", color: "text-purple-500" },
  label_removed: { icon: Tag, label: "removeu uma label", color: "text-purple-400" },
  completed: { icon: CheckCircle2, label: "marcou como concluído", color: "text-emerald-500" },
  uncompleted: { icon: CheckCircle2, label: "reabriu este card", color: "text-amber-500" },
  description_updated: { icon: AlignLeft, label: "atualizou a descrição", color: "text-muted-foreground" },
  due_date_set: { icon: Calendar, label: "definiu a data de entrega", color: "text-orange-500" },
  due_date_removed: { icon: Calendar, label: "removeu a data de entrega", color: "text-orange-400" },
  checklist_added: { icon: CheckSquare, label: "adicionou uma checklist", color: "text-blue-500" },
  checklist_removed: { icon: Trash2, label: "removeu uma checklist", color: "text-destructive" },
  copied: { icon: Copy, label: "copiou este card", color: "text-muted-foreground" },
};

const CardActivityFeed = ({ cardId }: CardActivityFeedProps) => {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["card-activities", cardId],
    enabled: !!cardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_activities")
        .select("*")
        .eq("card_id", cardId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Carregando atividades...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">Nenhuma atividade registrada.</p>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((act: any) => {
        const config = actionConfig[act.action] || {
          icon: Activity,
          label: act.action,
          color: "text-muted-foreground",
        };
        const Icon = config.icon;
        const details = act.details as Record<string, any> | null;

        return (
          <div key={act.id} className="flex items-start gap-2.5 py-1">
            <div className={cn("mt-0.5 shrink-0", config.color)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed">
                <span className="font-medium">{config.label}</span>
                {details?.from && details?.to && (
                  <span className="text-muted-foreground">
                    {" "}de <span className="font-medium text-foreground">{details.from}</span> para{" "}
                    <span className="font-medium text-foreground">{details.to}</span>
                  </span>
                )}
                {details?.label_name && (
                  <span className="text-muted-foreground">
                    {" "}<span
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white ml-1"
                      style={{ backgroundColor: details.label_color || "#6b7280" }}
                    >
                      {details.label_name}
                    </span>
                  </span>
                )}
                {details?.checklist_title && (
                  <span className="text-muted-foreground"> "{details.checklist_title}"</span>
                )}
                {details?.date && (
                  <span className="text-muted-foreground"> {details.date}</span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {format(new Date(act.created_at), "dd MMM, HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CardActivityFeed;
