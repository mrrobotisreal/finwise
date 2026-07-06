import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import type { Fees } from "@/lib/api-types";
import { formatMoney } from "@/lib/format";

const BAR_COLOR = "#f87171";

export function FeesBreakdown({ fees }: { fees: Fees }) {
  const sortedTypes = useMemo(
    () => [...fees.by_type].sort((a, b) => Math.abs(b.total) - Math.abs(a.total)),
    [fees.by_type],
  );

  if (fees.total === 0 && fees.waived === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Fees</h3>
        <p className="text-sm text-muted-foreground">No fees in this period — nice.</p>
      </div>
    );
  }

  const totalMagnitude = Math.abs(fees.total);
  const netFees = fees.total - fees.waived;
  const maxType = sortedTypes.reduce((m, t) => Math.max(m, Math.abs(t.total)), 0);

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Fees</h3>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Total fees</div>
          <div className="num-mono mt-1 text-xl font-semibold text-destructive">
            {formatMoney(fees.total)}
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Waived / offsets
          </div>
          <div className="num-mono mt-1 text-xl font-semibold text-success">
            {formatMoney(fees.waived)}
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Net fees</div>
          <div
            className={`num-mono mt-1 text-xl font-semibold ${
              netFees > 0 ? "text-destructive" : "text-success"
            }`}
          >
            {formatMoney(netFees)}
          </div>
        </div>
      </div>

      {sortedTypes.length > 0 && (
        <div className="space-y-2">
          {sortedTypes.map((t) => {
            const magnitude = Math.abs(t.total);
            const widthPct = maxType > 0 ? Math.max(4, (magnitude / maxType) * 100) : 0;
            return (
              <div key={t.type} className="flex items-center gap-3">
                <div className="flex w-40 shrink-0 items-center gap-2">
                  <span className="truncate text-sm text-foreground">{t.type}</span>
                  <Badge variant="secondary">{t.count}</Badge>
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${widthPct}%`, backgroundColor: BAR_COLOR }}
                  />
                </div>
                <div className="num-mono w-24 shrink-0 text-right text-sm text-destructive">
                  {formatMoney(t.total)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalMagnitude === 0 && sortedTypes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No itemized fee types, but offsets were recorded.
        </p>
      )}
    </div>
  );
}

export default FeesBreakdown;
