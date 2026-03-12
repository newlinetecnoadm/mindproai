import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    description: "Para uso pessoal básico",
    features: ["3 mapas mentais", "2 boards Kanban", "Exportar PNG", "Templates básicos"],
    current: true,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$ 29,90",
    period: "/mês",
    description: "Para profissionais",
    features: ["Diagramas ilimitados", "Boards ilimitados", "Até 5 colaboradores", "Exportar PDF + PNG", "Todos os templates", "Sugestões de IA", "Histórico de versões"],
    current: false,
    highlighted: true,
  },
  {
    name: "Business",
    price: "R$ 79,90",
    period: "/mês",
    description: "Para equipes",
    features: ["Tudo do Pro", "Colaboradores ilimitados", "Suporte prioritário"],
    current: false,
    highlighted: false,
  },
];

const AssinaturasPage = () => {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        <h1 className="text-2xl font-display font-bold mb-1">Assinaturas</h1>
        <p className="text-muted-foreground mb-8">Gerencie seu plano e cobrança</p>

        {/* Current plan banner */}
        <div className="p-5 rounded-xl border border-primary/30 bg-accent mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-accent-foreground/70">Plano atual</p>
            <p className="font-display font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Trial Gratuito
            </p>
            <p className="text-sm text-muted-foreground">14 dias restantes</p>
          </div>
          <Button variant="hero">Fazer Upgrade</Button>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-2xl border transition-all ${
                plan.highlighted
                  ? "border-primary bg-card shadow-glow"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold">
                  Recomendado
                </span>
              )}
              <h3 className="font-display font-bold text-lg">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-extrabold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.current ? "secondary" : plan.highlighted ? "hero" : "outline"}
                className="w-full"
                disabled={plan.current}
              >
                {plan.current ? "Plano Atual" : "Selecionar"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssinaturasPage;
