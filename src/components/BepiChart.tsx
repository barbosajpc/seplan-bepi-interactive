import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { BepiDataPoint } from "@/lib/bepi-api";

const COLORS = [
  "#254194",
  "#006835",
  "#F4B900",
  "#DC391F",
  "#0088CC",
  "#8B5CF6",
  "#E67E22",
  "#16A085",
  "#E74C8B",
  "#5D8C3E",
  "#7B68EE",
  "#CD853F",
  "#20B2AA",
  "#DC143C",
  "#4682B4",
  "#DAA520",
  "#2E8B57",
  "#FF6347",
  "#6A5ACD",
  "#3CB371",
  "#FF8C00",
  "#4169E1",
  "#B22222",
  "#32CD32",
  "#8B0000",
  "#00CED1",
];

interface BepiChartProps {
  data: BepiDataPoint[];
  title: string;
}

export function BepiChart({ data, title }: BepiChartProps) {
  const { chartData, seriesKeys } = useMemo(() => {
    // Group by Ano and Origem da Energia
    const byYear = new Map<number, Record<string, number>>();
    const allSeries = new Set<string>();

    for (const d of data) {
      const key = d["Origem da Energia"];
      allSeries.add(key);
      if (!byYear.has(d.Ano)) byYear.set(d.Ano, {});
      const row = byYear.get(d.Ano)!;
      row[key] = (row[key] || 0) + d["Valor da Energia"];
    }

    const years = Array.from(byYear.keys()).sort((a, b) => a - b);
    const chartData = years.map((year) => ({
      Ano: year,
      ...byYear.get(year),
    }));

    return { chartData, seriesKeys: Array.from(allSeries).sort() };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <p>Nenhum dado disponível para esta seleção.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-heading font-semibold text-foreground mb-1">{title}</h2>
      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="Ano"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              label={{ value: "Ano", position: "insideBottom", offset: -5, style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              label={{
                value: "Energia (10³ tep)",
                angle: -90,
                position: "insideLeft",
                offset: -5,
                style: { fontSize: 12, fill: "hsl(var(--muted-foreground))", textAnchor: "middle" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: 12,
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend
              verticalAlign="top"
              wrapperStyle={{ paddingBottom: 16, fontSize: 11 }}
            />
            {seriesKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 2, fill: COLORS[i % COLORS.length] }}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
