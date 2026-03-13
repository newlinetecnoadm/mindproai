import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";

interface PlanRevenue {
  name: string;
  displayName: string;
  revenue: number;
  activeSubs: number;
}

interface RevenueByPlanChartProps {
  data: PlanRevenue[];
}

const COLORS = [
  "hsl(27, 100%, 48%)",
  "hsl(142, 71%, 45%)",
  "hsl(221, 83%, 53%)",
  "hsl(280, 70%, 55%)",
];

const RevenueByPlanChart = ({ data }: RevenueByPlanChartProps) => {
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const chartData = data.filter((d) => d.revenue > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-sm">Receita por Plano</h3>
        <p className="text-2xl font-bold mt-1">
          R$ {totalRevenue.toFixed(2).replace(".", ",")}
          <span className="text-sm font-normal text-muted-foreground ml-1">/mês</span>
        </p>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-10 text-center">
          Nenhuma receita recorrente ainda
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="revenue"
              nameKey="displayName"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              strokeWidth={2}
              stroke="hsl(var(--card))"
            >
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid hsl(30,10%,90%)", fontSize: 13 }}
              formatter={(value: number) => [`R$ ${value.toFixed(2).replace(".", ",")}`, "Receita"]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value: string) => <span className="text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      {/* Table breakdown */}
      <div className="mt-4 space-y-2">
        {data.map((plan, idx) => (
          <div key={plan.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span>{plan.displayName}</span>
              <span className="text-xs text-muted-foreground">({plan.activeSubs} ativos)</span>
            </div>
            <span className="font-medium">
              R$ {plan.revenue.toFixed(2).replace(".", ",")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RevenueByPlanChart;
