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

// --- Signed balance convention ------------------------------------------------
// The API stores the TRUE signed balance: positive for asset accounts, negative
// for credit cards / loans (money owed). The UI asks for a positive "Amount
// owed" on debt accounts and negates it before sending. These two helpers are
// the ONLY place that sign logic lives.

export function isDebtAccountType(type: string): boolean {
  return type === "credit_card" || type === "loan";
}

// toSignedBalance converts the value the user typed into the signed balance the
// API stores. Debt accounts enter a positive "Amount owed" which is negated;
// asset accounts pass through unchanged.
export function toSignedBalance(type: string, uiValue: number): number {
  return isDebtAccountType(type) ? -Math.abs(uiValue) : uiValue;
}

// formatBalance renders a signed balance for display. A negative balance on a
// debt account reads as "Owes $1,528.90"; everything else is plain currency.
export function formatBalance(type: string, signed: number): string {
  if (isDebtAccountType(type) && signed < 0) return `Owes ${usd.format(-signed)}`;
  return formatMoney(signed);
}
