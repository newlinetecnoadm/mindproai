import DashboardLayout from "@/components/layout/DashboardLayout";
import { LayoutDashboard, Calendar, Plus, ArrowRight, Brain, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const quickActions = [
  { icon: Brain, label: "Novo Diagrama", description: "Mapa mental, fluxograma e mais", path: "/diagramas", color: "bg-primary/10 text-primary" },
  { icon: Kanban, label: "Novo Board", description: "Kanban estilo Trello", path: "/boards", color: "bg-success/10 text-success" },
  { icon: Calendar, label: "Novo Evento", description: "Adicionar à agenda", path: "/agenda", color: "bg-warning/10 text-warning" },
];

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-2xl font-display font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground mb-8">Bem-vindo ao Mind Pro AI</p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            >
              <Link to={action.path}>
                <div className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 group cursor-pointer">
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    {action.label}
                    <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Recentes</h2>
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum item criado ainda</p>
            <Link to="/diagramas">
              <Button variant="hero" size="sm">
                Criar Primeiro Diagrama <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
