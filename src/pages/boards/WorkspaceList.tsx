import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/transitions";
import { Button } from "@/components/ui/button";
import { Plus, Kanban, Trash2, Star, Clock, RefreshCw, AlertTriangle, ChevronDown, ChevronRight, FolderPlus, Users, GripVertical, Pencil, Share2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import NewBoardDialog, { type BoardTemplate } from "@/components/boards/NewBoardDialog";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import ShareBoardDialog from "@/components/boards/ShareBoardDialog";
import ShareWorkspaceDialog from "@/components/boards/ShareWorkspaceDialog";

const defaultColors = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#eab308"];

// ────────── Workspace create dialog ──────────
function CreateWorkspaceDialog({ open, onOpenChange, onCreated }: {
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
    const { error } = await supabase.from("workspaces" as any).insert({
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
          <DialogTitle>Novo Workspace</DialogTitle>
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
const WorkspaceList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string | null>(null);
  const [collapsedWs, setCollapsedWs] = useState<Set<string>>(new Set());
  const [dragBoardId, setDragBoardId] = useState<string | null>(null);
  const [dragOverWsId, setDragOverWsId] = useState<string | null>(null);
  const [shareWs, setShareWs] = useState<{ id: string; title: string } | null>(null);
  const [renamingWs, setRenamingWs] = useState<{ id: string; title: string } | null>(null);
  const [deletingWs, setDeletingWs] = useState<{ id: string; title: string; boardCount: number } | null>(null);
  const limits = usePlanLimits();

  // Fetch workspaces (own)
  const {
    data: workspaces = [],
    refetch: refetchWs,
    isFetched: isWorkspacesFetched,
  } = useQuery({
    queryKey: ["workspaces", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("position")
        .order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  // Ensure default workspace exists only after initial fetch completes
  const defaultCreatedRef = useRef(false);
  useEffect(() => {
    if (!user || !isWorkspacesFetched || defaultCreatedRef.current) return;
    if (workspaces.length > 0) return;

    defaultCreatedRef.current = true;
    (async () => {
      const { error } = await supabase.from("workspaces" as any).insert({
        user_id: user.id,
        title: "Meus Boards",
        is_default: true,
        position: 0,
      } as any);

      if (error) {
        // Unique index can reject concurrent duplicate creation; just refresh list in that case.
        if (error.code !== "23505") {
          toast.error("Erro ao criar workspace padrão");
          defaultCreatedRef.current = false;
          return;
        }
      }

      await refetchWs();
    })();
  }, [user, workspaces.length, isWorkspacesFetched, refetchWs]);

  // Fetch boards (own)
  const { data: boards = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["boards", user?.id],
    enabled: !!user,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("id, title, cover_color, updated_at, is_closed, is_starred, workspace_id, user_id")
        .eq("user_id", user!.id)
        .eq("is_closed", false)
        .order("is_starred", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch shared boards (via board_members)
  const { data: sharedBoards = [] } = useQuery({
    queryKey: ["shared-boards", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from("board_members")
        .select("board_id")
        .eq("user_id", user!.id);
      if (!memberships?.length) return [];
      const boardIds = memberships.map((m) => m.board_id);
      const { data } = await supabase
        .from("boards")
        .select("id, title, cover_color, updated_at, is_closed, is_starred, user_id")
        .in("id", boardIds)
        .neq("user_id", user!.id)
        .eq("is_closed", false);
      return data || [];
    },
  });

  const toggleStarMut = useMutation({
    mutationFn: async ({ boardId, starred }: { boardId: string; starred: boolean }) => {
      const { error } = await supabase.from("boards").update({ is_starred: starred }).eq("id", boardId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  });

  const handleNewBoard = (workspaceId?: string | null) => {
    if (!limits.canCreateBoard) {
      setUpgradeOpen(true);
      return;
    }
    setTargetWorkspaceId(workspaceId || null);
    setBoardDialogOpen(true);
  };

  const createBoardMut = useMutation({
    mutationFn: async ({ title, template }: { title: string; template: BoardTemplate }) => {
      if (!user?.id) throw new Error("Sessão expirada.");
      const color = template.color || defaultColors[Math.floor(Math.random() * defaultColors.length)];

      // If no workspace, assign to default
      let wsId = targetWorkspaceId;
      if (!wsId) {
        const defaultWs = workspaces.find((ws: any) => ws.is_default);
        wsId = defaultWs?.id || null;
      }

      const { data, error } = await supabase
        .from("boards")
        .insert({
          user_id: user.id,
          title,
          cover_color: color,
          workspace_id: wsId,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      const { error: colsError } = await supabase.from("board_columns").insert(
        template.columns.map((colTitle, position) => ({
          board_id: data.id,
          title: colTitle,
          position,
        }))
      );
      if (colsError) {
        await supabase.from("boards").delete().eq("id", data.id);
        throw colsError;
      }

      if (template.cards && Object.keys(template.cards).length > 0) {
        const { data: createdCols } = await supabase
          .from("board_columns")
          .select("id, title")
          .eq("board_id", data.id)
          .order("position");
        if (createdCols) {
          const colMap: Record<string, string> = {};
          createdCols.forEach((c) => { colMap[c.title] = c.id; });
          const cardsToInsert: any[] = [];
          for (const [colTitle, cardTitles] of Object.entries(template.cards)) {
            const colId = colMap[colTitle];
            if (colId) {
              (cardTitles as string[]).forEach((cardTitle, pos) => {
                cardsToInsert.push({ board_id: data.id, column_id: colId, title: cardTitle, position: pos });
              });
            }
          }
          if (cardsToInsert.length > 0) await supabase.from("board_cards").insert(cardsToInsert);
        }
      }
      return data.id;
    },
    onSuccess: (boardId) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board-count"] });
      setBoardDialogOpen(false);
      navigate(`/boards/${boardId}`);
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao criar board"),
  });

  const deleteMut = useMutation({
    mutationFn: async (boardId: string) => {
      const { error } = await supabase.from("boards").update({ is_closed: true }).eq("id", boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board-count"] });
      toast.success("Board arquivado");
    },
  });

  const deleteWsMut = useMutation({
    mutationFn: async (wsId: string) => {
      // Cascade delete handles boards, cards, columns, etc.
      const { error } = await supabase.from("workspaces" as any).delete().eq("id", wsId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchWs();
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board-count"] });
      setDeletingWs(null);
      toast.success("Workspace e boards excluídos");
    },
  });
  const renameWsMut = useMutation({
    mutationFn: async ({ wsId, title }: { wsId: string; title: string }) => {
      const { error } = await supabase.from("workspaces" as any).update({ title } as any).eq("id", wsId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchWs();
      setRenamingWs(null);
      toast.success("Workspace renomeado");
    },
  });

  const moveBoardMut = useMutation({
    mutationFn: async ({ boardId, wsId }: { boardId: string; wsId: string | null }) => {
      const { error } = await supabase.from("boards").update({ workspace_id: wsId } as any).eq("id", boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board movido");
    },
  });

  const toggleCollapse = (wsId: string) => {
    setCollapsedWs((prev) => {
      const next = new Set(prev);
      next.has(wsId) ? next.delete(wsId) : next.add(wsId);
      return next;
    });
  };

  // Group boards by workspace
  const boardsByWs = useMemo(() => {
    const map = new Map<string, typeof boards>();
    const unassigned: typeof boards = [];
    for (const b of boards) {
      const wsId = (b as any).workspace_id;
      if (wsId) {
        if (!map.has(wsId)) map.set(wsId, []);
        map.get(wsId)!.push(b);
      } else {
        unassigned.push(b);
      }
    }
    return { map, unassigned };
  }, [boards]);

  const totalCount = boards.length;

  const renderBoardCard = (board: any) => (
    <div
      key={board.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/board-id", board.id);
        setDragBoardId(board.id);
      }}
      onDragEnd={() => { setDragBoardId(null); setDragOverWsId(null); }}
      className={cn(
        "group rounded-xl border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden",
        dragBoardId === board.id ? "opacity-50 border-primary/40" : "border-border"
      )}
      onClick={() => navigate(`/boards/${board.id}`)}
    >
      <div
        className="h-24 flex items-end p-3 relative"
        style={{ backgroundColor: board.cover_color || "#1e293b" }}
      >
        <GripVertical className="w-4 h-4 text-white/60 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        <h3 className="text-sm font-bold text-white drop-shadow-sm truncate">{board.title}</h3>
      </div>
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(board.updated_at!), { addSuffix: true, locale: ptBR })}
        </span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
            e.stopPropagation();
            toggleStarMut.mutate({ boardId: board.id, starred: !board.is_starred });
          }}>
            <Star className={cn("w-3.5 h-3.5", board.is_starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
          </Button>
          {board.user_id === user?.id && (
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
              e.stopPropagation();
              if (confirm("Arquivar este board?")) deleteMut.mutate(board.id);
            }}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const handleWsDragOver = (e: React.DragEvent, wsId: string) => {
    if (e.dataTransfer.types.includes("application/board-id") || e.dataTransfer.types.includes("application/workspace-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverWsId(wsId);
    }
  };

  const handleWsDrop = (e: React.DragEvent, wsId: string) => {
    setDragOverWsId(null);
    setDragBoardId(null);

    const boardId = e.dataTransfer.getData("application/board-id");
    if (boardId) {
      moveBoardMut.mutate({ boardId, wsId });
      return;
    }

    const sourceWsId = e.dataTransfer.getData("application/workspace-id");
    if (sourceWsId && sourceWsId !== wsId) {
      // Reorder: move source before target
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

  const reorderWsMut = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await supabase.from("workspaces" as any).update({ position: i } as any).eq("id", orderedIds[i]);
      }
    },
    onSuccess: () => refetchWs(),
  });

  return (
    <DashboardLayout>
      <PageTransition className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Boards</h1>
            <p className="text-muted-foreground">{totalCount} board{totalCount !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWsDialogOpen(true)}>
              <FolderPlus className="w-4 h-4 mr-1" /> Workspace
            </Button>
            <Button variant="hero" onClick={() => handleNewBoard()}>
              <Plus className="w-4 h-4 mr-1" /> Novo Board
            </Button>
          </div>
        </div>

        {isFetching && !isLoading && (
          <Progress value={75} className="h-1 mb-4 w-48 mx-auto" />
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando boards…</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Erro ao carregar boards</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Verifique sua conexão e tente novamente.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("w-4 h-4 mr-1", isFetching && "animate-spin")} /> Tentar novamente
            </Button>
          </div>
        ) : totalCount === 0 && sharedBoards.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <Kanban className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Crie seu primeiro board</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Organize tarefas e projetos com boards Kanban completos.
            </p>
            <Button variant="hero" onClick={() => setBoardDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Novo Board
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Workspaces */}
            {workspaces.map((ws: any) => {
              const wsBoards = boardsByWs.map.get(ws.id) || [];
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
                      e.dataTransfer.setData("application/workspace-id", ws.id);
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
                    <span className="text-xs text-muted-foreground">{wsBoards.length}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleNewBoard(ws.id)}>
                        <Plus className="w-3 h-3 mr-1" /> Board
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShareWs({ id: ws.id, title: ws.title })}>
                        <Users className="w-3 h-3 mr-1" /> Membros
                      </Button>
                      {!ws.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const wsBoards2 = boardsByWs.map.get(ws.id) || [];
                            setDeletingWs({ id: ws.id, title: ws.title, boardCount: wsBoards2.length });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {!isCollapsed && (
                    wsBoards.length === 0 ? (
                      <p className="text-xs text-muted-foreground ml-6">Nenhum board neste workspace</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ml-6">
                        {wsBoards.map(renderBoardCard)}
                      </div>
                    )
                  )}
                </div>
              );
            })}

            {/* Unassigned boards */}
            {boardsByWs.unassigned.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground/80">Sem workspace</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {boardsByWs.unassigned.map(renderBoardCard)}
                </div>
              </div>
            )}

            {/* Shared with me */}
            {sharedBoards.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground/80">Compartilhados comigo</h2>
                  <span className="text-xs text-muted-foreground">{sharedBoards.length}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sharedBoards.map(renderBoardCard)}
                </div>
              </div>
            )}
          </div>
        )}

        <NewBoardDialog
          open={boardDialogOpen}
          onOpenChange={setBoardDialogOpen}
          onCreateBoard={(title, template) => createBoardMut.mutate({ title, template })}
          isPending={createBoardMut.isPending}
        />
        <CreateWorkspaceDialog
          open={wsDialogOpen}
          onOpenChange={setWsDialogOpen}
          onCreated={() => refetchWs()}
        />
        <UpgradeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          resource="board"
          currentCount={limits.currentBoards}
          maxCount={limits.maxBoards}
          planName={limits.displayName}
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

        {/* Share workspace dialog */}
        {shareWs && (
          <ShareWorkspaceDialog
            workspaceId={shareWs.id}
            workspaceTitle={shareWs.title}
            open={!!shareWs}
            onOpenChange={(v) => { if (!v) setShareWs(null); }}
          />
        )}

        {/* Delete workspace confirmation */}
        <Dialog open={!!deletingWs} onOpenChange={(v) => { if (!v) setDeletingWs(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Excluir Workspace
              </DialogTitle>
              <DialogDescription className="text-sm pt-2">
                Esta ação é <strong>irreversível</strong>. Ao excluir o workspace <strong>"{deletingWs?.title}"</strong>,
                {deletingWs?.boardCount
                  ? <> todos os <strong>{deletingWs.boardCount} board{deletingWs.boardCount > 1 ? "s" : ""}</strong> dentro dele também serão excluídos permanentemente.</>
                  : " o workspace será removido permanentemente."
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeletingWs(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                disabled={deleteWsMut.isPending}
                onClick={() => deletingWs && deleteWsMut.mutate(deletingWs.id)}
              >
                {deleteWsMut.isPending ? "Excluindo..." : "Excluir permanentemente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </DashboardLayout>
  );
};

export default WorkspaceList;