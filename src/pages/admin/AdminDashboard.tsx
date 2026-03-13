import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import KpiCards from "@/components/admin/KpiCards";
import RevenueByPlanChart from "@/components/admin/RevenueByPlanChart";
import RetentionChart from "@/components/admin/RetentionChart";

const AdminDashboard = () => {
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
        .select("id, status, plan_id, created_at, canceled_at, subscription_plans(name, display_name, price_brl)");
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

  // Estimate DAU: profiles updated in last 7 days (proxy for activity)
  const { data: dauCount } = useQuery({
    queryKey: ["admin-dau-estimate"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { count, error } = await supabase
        .from("user_profiles")
        .select("user_id", { count: "exact", head: true })
        .gte("updated_at", sevenDaysAgo);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const activeSubs = subs?.filter((s: any) => s.status === "active" || s.status === "trialing").length ?? 0;
  const totalUsers = profiles?.length ?? 0;

  // Retention rate: active subs / total subs that ever existed
  const retentionRate = useMemo(() => {
    if (!subs || subs.length === 0) return 0;
    return (activeSubs / subs.length) * 100;
  }, [subs, activeSubs]);

  // Revenue by plan
  const revenueByPlan = useMemo(() => {
    if (!subs) return [];
    const planMap = new Map<string, { name: string; displayName: string; revenue: number; activeSubs: number }>();

    subs.forEach((s: any) => {
      const planName = (s as any).subscription_plans?.name ?? "unknown";
      const displayName = (s as any).subscription_plans?.display_name ?? planName;
      const price = Number((s as any).subscription_plans?.price_brl ?? 0);
      const isActive = s.status === "active" || s.status === "trialing";

      if (!planMap.has(planName)) {
        planMap.set(planName, { name: planName, displayName, revenue: 0, activeSubs: 0 });
      }
      const entry = planMap.get(planName)!;
      if (isActive) {
        entry.revenue += price;
        entry.activeSubs += 1;
      }
    });

    return Array.from(planMap.values()).sort((a, b) => a.revenue - b.revenue);
  }, [subs]);

  // Chart data for last 6 months
  const chartData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: startOfMonth(now) });

    return months.map((month) => {
      const monthEnd = endOfMonth(month);
      const label = format(month, "MMM", { locale: ptBR });

      const usersUpTo = profiles?.filter((p: any) => p.created_at && parseISO(p.created_at) <= monthEnd).length ?? 0;

      const newUsers = profiles?.filter((p: any) => {
        if (!p.created_at) return false;
        const d = parseISO(p.created_at);
        return d >= month && d <= monthEnd;
      }).length ?? 0;

      const mrr = subs?.reduce((acc: number, s: any) => {
        if (!s.created_at) return acc;
        const created = parseISO(s.created_at);
        if (created > monthEnd) return acc;
        if (s.canceled_at && parseISO(s.canceled_at) < month) return acc;
        const price = (s as any).subscription_plans?.price_brl ?? 0;
        return acc + Number(price);
      }, 0) ?? 0;

      const churned = subs?.filter((s: any) => {
        if (!s.canceled_at) return false;
        const d = parseISO(s.canceled_at);
        return d >= month && d <= monthEnd;
      }).length ?? 0;

      // Retention: active at end of month / total created up to month
      const totalSubsUpTo = subs?.filter((s: any) => s.created_at && parseISO(s.created_at) <= monthEnd).length ?? 0;
      const activeAtMonth = subs?.filter((s: any) => {
        if (!s.created_at) return false;
        const created = parseISO(s.created_at);
        if (created > monthEnd) return false;
        if (s.canceled_at && parseISO(s.canceled_at) < month) return false;
        return true;
      }).length ?? 0;
      const retention = totalSubsUpTo > 0 ? (activeAtMonth / totalSubsUpTo) * 100 : 100;

      return { month: label, users: usersUpTo, newUsers, mrr, churned, retention };
    });
  }, [profiles, subs]);

  const currentMRR = chartData[chartData.length - 1]?.mrr ?? 0;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        <h1 className="text-2xl font-display font-bold mb-1">Painel Administrativo</h1>
        <p className="text-muted-foreground mb-8">Visão geral do sistema Mind Pro AI</p>

        {/* KPI Cards */}
        <KpiCards
          totalUsers={totalUsers}
          activeSubs={activeSubs}
          diagramCount={diagramCount ?? 0}
          boardCount={boardCount ?? 0}
          retentionRate={retentionRate}
          dauEstimate={dauCount ?? 0}
        />

        {/* Charts - Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
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
              <p className="text-2xl font-bold mt-1">{totalUsers} total</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid hsl(30,10%,90%)", fontSize: 13 }} />
                <Line type="monotone" dataKey="users" name="Total" stroke="hsl(27, 100%, 48%)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="newUsers" name="Novos" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts - Row 2 */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
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

          {/* Revenue by Plan */}
          <RevenueByPlanChart data={revenueByPlan} />
        </div>

        {/* Charts - Row 3: Retention */}
        <div className="grid lg:grid-cols-2 gap-6">
          <RetentionChart data={chartData.map((d) => ({ month: d.month, retention: d.retention }))} />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
