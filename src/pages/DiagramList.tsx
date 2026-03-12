import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Brain } from "lucide-react";
import { Link } from "react-router-dom";

const DiagramList = () => {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Meus Diagramas</h1>
            <p className="text-muted-foreground">0 de 3 diagramas (Plano Gratuito)</p>
          </div>
          <Button variant="hero">
            <Plus className="w-4 h-4 mr-1" /> Novo Diagrama
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-accent-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Crie seu primeiro diagrama</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Escolha entre mapas mentais, fluxogramas, organogramas e mais. Use templates prontos ou comece do zero.
          </p>
          <Button variant="hero">
            <Plus className="w-4 h-4 mr-1" /> Novo Diagrama
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DiagramList;
