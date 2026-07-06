import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import type { CategoryStat } from "@/lib/api-types";
import { formatCompactMoney, formatMoney } from "@/lib/format";

// A pleasant, theme-independent palette for chart fills on the dark surface.
const COLORS = [
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
  "#f87171",
  "#22d3ee",
  "#fb923c",
  "#4ade80",
  "#818cf8",
  "#e879f9",
  "#2dd4bf",
];

const AXIS_COLOR = "#94a3b8";
const GRID_COLOR = "#334155";
const MAX_SLICES = 12;

type ChartRow = {
  slug: string;
  name: string;
  spend: number; // absolute dollars out (positive)
  pct: number;
  label: string;
};

// Minimal, safe typing for recharts' custom tooltip render props.
interface TooltipPayloadItem {
  name?: string | number;
  value?: number | string;
  payload?: ChartRow;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function SpendTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="glass-card rounded-lg border border-border px-3 py-2 text-sm">
      <div className="font-medium text-foreground">{row.name}</div>
      <div className="num-mono text-destructive">{formatMoney(-row.spend)}</div>
      <div className="num-mono text-muted-foreground">{row.pct.toFixed(1)}% of spend</div>
    </div>
  );
}

export function CategoryBreakdown({ categories }: { categories: CategoryStat[] }) {
  const [view, setView] = useState<"bar" | "donut">("bar");

  const rows = useMemo<ChartRow[]>(() => {
    return categories
      .filter((c) => c.total < 0)
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, MAX_SLICES)
      .map((c) => {
        const spend = Math.abs(c.total);
        return {
          slug: c.slug,
          name: c.name,
          spend,
          pct: c.pct,
          label: `${c.pct.toFixed(1)}% · ${formatMoney(spend)}`,
        };
      });
  }, [categories]);

  if (rows.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Spending by category</h3>
        <p className="text-sm text-muted-foreground">No spending to break down yet.</p>
      </div>
    );
  }

  // Height grows with the number of bars so labels stay legible.
  const barHeight = Math.max(280, rows.length * 34 + 40);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Spending by category</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "bar" ? "default" : "outline"}
            onClick={() => setView("bar")}
          >
            Bars
          </Button>
          <Button
            size="sm"
            variant={view === "donut" ? "default" : "outline"}
            onClick={() => setView("donut")}
          >
            Donut
          </Button>
        </div>
      </div>

      {view === "bar" ? (
        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart
            layout="vertical"
            data={rows}
            margin={{ top: 4, right: 96, bottom: 4, left: 8 }}
          >
            <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeOpacity={0.4} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => formatCompactMoney(v)}
              tick={{ fill: AXIS_COLOR, fontSize: 12 }}
              stroke={GRID_COLOR}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fill: AXIS_COLOR, fontSize: 12 }}
              stroke={GRID_COLOR}
              interval={0}
            />
            <Tooltip cursor={{ fill: GRID_COLOR, fillOpacity: 0.2 }} content={<SpendTooltip />} />
            <Bar
              dataKey="spend"
              radius={[0, 4, 4, 0]}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            >
              {rows.map((row, i) => (
                <Cell key={row.slug} fill={COLORS[i % COLORS.length]} />
              ))}
              <LabelList
                dataKey="label"
                position="right"
                fill={AXIS_COLOR}
                fontSize={11}
                className="num-mono"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={barHeight}>
          <PieChart>
            <Tooltip content={<SpendTooltip />} />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }}
            />
            <Pie
              data={rows}
              dataKey="spend"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={2}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            >
              {rows.map((row, i) => (
                <Cell key={row.slug} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default CategoryBreakdown;
