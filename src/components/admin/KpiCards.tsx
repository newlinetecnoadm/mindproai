import { Users, CreditCard, Brain, TrendingUp, UserCheck, Activity } from "lucide-react";

interface KpiCardsProps {
  totalUsers: number;
  activeSubs: number;
  diagramCount: number;
  boardCount: number;
  retentionRate: number;
  dauEstimate: number;
}

const KpiCards = ({ totalUsers, activeSubs, diagramCount, boardCount, retentionRate, dauEstimate }: KpiCardsProps) => {
  const cards = [
    { label: "Total de Usuários", value: totalUsers, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Assinaturas Ativas", value: activeSubs, icon: CreditCard, color: "bg-success/10 text-success" },
    { label: "Diagramas Criados", value: diagramCount, icon: Brain, color: "bg-blue-500/10 text-blue-500" },
    { label: "Boards Criados", value: boardCount, icon: TrendingUp, color: "bg-purple-500/10 text-purple-500" },
    { label: "Taxa de Retenção", value: `${retentionRate.toFixed(0)}%`, icon: UserCheck, color: "bg-teal-500/10 text-teal-500" },
    { label: "Usuários Ativos (est.)", value: dauEstimate, icon: Activity, color: "bg-indigo-500/10 text-indigo-500" },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="p-5 rounded-xl border border-border bg-card">
          <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
            <card.icon className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold">{card.value}</p>
          <p className="text-sm text-muted-foreground">{card.label}</p>
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
