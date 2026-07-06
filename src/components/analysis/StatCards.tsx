import type { Fees, Totals } from "@/lib/api-types";
import { formatMoney } from "@/lib/format";
import { useCountUp } from "@/hooks/useCountUp";

type Tile = {
  label: string;
  target: number;
  colorClass: string;
};

function StatTile({ label, target, colorClass }: Tile) {
  const value = useCountUp(target);
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`num-mono mt-2 text-2xl font-semibold sm:text-3xl ${colorClass}`}>
        {formatMoney(value)}
      </div>
    </div>
  );
}

export function StatCards({ totals, fees }: { totals: Totals; fees: Fees }) {
  const tiles: Tile[] = [
    { label: "Income", target: totals.income, colorClass: "text-success" },
    { label: "Spend", target: totals.spend, colorClass: "text-destructive" },
    {
      label: "Net",
      target: totals.net,
      colorClass: totals.net >= 0 ? "text-success" : "text-destructive",
    },
    { label: "Fees", target: fees.total, colorClass: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <StatTile key={tile.label} {...tile} />
      ))}
    </div>
  );
}

export default StatCards;
