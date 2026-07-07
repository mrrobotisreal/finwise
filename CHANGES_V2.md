# FinWise v2 — frontend changes

## 1. Account balances + back-calculated history

- **Signed-balance helpers** (`src/lib/format.ts`): `toSignedBalance(type,
  uiValue)` and `formatBalance(type, signed)` are the *only* place sign logic
  lives. Credit cards / loans are entered as a positive "Amount owed" and
  negated before sending; they display as e.g. "Owes $1,528.90" in
  destructive color.
- **Create-account dialog** gains an optional balance input + "As of" date
  picker (`Calendar` in a `Popover`, future dates disabled), relabeled
  "Amount owed" for debt account types.
- **Account page**: the balance (or "No balance set") sits next to the title
  with an inline edit popover (`BalanceEditPopover`). Opening the CSV upload
  flow on an account with no balance shows a non-blocking "set your balance
  first" callout with a Set-balance shortcut — the upload is never blocked.
- **Analysis tab**: new `BalanceTimeline` (recharts `AreaChart` of the
  server-computed `running` series — sign-tinted fill, $0 reference line,
  min/max header stats, tooltip, and the server's `reconciliation_note` as a
  muted info line). An empty-state row with a Set-balance shortcut renders
  when the analysis has no `balance` block.
- **Dashboard**: account cards show the real `current_balance` (owed-style
  formatting) when set, falling back to the transaction net-sum labeled "Net
  of imported transactions". The overall analysis section gains an animated
  **Net position** row (assets / debts / net via `useCountUp`) plus a one-line
  list of accounts missing a balance.
- Schemas: `accountSchema` gains `balance_as_of`; `balanceBlockSchema` and
  `netPositionSchema` extend the analysis document (both optional for backward
  compatibility with stored results).

## 2. Investments (stocks via the API's Polygon proxy)

- **New dependency: `lightweight-charts`** (TradingView OSS) — used *only* for
  market-price charts; recharts remains for all analysis charts. Wrapped once
  in `src/components/investments/PriceChart.tsx`: chart created in an effect
  (routes stay under the `ssr:false` `_authenticated` layout), `ResizeObserver`
  resizing, dark-theme options matching the app tokens, full cleanup on
  unmount.
- **Navigation**: `AppHeader` gains **Accounts** (`/dashboard`) and
  **Investments** (`/investments`) links with active-route styling.
- **`/investments`**: portfolio stat cards (market value, cost basis,
  gain/loss $ and %, holdings count — `useCountUp` animated), a holdings card
  grid (quantity, purchase info, latest price, value, gain badge), edit via
  the same dialog as add, delete behind a confirm dialog, and a clear
  empty-state when the server reports Polygon is not configured (503).
- **Add-holding dialog** (`react-hook-form` + zod): debounced (300 ms) ticker/
  company search in a `Command` list → purchase date picker (future disabled)
  → that day's OHLC via `useDayPrices` (shows "Market was closed on X; showing
  Y" when the server walked back) → a `Slider` bounded by that day's low/high,
  two-way bound with a numeric input that *accepts* out-of-range values with
  an amber hint (never hard-blocks) → fractional quantity + notes with a live
  cost-basis line. Saving persists the `day_low`/`day_high` snapshot.
- **Detail route `/investments/$holdingId`**: header stats, the `PriceChart`,
  timeframe pills (1D · 3D · 1W · 1M · 90D · 180D · 1Y · 5Y, default 1W) and a
  chart-type toggle (Line · Area · Candlestick · OHLC bars · Baseline). The
  **baseline is anchored at the purchase price** (green above / red below) and
  every chart type draws a dashed "Bought @ price" line.
- **Hooks** (`src/hooks/api/stocks.ts`, `holdings.ts`): `useStockSearch`,
  `useDayPrices`, `useStockBars` (staleTime mirrors the server cache TTLs so
  pill-flipping never refetches inside the window), `useQuote`, plus holdings
  CRUD. Query `retry` is tuned: no retry on 4xx except one delayed retry on
  429, with a friendly "Polygon rate limit" toast. Zod schemas for every
  payload live in `api-types.ts`; holding `quantity` stays an exact decimal
  **string** end-to-end.

## Notes

- No new frontend env vars — the Polygon key is backend-only by design.
- `npm run build` (vite) and `tsc --noEmit` pass.
