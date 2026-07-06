import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthlyStat } from "@/lib/api-types";
import { formatCompactMoney, formatMoney } from "@/lib/format";

const INCOME_COLOR = "#34d399";
const SPEND_COLOR = "#f87171";
const NET_COLOR = "#60a5fa";
const AXIS_COLOR = "#94a3b8";
const GRID_COLOR = "#334155";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "2026-01" -> "Jan '26"
function formatMonth(month: string): string {
  const [year, mo] = month.split("-");
  const idx = Number(mo) - 1;
  const name = MONTH_NAMES[idx];
  if (!name || !year) return month;
  return `${name} '${year.slice(2)}`;
}

type ChartRow = {
  month: string;
  label: string;
  income: number;
  spend: number; // rendered as a positive magnitude for a readable bar
  net: number;
};

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number | string;
  payload?: ChartRow;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

function CashflowTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="glass-card rounded-lg border border-border px-3 py-2 text-sm">
      <div className="mb-1 font-medium text-foreground">{row.label}</div>
      <div className="num-mono text-success">Income {formatMoney(row.income)}</div>
      <div className="num-mono text-destructive">Spend {formatMoney(-row.spend)}</div>
      <div className="num-mono text-primary">Net {formatMoney(row.net)}</div>
    </div>
  );
}

export function MonthlyCashflow({ monthly }: { monthly: MonthlyStat[] }) {
  const rows = useMemo<ChartRow[]>(
    () =>
      monthly.map((m) => ({
        month: m.month,
        label: formatMonth(m.month),
        income: m.income,
        spend: Math.abs(m.spend),
        net: m.net,
      })),
    [monthly],
  );

  if (rows.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Monthly cashflow</h3>
        <p className="text-sm text-muted-foreground">No monthly activity to show yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Monthly cashflow</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.4} />
          <XAxis
            dataKey="label"
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
            stroke={GRID_COLOR}
            interval="preserveStartEnd"
            angle={rows.length > 8 ? -35 : 0}
            textAnchor={rows.length > 8 ? "end" : "middle"}
            height={rows.length > 8 ? 48 : 24}
          />
          <YAxis
            tickFormatter={(v: number) => formatCompactMoney(v)}
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
            stroke={GRID_COLOR}
            width={56}
          />
          <Tooltip cursor={{ fill: GRID_COLOR, fillOpacity: 0.2 }} content={<CashflowTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
          <Bar
            name="Income"
            dataKey="income"
            fill={INCOME_COLOR}
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationBegin={0}
            animationDuration={900}
            animationEasing="ease-out"
          />
          <Bar
            name="Spend"
            dataKey="spend"
            fill={SPEND_COLOR}
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationBegin={150}
            animationDuration={900}
            animationEasing="ease-out"
          />
          <Line
            name="Net"
            type="monotone"
            dataKey="net"
            stroke={NET_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: NET_COLOR }}
            activeDot={{ r: 5 }}
            isAnimationActive
            animationBegin={300}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MonthlyCashflow;
