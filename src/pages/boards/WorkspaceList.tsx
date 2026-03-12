import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Kanban } from "lucide-react";

const WorkspaceList = () => {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Meus Boards</h1>
            <p className="text-muted-foreground">0 de 2 boards (Plano Gratuito)</p>
          </div>
          <Button variant="hero">
            <Plus className="w-4 h-4 mr-1" /> Novo Board
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Kanban className="w-8 h-8 text-accent-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Crie seu primeiro board</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Organize tarefas e projetos com boards Kanban completos, estilo Trello.
          </p>
          <Button variant="hero">
            <Plus className="w-4 h-4 mr-1" /> Novo Board
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WorkspaceList;
