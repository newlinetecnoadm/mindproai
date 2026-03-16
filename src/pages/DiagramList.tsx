import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/transitions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Brain, Trash2, Clock, GitBranch, Users, Timer, Link2, LayoutGrid, Search, SlidersHorizontal, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";

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

type SortOption = "updated" | "created" | "name";

const DiagramList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const limits = usePlanLimits();

  const handleNewDiagram = () => {
    if (!limits.canCreateDiagram) {
      setUpgradeOpen(true);
      return;
    }
    navigate("/diagramas/novo");
  };

  // Own diagrams
  const { data: ownDiagrams = [], isLoading } = useQuery({
    queryKey: ["diagrams-own", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagrams")
        .select("id, title, type, updated_at, created_at, user_id, thumbnail")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Shared diagrams (via collaborator)
  const { data: sharedDiagrams = [] } = useQuery({
    queryKey: ["diagrams-shared", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: collabs } = await supabase
        .from("diagram_collaborators")
        .select("diagram_id")
        .eq("user_id", user!.id);
      if (!collabs?.length) return [];
      const sharedIds = collabs.map((c) => c.diagram_id);
      const { data } = await supabase
        .from("diagrams")
        .select("id, title, type, updated_at, created_at, user_id, thumbnail")
        .in("id", sharedIds)
        .neq("user_id", user!.id);
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("diagrams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagrams-own"] });
      queryClient.invalidateQueries({ queryKey: ["diagram-count"] });
      toast.success("Diagrama excluído");
    },
    onError: () => toast.error("Erro ao excluir diagrama"),
  });

  const availableTypes = useMemo(() => {
    const types = [...new Set(ownDiagrams.map((d) => d.type))];
    return types.sort();
  }, [ownDiagrams]);

  // Filter and sort own diagrams
  const filtered = useMemo(() => {
    let result = ownDiagrams;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((d) => d.title.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") {
      result = result.filter((d) => d.type === typeFilter);
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "created") return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime();
      return new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime();
    });
    return result;
  }, [ownDiagrams, search, typeFilter, sortBy]);

  const totalCount = ownDiagrams.length;
  const filteredCount = filtered.length;
  const hasActiveFilters = search.trim() !== "" || typeFilter !== "all";

  const renderDiagramCard = (d: any, isOwner: boolean) => (
    <StaggerItem key={d.id}>
      <div
        className="group rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
        onClick={() => navigate(`/diagramas/${d.id}`)}
      >
        <div className="h-32 bg-muted flex items-center justify-center text-muted-foreground/30 overflow-hidden">
          {d.thumbnail ? (
            <img src={d.thumbnail} alt={d.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            typeIcons[d.type] || <Brain className="w-10 h-10" />
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate flex-1">{d.title}</h3>
            {!isOwner && (
              <Badge variant="secondary" className="text-[10px] shrink-0">Compartilhado</Badge>
            )}
            <Badge variant="outline" className="text-[10px] shrink-0">
              {typeLabels[d.type] || d.type}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(d.updated_at!), { addSuffix: true, locale: ptBR })}
            </span>
            {isOwner && (
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
            )}
          </div>
        </div>
      </div>
    </StaggerItem>
  );

  return (
    <DashboardLayout>
      <PageTransition className="p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Meus Diagramas</h1>
            <p className="text-muted-foreground">{totalCount} diagrama{totalCount !== 1 ? "s" : ""}</p>
          </div>
          <Button variant="hero" onClick={handleNewDiagram}>
            <Plus className="w-4 h-4 mr-1" /> Novo Diagrama
          </Button>
        </div>

        {/* Search and filters */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar diagramas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>{typeLabels[t] || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Última edição</SelectItem>
                <SelectItem value="created">Data de criação</SelectItem>
                <SelectItem value="name">Nome (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : totalCount === 0 && sharedDiagrams.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Crie seu primeiro diagrama</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Escolha entre mapas mentais, fluxogramas, organogramas e mais.
            </p>
            <Button variant="hero" onClick={handleNewDiagram}>
              <Plus className="w-4 h-4 mr-1" /> Novo Diagrama
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Own diagrams */}
            {filteredCount === 0 && hasActiveFilters ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="font-semibold text-sm mb-1">Nenhum resultado encontrado</h3>
                <p className="text-muted-foreground text-xs mb-4">Tente alterar os filtros.</p>
                <Button variant="outline" size="sm" onClick={() => { setSearch(""); setTypeFilter("all"); }}>
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <>
                {hasActiveFilters && (
                  <p className="text-xs text-muted-foreground">{filteredCount} de {totalCount} diagrama{totalCount !== 1 ? "s" : ""}</p>
                )}
                <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((d) => renderDiagramCard(d, true))}
                </StaggerContainer>
              </>
            )}

            {/* Shared with me */}
            {sharedDiagrams.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground/80">Compartilhados comigo</h2>
                  <span className="text-xs text-muted-foreground">{sharedDiagrams.length}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedDiagrams.map((d) => renderDiagramCard(d, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </PageTransition>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        resource="diagrama"
        currentCount={limits.currentDiagrams}
        maxCount={limits.maxDiagrams}
        planName={limits.displayName}
      />
    </DashboardLayout>
  );
};

export default DiagramList;