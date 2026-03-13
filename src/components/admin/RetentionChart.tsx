import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface RetentionChartProps {
  data: { month: string; retention: number }[];
}

const RetentionChart = ({ data }: RetentionChartProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-sm">Taxa de Retenção Mensal</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          % de assinantes que permanecem ativos mês a mês
        </p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 40%)" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="hsl(0, 0%, 40%)"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid hsl(30,10%,90%)", fontSize: 13 }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Retenção"]}
          />
          <Bar dataKey="retention" fill="hsl(173, 58%, 39%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RetentionChart;
