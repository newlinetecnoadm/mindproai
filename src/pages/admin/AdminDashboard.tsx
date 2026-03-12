import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, CreditCard, Brain, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [usersRes, subsRes, diagramsRes, boardsRes] = await Promise.all([
        supabase.from("user_profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id, status", { count: "exact" }),
        supabase.from("diagrams").select("id", { count: "exact", head: true }),
        supabase.from("boards").select("id", { count: "exact", head: true }),
      ]);

      const activeSubs = subsRes.data?.filter((s: any) => s.status === "active" || s.status === "trialing").length ?? 0;

      return {
        totalUsers: usersRes.count ?? 0,
        totalSubscriptions: subsRes.count ?? 0,
        activeSubscriptions: activeSubs,
        totalDiagrams: diagramsRes.count ?? 0,
        totalBoards: boardsRes.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total de Usuários", value: stats?.totalUsers ?? "—", icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Assinaturas Ativas", value: stats?.activeSubscriptions ?? "—", icon: CreditCard, color: "bg-success/10 text-success" },
    { label: "Diagramas Criados", value: stats?.totalDiagrams ?? "—", icon: Brain, color: "bg-blue-500/10 text-blue-500" },
    { label: "Boards Criados", value: stats?.totalBoards ?? "—", icon: TrendingUp, color: "bg-purple-500/10 text-purple-500" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <h1 className="text-2xl font-display font-bold mb-1">Painel Administrativo</h1>
        <p className="text-muted-foreground mb-8">Visão geral do sistema Mind Pro AI</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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

        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Gráficos de MRR, churn e crescimento serão adicionados aqui.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
