import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, LineChart, Pencil, Plus, Trash2 } from "lucide-react";

import { formatMoney } from "@/lib/format";
import type { EnrichedHolding } from "@/lib/api-types";
import { ApiError } from "@/lib/api";
import { useDeleteHolding, useHoldings } from "@/hooks/api/holdings";
import { useCountUp } from "@/hooks/useCountUp";
import { AppHeader } from "@/components/AppHeader";
import { HoldingFormDialog } from "@/components/investments/HoldingFormDialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/investments")({
  component: Investments,
});

function Investments() {
  const { user } = Route.useRouteContext();
  const holdingsQuery = useHoldings();
  const deleteHolding = useDeleteHolding();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<EnrichedHolding | undefined>();
  const [deleting, setDeleting] = useState<EnrichedHolding | undefined>();

  const holdings = useMemo(() => holdingsQuery.data ?? [], [holdingsQuery.data]);
  const totals = useMemo(() => {
    let market = 0,
      cost = 0;
    for (const h of holdings) {
      market += h.market_value ?? 0;
      cost += h.cost_basis ?? 0;
    }
    const gain = market - cost;
    return { market, cost, gain, gainPct: cost > 0 ? (gain / cost) * 100 : 0 };
  }, [holdings]);

  const polygonUnconfigured =
    holdingsQuery.error instanceof ApiError && holdingsQuery.error.status === 503;

  const confirmDelete = () => {
    if (!deleting) return;
    deleteHolding.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(`Deleted ${deleting.ticker}`);
        setDeleting(undefined);
      },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Investments</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track the stocks you own — live prices, gain/loss, and price history.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} disabled={polygonUnconfigured}>
            <Plus className="mr-2 h-4 w-4" /> Add holding
          </Button>
        </div>

        {polygonUnconfigured ? (
          <div className="glass-card mt-10 grid place-items-center rounded-2xl p-16 text-center">
            <LineChart className="h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-semibold">Polygon is not configured</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Set <code className="num-mono">POLYGON_API_KEY</code> on the API server to enable
              stock search, prices and charts.
            </p>
          </div>
        ) : (
          <>
            {/* Portfolio header */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <PortfolioTile label="Market value" value={totals.market} />
              <PortfolioTile label="Cost basis" value={totals.cost} />
              <PortfolioTile
                label="Gain / loss"
                value={totals.gain}
                accent={totals.gain >= 0 ? "text-success" : "text-destructive"}
                suffix={
                  totals.cost > 0
                    ? ` (${totals.gain >= 0 ? "+" : ""}${totals.gainPct.toFixed(2)}%)`
                    : undefined
                }
              />
              <div className="glass-card rounded-2xl p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Holdings
                </p>
                <p className="num-mono mt-2 text-2xl font-semibold sm:text-3xl">
                  {holdings.length}
                </p>
              </div>
            </div>

            {/* Holdings list */}
            <div className="mt-10">
              {holdingsQuery.isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-44 rounded-2xl" />
                  ))}
                </div>
              ) : holdings.length === 0 ? (
                <div className="glass-card grid place-items-center rounded-2xl p-16 text-center">
                  <h3 className="text-lg font-semibold">No holdings yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add your first stock to start tracking gain/loss and price history.
                  </p>
                  <Button className="mt-4" onClick={() => setAddOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add holding
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {holdings.map((h) => (
                    <HoldingCard
                      key={h.id}
                      holding={h}
                      onEdit={() => setEditing(h)}
                      onDelete={() => setDeleting(h)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <HoldingFormDialog open={addOpen} onOpenChange={setAddOpen} />
      {editing && (
        <HoldingFormDialog
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          holding={editing}
        />
      )}

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.ticker}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the holding ({deleting?.quantity} share
              {deleting?.quantity === "1" ? "" : "s"}
              {deleting?.name ? ` of ${deleting.name}` : ""}) from your portfolio. Market data stays
              cached.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteHolding.isPending}>
              {deleteHolding.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PortfolioTile({
  label,
  value,
  accent,
  suffix,
}: {
  label: string;
  value: number;
  accent?: string;
  suffix?: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`num-mono mt-2 text-2xl font-semibold sm:text-3xl ${accent ?? ""}`}>
        {formatMoney(animated)}
        {suffix && <span className="text-base">{suffix}</span>}
      </p>
    </div>
  );
}

function GainBadge({ abs, pct }: { abs: number | null; pct: number | null }) {
  if (abs == null) return <Badge variant="secondary">no quote</Badge>;
  const up = abs >= 0;
  return (
    <Badge
      className={up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}
      variant="secondary"
    >
      {up ? "+" : ""}
      {formatMoney(abs)}
      {pct != null ? ` · ${up ? "+" : ""}${pct.toFixed(2)}%` : ""}
    </Badge>
  );
}

function HoldingCard({
  holding: h,
  onEdit,
  onDelete,
}: {
  holding: EnrichedHolding;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="glass-card group relative rounded-2xl p-6 transition hover:border-primary/40">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="num-mono text-lg font-bold">{h.ticker}</h3>
            <GainBadge abs={h.gain_abs} pct={h.gain_pct} />
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{h.name ?? "—"}</p>
        </div>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Edit holding"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete holding"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <HoldingStat label="Quantity" value={h.quantity} />
        <HoldingStat
          label="Bought"
          value={`${formatMoney(h.purchase_price)} · ${h.purchase_date}`}
        />
        <HoldingStat
          label="Latest"
          value={h.latest_close != null ? formatMoney(h.latest_close) : "—"}
        />
        <HoldingStat
          label="Value"
          value={h.market_value != null ? formatMoney(h.market_value) : "—"}
        />
      </dl>

      <Link
        to="/investments/$holdingId"
        params={{ holdingId: h.id }}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        Open <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function HoldingStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="num-mono mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
