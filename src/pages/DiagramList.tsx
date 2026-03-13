import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Brain, Trash2, Clock, GitBranch, Users, Timer, Link2, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeIcons: Record<string, React.ReactNode> = {
  mindmap: <Brain className="w-5 h-5" />,
  flowchart: <GitBranch className="w-5 h-5" />,
  orgchart: <Users className="w-5 h-5" />,
  timeline: <Timer className="w-5 h-5" />,
  concept_map: <Link2 className="w-5 h-5" />,
  swimlane: <LayoutGrid className="w-5 h-5" />,
};

const typeLabels: Record<string, string> = {
  mindmap: "Mapa Mental",
  flowchart: "Fluxograma",
  orgchart: "Organograma",
  timeline: "Linha do Tempo",
  concept_map: "Mapa Conceitual",
  swimlane: "Swimlane",
  wireframe: "Wireframe",
};

const DiagramList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: diagrams, isLoading } = useQuery({
    queryKey: ["diagrams", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagrams")
        .select("id, title, type, updated_at, created_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("diagrams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagrams"] });
      toast.success("Diagrama excluído");
    },
    onError: () => toast.error("Erro ao excluir diagrama"),
  });

  const count = diagrams?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Meus Diagramas</h1>
            <p className="text-muted-foreground">{count} diagrama{count !== 1 ? "s" : ""}</p>
          </div>
          <Button variant="hero" onClick={() => navigate("/diagramas/novo")}>
            <Plus className="w-4 h-4 mr-1" /> Novo Diagrama
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : count === 0 ? (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Crie seu primeiro diagrama</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Escolha entre mapas mentais, fluxogramas, organogramas e mais.
            </p>
            <Button variant="hero" onClick={() => navigate("/diagramas/novo")}>
              <Plus className="w-4 h-4 mr-1" /> Novo Diagrama
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {diagrams!.map((d) => (
              <div
                key={d.id}
                className="group rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                onClick={() => navigate(`/diagramas/${d.id}`)}
              >
                <div className="h-32 bg-muted flex items-center justify-center text-muted-foreground/30">
                  {typeIcons[d.type] || <Brain className="w-10 h-10" />}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate flex-1">{d.title}</h3>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {typeLabels[d.type] || d.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(d.updated_at!), { addSuffix: true, locale: ptBR })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Excluir este diagrama?")) deleteMutation.mutate(d.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DiagramList;
