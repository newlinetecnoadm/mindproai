import { useState, useMemo, useEffect, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/transitions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Brain, Trash2, Clock, GitBranch, Users, Timer, Link2, LayoutGrid,
  Search, SlidersHorizontal, Share2, FolderPlus, ChevronDown, ChevronRight,
  Pencil, AlertTriangle, GripVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ReactNode> = {
  mindmap: <Brain className="w-5 h-5" />,
};

const typeLabels: Record<string, string> = {
  mindmap: "Mapa Mental",
};

type SortOption = "updated" | "created" | "name";

// ────────── Create workspace dialog ──────────
function CreateDiagramWorkspaceDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !user) return;
    setLoading(true);
    const { error } = await supabase.from("diagram_workspaces" as any).insert({
      user_id: user.id,
      title: title.trim(),
      is_default: false,
      position: 999,
    } as any);
    setLoading(false);
    if (error) { toast.error("Erro ao criar workspace"); return; }
    toast.success("Workspace criado");
    setTitle("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Workspace de Diagramas</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Nome do workspace"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="hero" onClick={handleCreate} disabled={loading || !title.trim()}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────── Main page ──────────
const DiagramList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const isMobile = useIsMobile();
  const [collapsedWs, setCollapsedWs] = useState<Set<string>>(new Set());
  const [renamingWs, setRenamingWs] = useState<{ id: string; title: string } | null>(null);
  const [deletingWs, setDeletingWs] = useState<{ id: string; title: string; diagramCount: number } | null>(null);
  const [dragDiagramId, setDragDiagramId] = useState<string | null>(null);
  const [dragOverWsId, setDragOverWsId] = useState<string | null>(null);
  const limits = usePlanLimits();

  const handleNewDiagram = () => {
    if (!limits.canCreateDiagram) {
      setUpgradeOpen(true);
      return;
    }
    navigate("/diagramas/novo");
  };

  // ── Diagram workspaces ──
  const {
    data: workspaces = [],
    refetch: refetchWs,
    isFetched: isWsFetched,
  } = useQuery({
    queryKey: ["diagram-workspaces", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagram_workspaces" as any)
        .select("*")
        .order("position")
        .order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  // Ensure default workspace
  const defaultCreatedRef = useRef(false);
  useEffect(() => {
    if (!user || !isWsFetched || defaultCreatedRef.current) return;
    if (workspaces.length > 0) return;
    defaultCreatedRef.current = true;
    (async () => {
      const { error } = await supabase.from("diagram_workspaces" as any).insert({
        user_id: user.id,
        title: "Meus Diagramas",
        is_default: true,
        position: 0,
      } as any);
      if (error && error.code !== "23505") {
        toast.error("Erro ao criar workspace padrão");
        defaultCreatedRef.current = false;
        return;
      }
      await refetchWs();
    })();
  }, [user, workspaces.length, isWsFetched, refetchWs]);

  // ── Own diagrams ──
  const { data: ownDiagrams = [], isLoading } = useQuery({
    queryKey: ["diagrams-own", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagrams")
        .select("id, title, type, updated_at, created_at, user_id, thumbnail, diagram_workspace_id")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Shared diagrams ──
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
        .select("id, title, type, updated_at, created_at, user_id, thumbnail, diagram_workspace_id")
        .in("id", sharedIds)
        .neq("user_id", user!.id);
      return data || [];
    },
  });

  // ── Mutations ──
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

  const moveDiagramMut = useMutation({
    mutationFn: async ({ diagramId, wsId }: { diagramId: string; wsId: string | null }) => {
      const { error } = await supabase.from("diagrams").update({ diagram_workspace_id: wsId } as any).eq("id", diagramId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagrams-own"] });
      toast.success("Diagrama movido");
    },
  });

  const renameWsMut = useMutation({
    mutationFn: async ({ wsId, title }: { wsId: string; title: string }) => {
      const { error } = await supabase.from("diagram_workspaces" as any).update({ title } as any).eq("id", wsId);
      if (error) throw error;
    },
    onSuccess: () => { refetchWs(); setRenamingWs(null); toast.success("Workspace renomeado"); },
  });

  const deleteWsMut = useMutation({
    mutationFn: async (wsId: string) => {
      // Set diagrams to null workspace before deleting
      await supabase.from("diagrams").update({ diagram_workspace_id: null } as any).eq("diagram_workspace_id", wsId);
      const { error } = await supabase.from("diagram_workspaces" as any).delete().eq("id", wsId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchWs();
      queryClient.invalidateQueries({ queryKey: ["diagrams-own"] });
      setDeletingWs(null);
      toast.success("Workspace excluído");
    },
    onError: () => toast.error("Erro ao excluir workspace"),
  });

  const reorderWsMut = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await supabase.from("diagram_workspaces" as any).update({ position: i } as any).eq("id", orderedIds[i]);
      }
    },
    onSuccess: () => refetchWs(),
  });

  // ── Filtering & sorting ──
  const availableTypes = useMemo(() => {
    const types = [...new Set(ownDiagrams.map((d: any) => d.type))];
    return types.sort();
  }, [ownDiagrams]);

  const filtered = useMemo(() => {
    let result = [...ownDiagrams] as any[];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((d: any) => d.title.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") {
      result = result.filter((d: any) => d.type === typeFilter);
    }
    result.sort((a: any, b: any) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "created") return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime();
      return new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime();
    });
    return result;
  }, [ownDiagrams, search, typeFilter, sortBy]);

  // ── Workspace grouping ──
  const diagramsByWs = useMemo(() => {
    const map = new Map<string, any[]>();
    const unassigned: any[] = [];
    for (const d of filtered) {
      const wsId = d.diagram_workspace_id;
      if (wsId) {
        if (!map.has(wsId)) map.set(wsId, []);
        map.get(wsId)!.push(d);
      } else {
        unassigned.push(d);
      }
    }
    return { map, unassigned };
  }, [filtered]);

  const totalCount = ownDiagrams.length;
  const filteredCount = filtered.length;
  const hasActiveFilters = search.trim() !== "" || typeFilter !== "all";

  const toggleCollapse = (wsId: string) => {
    setCollapsedWs((prev) => {
      const next = new Set(prev);
      next.has(wsId) ? next.delete(wsId) : next.add(wsId);
      return next;
    });
  };

  const handleWsDragOver = (e: React.DragEvent, wsId: string) => {
    if (e.dataTransfer.types.includes("application/diagram-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverWsId(wsId);
    }
  };

  const handleWsDrop = (e: React.DragEvent, wsId: string) => {
    setDragOverWsId(null);
    setDragDiagramId(null);
    const diagramId = e.dataTransfer.getData("application/diagram-id");
    if (diagramId) {
      moveDiagramMut.mutate({ diagramId, wsId });
    }
    const sourceWsId = e.dataTransfer.getData("application/dws-id");
    if (sourceWsId && sourceWsId !== wsId) {
      const sortedIds = workspaces.map((w: any) => w.id);
      const fromIdx = sortedIds.indexOf(sourceWsId);
      const toIdx = sortedIds.indexOf(wsId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const reordered = [...sortedIds];
        reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, sourceWsId);
        reorderWsMut.mutate(reordered);
      }
    }
  };

  // ── Render diagram card ──
  const renderDiagramCard = (d: any, isOwner: boolean) => (
    <StaggerItem key={d.id}>
      <div
        draggable={isOwner && !isMobile}
        onDragStart={(e) => {
          if (isMobile) return;
          e.dataTransfer.setData("application/diagram-id", d.id);
          setDragDiagramId(d.id);
        }}
        onDragEnd={() => { if (!isMobile) { setDragDiagramId(null); setDragOverWsId(null); } }}
        className={cn(
          "group rounded-xl border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden",
          dragDiagramId === d.id ? "opacity-50 border-primary/40" : "border-border",
          isMobile ? "flex h-24" : "flex flex-col"
        )}
        onClick={() => navigate(`/diagramas/${d.id}`)}
      >
        <div className={cn(
          "bg-muted flex items-center justify-center text-muted-foreground/30 overflow-hidden relative shrink-0",
          isMobile ? "w-24 h-24" : "h-32 w-full"
        )}>
          {isOwner && !isMobile && (
            <GripVertical className="w-4 h-4 text-muted-foreground/40 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
          {d.thumbnail ? (
            <img src={d.thumbnail} alt={d.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            typeIcons[d.type] || <Brain className="w-10 h-10" />
          )}
        </div>
        <div className={cn("p-3 flex-1 flex flex-col justify-center", isMobile ? "min-w-0" : "")}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate flex-1">{d.title}</h3>
            {!isOwner && !isMobile && (
              <Badge variant="secondary" className="text-[10px] shrink-0">Comp.</Badge>
            )}
            {!isMobile && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                {typeLabels[d.type] || d.type}
              </Badge>
            )}
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
                className={cn("h-8 w-8", isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity")}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Excluir este diagrama?")) deleteMutation.mutate(d.id);
                }}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
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
        <div className={cn("flex items-center justify-between mb-6", isMobile && "flex-col items-stretch gap-4")}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold mb-0.5">Meus Mapas Mentais</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold opacity-70">
                {totalCount} diagrama{totalCount !== 1 ? "s" : ""}
              </p>
            </div>
            {isMobile && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setShowMobileSearch(!showMobileSearch)} className={cn(showMobileSearch && "text-primary bg-primary/5")}>
                  <Search className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setWsDialogOpen(true)}>
                  <FolderPlus className="w-5 h-5" />
                </Button>
                <Button variant="hero" size="icon" className="h-9 w-9 rounded-full shadow-lg" onClick={handleNewDiagram}>
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
          
          {!isMobile && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setWsDialogOpen(true)}>
                <FolderPlus className="w-4 h-4 mr-1" /> Workspace
              </Button>
              <Button variant="hero" onClick={handleNewDiagram}>
                <Plus className="w-4 h-4 mr-1" /> Novo Diagrama
              </Button>
            </div>
          )}
        </div>

        {/* Search and filters */}
        {totalCount > 0 && (
          <div className={cn(
            "flex flex-col sm:flex-row gap-3 mb-6",
            isMobile && !showMobileSearch && "hidden"
          )}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar diagramas..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-9 h-10 sm:h-9 bg-muted/30 border-none rounded-xl" 
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="flex-1 sm:w-[180px] h-10 sm:h-9 bg-muted/30 border-none rounded-xl">
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="mindmap">Mapa Mental</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="flex-1 sm:w-[180px] h-10 sm:h-9 bg-muted/30 border-none rounded-xl">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Última edição</SelectItem>
                  <SelectItem value="created">Data de criação</SelectItem>
                  <SelectItem value="name">Nome (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <div className="space-y-6">
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

                {/* Workspaces */}
                {workspaces.map((ws: any) => {
                  const wsDiagrams = diagramsByWs.map.get(ws.id) || [];
                  const isCollapsed = collapsedWs.has(ws.id);
                  return (
                    <div
                      key={ws.id}
                      className={cn(
                        "space-y-3 rounded-lg p-3 -m-3 transition-colors",
                        dragOverWsId === ws.id && "bg-primary/5 ring-2 ring-primary/20"
                      )}
                      onDragOver={(e) => handleWsDragOver(e, ws.id)}
                      onDragLeave={() => setDragOverWsId(null)}
                      onDrop={(e) => handleWsDrop(e, ws.id)}
                    >
                      <div
                        className="flex items-center gap-2"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/dws-id", ws.id);
                        }}
                      >
                        <button
                          onClick={() => toggleCollapse(ws.id)}
                          className="flex items-center gap-1 hover:text-foreground text-foreground/80 transition-colors cursor-grab active:cursor-grabbing"
                        >
                          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <h2 className="text-sm font-semibold">{ws.title}</h2>
                        </button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRenamingWs({ id: ws.id, title: ws.title })}>
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </Button>
                        <span className="text-xs text-muted-foreground">{wsDiagrams.length}</span>
                        <div className="ml-auto flex items-center gap-1">
                          {!ws.is_default && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeletingWs({ id: ws.id, title: ws.title, diagramCount: wsDiagrams.length })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {!isCollapsed && (
                        wsDiagrams.length === 0 ? (
                          <p className="text-xs text-muted-foreground ml-6 sm:ml-6">Nenhum diagrama neste workspace</p>
                        ) : (
                          <StaggerContainer className={cn(
                            "grid gap-4 ml-0 sm:ml-6",
                            isMobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                          )}>
                            {wsDiagrams.map((d: any) => renderDiagramCard(d, true))}
                          </StaggerContainer>
                        )
                      )}
                    </div>
                  );
                })}

                {/* Unassigned diagrams */}
                {diagramsByWs.unassigned.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-foreground/80">Sem workspace</h2>
                    <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {diagramsByWs.unassigned.map((d: any) => renderDiagramCard(d, true))}
                    </StaggerContainer>
                  </div>
                )}
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
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sharedDiagrams.map((d: any) => renderDiagramCard(d, false))}
                </div>
              </div>
            )}
          </div>
        )}

        <CreateDiagramWorkspaceDialog
          open={wsDialogOpen}
          onOpenChange={setWsDialogOpen}
          onCreated={() => refetchWs()}
        />

        {/* Rename workspace dialog */}
        <Dialog open={!!renamingWs} onOpenChange={(v) => { if (!v) setRenamingWs(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Renomear Workspace</DialogTitle>
            </DialogHeader>
            <Input
              value={renamingWs?.title || ""}
              onChange={(e) => setRenamingWs((prev) => prev ? { ...prev, title: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renamingWs?.title.trim()) {
                  renameWsMut.mutate({ wsId: renamingWs.id, title: renamingWs.title.trim() });
                }
              }}
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenamingWs(null)}>Cancelar</Button>
              <Button
                variant="hero"
                disabled={!renamingWs?.title.trim() || renameWsMut.isPending}
                onClick={() => renamingWs && renameWsMut.mutate({ wsId: renamingWs.id, title: renamingWs.title.trim() })}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete workspace confirmation */}
        <Dialog open={!!deletingWs} onOpenChange={(v) => { if (!v) setDeletingWs(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Excluir Workspace
              </DialogTitle>
              <DialogDescription className="text-sm pt-2">
                Os diagramas dentro do workspace <strong>"{deletingWs?.title}"</strong> serão movidos para "Sem workspace".
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeletingWs(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                disabled={deleteWsMut.isPending}
                onClick={() => deletingWs && deleteWsMut.mutate(deletingWs.id)}
              >
                {deleteWsMut.isPending ? "Excluindo..." : "Excluir workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <UpgradeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          resource="diagrama"
          currentCount={limits.currentDiagrams}
          maxCount={limits.maxDiagrams}
          planName={limits.displayName}
        />
      </PageTransition>
    </DashboardLayout>
  );
};

export default DiagramList;
