import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Info, Wallet } from "lucide-react";

import type { BalanceBlock, BalancePoint } from "@/lib/api-types";
import { formatCompactMoney, formatMoney } from "@/lib/format";

const POSITIVE_COLOR = "#34d399";
const NEGATIVE_COLOR = "#f87171";
const AXIS_COLOR = "#94a3b8";
const GRID_COLOR = "#334155";

interface TooltipPayloadItem {
  payload?: BalancePoint;
}
interface BalanceTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function BalanceTooltip({ active, payload }: BalanceTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="glass-card rounded-lg border border-border px-3 py-2 text-sm">
      <div className="mb-1 font-medium text-foreground">{row.date}</div>
      <div className={`num-mono ${row.balance >= 0 ? "text-success" : "text-destructive"}`}>
        {formatMoney(row.balance)}
      </div>
    </div>
  );
}

// BalanceTimeline renders the back-calculated running balance as an animated
// area chart: area tinted by the series' overall sign, a $0 reference line,
// min/max as header stat text, and the reconciliation note (when the implied
// starting balance looks suspicious) as a muted info line.
export function BalanceTimeline({ balance }: { balance: BalanceBlock }) {
  const rows = balance.running;
  // Tint by where the series lives: mostly-negative (a card balance) reads red.
  const negative = useMemo(() => rows.length > 0 && rows[rows.length - 1].balance < 0, [rows]);
  const color = negative ? NEGATIVE_COLOR : POSITIVE_COLOR;

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wallet className="h-4 w-4 text-primary" /> Balance timeline
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Back-calculated from {formatMoney(balance.current_balance)} as of {balance.as_of} ·
            implied start {formatMoney(balance.implied_starting_balance)} on {balance.starting_date}
          </p>
        </div>
        <div className="flex gap-5 text-xs">
          <div>
            <p className="uppercase tracking-wider text-muted-foreground">Low</p>
            <p
              className={`num-mono mt-0.5 font-semibold ${balance.min.balance >= 0 ? "text-success" : "text-destructive"}`}
            >
              {formatMoney(balance.min.balance)}
            </p>
            <p className="text-muted-foreground">{balance.min.date}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-muted-foreground">High</p>
            <p
              className={`num-mono mt-0.5 font-semibold ${balance.max.balance >= 0 ? "text-success" : "text-destructive"}`}
            >
              {formatMoney(balance.max.balance)}
            </p>
            <p className="text-muted-foreground">{balance.max.date}</p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <defs>
            <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.4} />
          <XAxis
            dataKey="date"
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            stroke={GRID_COLOR}
            interval="preserveStartEnd"
            minTickGap={48}
          />
          <YAxis
            tickFormatter={(v: number) => formatCompactMoney(v)}
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
            stroke={GRID_COLOR}
            width={64}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<BalanceTooltip />} />
          <ReferenceLine y={0} stroke={AXIS_COLOR} strokeDasharray="4 4" strokeOpacity={0.6} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={color}
            strokeWidth={2}
            fill="url(#balanceFill)"
            isAnimationActive
            animationBegin={0}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>

      {balance.reconciliation_note && (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {balance.reconciliation_note}
        </p>
      )}
    </div>
  );
}

export default BalanceTimeline;
