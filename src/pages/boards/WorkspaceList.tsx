import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Kanban, Trash2, Star, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const defaultColors = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#eab308"];

const WorkspaceList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: boards, isLoading } = useQuery({
    queryKey: ["boards", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_closed", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createBoardMut = useMutation({
    mutationFn: async () => {
      const color = defaultColors[Math.floor(Math.random() * defaultColors.length)];
      const { data, error } = await supabase
        .from("boards")
        .insert({
          user_id: user!.id,
          title: "Novo Board",
          cover_color: color,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Create default columns
      const defaultCols = ["A Fazer", "Em Progresso", "Concluído"];
      for (let i = 0; i < defaultCols.length; i++) {
        await supabase.from("board_columns").insert({
          board_id: data.id,
          title: defaultCols[i],
          position: i,
        });
      }

      return data.id;
    },
    onSuccess: (boardId) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      navigate(`/boards/${boardId}`);
    },
    onError: () => toast.error("Erro ao criar board"),
  });

  const deleteMut = useMutation({
    mutationFn: async (boardId: string) => {
      const { error } = await supabase.from("boards").update({ is_closed: true }).eq("id", boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board arquivado");
    },
  });

  const count = boards?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Meus Boards</h1>
            <p className="text-muted-foreground">{count} board{count !== 1 ? "s" : ""}</p>
          </div>
          <Button variant="hero" onClick={() => createBoardMut.mutate()} disabled={createBoardMut.isPending}>
            <Plus className="w-4 h-4 mr-1" /> Novo Board
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : count === 0 ? (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <Kanban className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Crie seu primeiro board</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Organize tarefas e projetos com boards Kanban completos, estilo Trello.
            </p>
            <Button variant="hero" onClick={() => createBoardMut.mutate()} disabled={createBoardMut.isPending}>
              <Plus className="w-4 h-4 mr-1" /> Novo Board
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards!.map((board) => (
              <div
                key={board.id}
                className="group rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                onClick={() => navigate(`/boards/${board.id}`)}
              >
                <div
                  className="h-24 flex items-end p-3"
                  style={{ backgroundColor: board.cover_color || "#1e293b" }}
                >
                  <h3 className="text-sm font-bold text-white drop-shadow-sm truncate">{board.title}</h3>
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(board.updated_at!), { addSuffix: true, locale: ptBR })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Arquivar este board?")) deleteMut.mutate(board.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WorkspaceList;
