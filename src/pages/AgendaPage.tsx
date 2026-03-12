import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";

const AgendaPage = () => {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Agenda</h1>
            <p className="text-muted-foreground">Calendário e eventos</p>
          </div>
          <Button variant="hero">
            <Plus className="w-4 h-4 mr-1" /> Novo Evento
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-accent-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Sua agenda está vazia</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Crie eventos e vincule-os a cards ou diagramas para nunca perder um prazo.
          </p>
          <Button variant="hero">
            <Plus className="w-4 h-4 mr-1" /> Novo Evento
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgendaPage;
