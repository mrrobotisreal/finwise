import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RecurringItem } from "@/lib/api-types";
import { formatMoney } from "@/lib/format";

type SortKey = "merchant" | "cadence_days" | "avg_amount" | "total" | "last_seen";
type SortDir = "asc" | "desc";

// Turn a cadence-in-days into a friendly label.
function cadenceLabel(days: number): string {
  if (days <= 8) return "weekly";
  if (days <= 18) return "biweekly";
  if (days <= 40) return "monthly";
  return `every ${Math.round(days)}d`;
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

export function RecurringChargesTable({ items }: { items: RecurringItem[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo<RecurringItem[]>(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "merchant":
          cmp = compareStrings(a.merchant, b.merchant);
          break;
        case "cadence_days":
          cmp = a.cadence_days - b.cadence_days;
          break;
        case "avg_amount":
          cmp = a.avg_amount - b.avg_amount;
          break;
        case "total":
          cmp = a.total - b.total;
          break;
        case "last_seen":
          cmp = compareStrings(a.last_seen, b.last_seen);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Text columns default to ascending; numeric/date to descending.
      setSortDir(key === "merchant" ? "asc" : "desc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (column !== sortKey) return <ArrowUpDown className="ml-1 inline size-3 opacity-50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline size-3" />
    ) : (
      <ArrowDown className="ml-1 inline size-3" />
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Recurring charges</h3>
        <p className="text-sm text-muted-foreground">No recurring charges detected yet.</p>
      </div>
    );
  }

  const headerBtn =
    "flex items-center font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer";

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Recurring charges</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button type="button" className={headerBtn} onClick={() => toggleSort("merchant")}>
                Merchant
                <SortIcon column="merchant" />
              </button>
            </TableHead>
            <TableHead>
              <button
                type="button"
                className={headerBtn}
                onClick={() => toggleSort("cadence_days")}
              >
                Cadence
                <SortIcon column="cadence_days" />
              </button>
            </TableHead>
            <TableHead className="text-right">
              <button
                type="button"
                className={`${headerBtn} ml-auto`}
                onClick={() => toggleSort("avg_amount")}
              >
                Avg amount
                <SortIcon column="avg_amount" />
              </button>
            </TableHead>
            <TableHead>Typical day(s)</TableHead>
            <TableHead className="text-right">
              <button
                type="button"
                className={`${headerBtn} ml-auto`}
                onClick={() => toggleSort("total")}
              >
                Total
                <SortIcon column="total" />
              </button>
            </TableHead>
            <TableHead>
              <button type="button" className={headerBtn} onClick={() => toggleSort("last_seen")}>
                Last seen
                <SortIcon column="last_seen" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => {
            const days = item.typical_days_of_month ?? [];
            return (
              <TableRow key={`${item.merchant}-${item.kind}-${item.cadence_days}`}>
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span>{item.merchant}</span>
                    <Badge
                      variant={item.kind === "income" ? "secondary" : "outline"}
                      className={item.kind === "income" ? "text-success" : "text-muted-foreground"}
                    >
                      {item.kind}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{cadenceLabel(item.cadence_days)}</Badge>
                </TableCell>
                <TableCell className="num-mono text-right">
                  {formatMoney(item.avg_amount)}
                </TableCell>
                <TableCell className="num-mono text-muted-foreground">
                  {days.length > 0 ? days.join(", ") : "—"}
                </TableCell>
                <TableCell
                  className={`num-mono text-right ${
                    item.total >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatMoney(item.total)}
                </TableCell>
                <TableCell className="num-mono text-muted-foreground">{item.last_seen}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default RecurringChargesTable;
