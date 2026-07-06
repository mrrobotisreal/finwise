// Shared money formatting so every surface renders currency identically.
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// formatMoney renders e.g. 1234.56 → "$1,234.56" and -1234.56 → "-$1,234.56".
export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return usd.format(n);
}

// formatMoneyWhole drops cents — used for compact axis ticks / large tiles.
export function formatMoneyWhole(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  return usdWhole.format(n);
}

// formatCompactMoney abbreviates large magnitudes for chart axes: 1234 → "$1.2k".
export function formatCompactMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}
