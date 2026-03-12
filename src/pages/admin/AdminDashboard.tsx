import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, CreditCard, Brain, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminDashboard = () => {
  // Fetch raw data for stats + charts
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_profiles").select("user_id, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["admin-subs-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, status, plan_id, created_at, canceled_at, subscription_plans(name, price_brl)");
      if (error) throw error;
      return data;
    },
  });

  const { data: diagramCount } = useQuery({
    queryKey: ["admin-diagram-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("diagrams").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: boardCount } = useQuery({
    queryKey: ["admin-board-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("boards").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const activeSubs = subs?.filter((s: any) => s.status === "active" || s.status === "trialing").length ?? 0;

  // Build chart data for last 6 months
  const chartData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: startOfMonth(now) });

    return months.map((month) => {
      const monthEnd = endOfMonth(month);
      const label = format(month, "MMM", { locale: ptBR });

      // Users growth: users created up to this month
      const usersUpTo = profiles?.filter((p: any) => p.created_at && parseISO(p.created_at) <= monthEnd).length ?? 0;

      // New users this month
      const newUsers = profiles?.filter((p: any) => {
        if (!p.created_at) return false;
        const d = parseISO(p.created_at);
        return d >= month && d <= monthEnd;
      }).length ?? 0;

      // MRR: sum of active sub prices at end of month
      const mrr = subs?.reduce((acc: number, s: any) => {
        if (!s.created_at) return acc;
        const created = parseISO(s.created_at);
        if (created > monthEnd) return acc;
        if (s.canceled_at && parseISO(s.canceled_at) < month) return acc;
        const price = (s as any).subscription_plans?.price_brl ?? 0;
        return acc + Number(price);
      }, 0) ?? 0;

      // Churn: canceled this month
      const churned = subs?.filter((s: any) => {
        if (!s.canceled_at) return false;
        const d = parseISO(s.canceled_at);
        return d >= month && d <= monthEnd;
      }).length ?? 0;

      return { month: label, users: usersUpTo, newUsers, mrr, churned };
    });
  }, [profiles, subs]);

  const cards = [
    { label: "Total de Usuários", value: profiles?.length ?? "—", icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Assinaturas Ativas", value: activeSubs, icon: CreditCard, color: "bg-success/10 text-success" },
    { label: "Diagramas Criados", value: diagramCount ?? "—", icon: Brain, color: "bg-blue-500/10 text-blue-500" },
    { label: "Boards Criados", value: boardCount ?? "—", icon: TrendingUp, color: "bg-purple-500/10 text-purple-500" },
  ];

  const currentMRR = chartData[chartData.length - 1]?.mrr ?? 0;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <h1 className="text-2xl font-display font-bold mb-1">Painel Administrativo</h1>
        <p className="text-muted-foreground mb-8">Visão geral do sistema Mind Pro AI</p>

        {/* KPI Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* MRR Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-sm">MRR (Receita Recorrente Mensal)</h3>
              <p className="text-2xl font-bold mt-1">
                R$ {currentMRR.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(30,10%,90%)", fontSize: 13 }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2).replace(".", ",")}`, "MRR"]}
                />
                <Area type="monotone" dataKey="mrr" stroke="hsl(142, 71%, 45%)" fill="url(#mrrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* User Growth Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-sm">Crescimento de Usuários</h3>
              <p className="text-2xl font-bold mt-1">{profiles?.length ?? 0} total</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(30,10%,90%)", fontSize: 13 }}
                />
                <Line type="monotone" dataKey="users" name="Total" stroke="hsl(27, 100%, 48%)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="newUsers" name="Novos" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Churn Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-sm">Churn (Cancelamentos)</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Cancelamentos por mês</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(30,10%,90%)", fontSize: 13 }}
                  formatter={(value: number) => [value, "Cancelamentos"]}
                />
                <Bar dataKey="churned" fill="hsl(0, 72%, 51%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* New Users Bar Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-sm">Novos Cadastros por Mês</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Últimos 6 meses</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(30,10%,90%)", fontSize: 13 }}
                  formatter={(value: number) => [value, "Novos usuários"]}
                />
                <Bar dataKey="newUsers" fill="hsl(27, 100%, 48%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
