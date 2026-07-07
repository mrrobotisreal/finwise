import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CandlestickChart,
  ChartArea,
  ChartLine,
  ChartNoAxesColumn,
  Baseline,
} from "lucide-react";

import { formatMoney } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { useHoldings } from "@/hooks/api/holdings";
import { useStockBars } from "@/hooks/api/stocks";
import { AppHeader } from "@/components/AppHeader";
import { PriceChart, type ChartType } from "@/components/investments/PriceChart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/_authenticated/investments_/$holdingId")({
  component: HoldingDetail,
});

const TIMEFRAMES = [
  { value: "1d", label: "1D" },
  { value: "3d", label: "3D" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "90d", label: "90D" },
  { value: "180d", label: "180D" },
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
] as const;

const CHART_TYPES: { value: ChartType; label: string; icon: typeof ChartLine }[] = [
  { value: "line", label: "Line", icon: ChartLine },
  { value: "area", label: "Area", icon: ChartArea },
  { value: "candlestick", label: "Candles", icon: CandlestickChart },
  { value: "bars", label: "OHLC", icon: ChartNoAxesColumn },
  { value: "baseline", label: "Baseline", icon: Baseline },
];

function HoldingDetail() {
  const { holdingId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const holdingsQuery = useHoldings();
  const holding = holdingsQuery.data?.find((h) => h.id === holdingId);

  const [range, setRange] = useState("1w");
  const [chartType, setChartType] = useState<ChartType>("line");

  const barsQuery = useStockBars(holding?.ticker ?? "", range);

  // Friendly toast on Polygon rate limits (after the hook's single retry).
  useEffect(() => {
    if (barsQuery.error instanceof ApiError && barsQuery.error.status === 429) {
      toast.error("Polygon rate limit — hang on a few seconds");
    }
  }, [barsQuery.error]);

  if (!holdingsQuery.isLoading && !holding) {
    return (
      <div className="min-h-screen">
        <AppHeader email={user.email} />
        <div className="mx-auto max-w-3xl p-10 text-center">
          <p className="text-muted-foreground">Holding not found.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/investments" })}>
            Back to investments
          </Button>
        </div>
      </div>
    );
  }

  const gainUp = (holding?.gain_abs ?? 0) >= 0;

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link
          to="/investments"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All holdings
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="num-mono text-3xl font-bold">{holding?.ticker ?? "…"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{holding?.name ?? ""}</p>
          </div>
          {holding && (
            <div className="flex flex-wrap gap-6 text-sm">
              <HeaderStat label="Quantity" value={holding.quantity} />
              <HeaderStat
                label="Cost basis"
                value={holding.cost_basis != null ? formatMoney(holding.cost_basis) : "—"}
              />
              <HeaderStat
                label="Current value"
                value={holding.market_value != null ? formatMoney(holding.market_value) : "—"}
              />
              <HeaderStat
                label="Gain / loss"
                value={
                  holding.gain_abs != null
                    ? `${gainUp ? "+" : ""}${formatMoney(holding.gain_abs)}${
                        holding.gain_pct != null
                          ? ` (${gainUp ? "+" : ""}${holding.gain_pct.toFixed(2)}%)`
                          : ""
                      }`
                    : "—"
                }
                accent={
                  holding.gain_abs != null
                    ? gainUp
                      ? "text-success"
                      : "text-destructive"
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setRange(tf.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  range === tf.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <ToggleGroup
            type="single"
            value={chartType}
            onValueChange={(v) => v && setChartType(v as ChartType)}
            variant="outline"
            size="sm"
          >
            {CHART_TYPES.map((ct) => (
              <ToggleGroupItem
                key={ct.value}
                value={ct.value}
                aria-label={ct.label}
                className="gap-1.5 px-3"
              >
                <ct.icon className="h-3.5 w-3.5" /> {ct.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Chart */}
        <div className="glass-card mt-4 rounded-2xl p-5">
          {barsQuery.isLoading || !holding ? (
            <Skeleton className="h-[380px] w-full rounded-xl" />
          ) : barsQuery.data && barsQuery.data.bars.length > 0 ? (
            <PriceChart
              bars={barsQuery.data.bars}
              chartType={chartType}
              purchasePrice={holding.purchase_price}
            />
          ) : (
            <div className="grid h-[380px] place-items-center text-sm text-muted-foreground">
              {barsQuery.error
                ? barsQuery.error instanceof ApiError && barsQuery.error.status === 429
                  ? "Polygon rate limit — try again in a few seconds."
                  : (barsQuery.error as Error).message
                : "No price data for this window."}
            </div>
          )}
          {holding && (
            <p className="mt-3 text-xs text-muted-foreground">
              Dashed line marks your purchase at {formatMoney(holding.purchase_price)} on{" "}
              {holding.purchase_date}
              {holding.day_low != null && holding.day_high != null
                ? ` (that day's range: ${formatMoney(holding.day_low)} – ${formatMoney(holding.day_high)})`
                : ""}
              . Baseline view colors green above / red below that price.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function HeaderStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`num-mono mt-0.5 text-lg font-semibold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
