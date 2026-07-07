import { useQuery } from "@tanstack/react-query";

import { ApiError, apiGet } from "@/lib/api";
import {
  dayPriceResponse,
  stockBarsResponse,
  stockQuoteResponse,
  stockSearchResponse,
  type DayPrice,
  type StockBars,
  type StockQuote,
  type TickerResult,
} from "@/lib/api-types";

// retryOn429: never retry 4xx except a single delayed retry on 429 (Polygon
// rate limit) — mirrors the server's own single-retry behavior.
function retryOn429(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 429) return failureCount < 1;
    if (error.status >= 400 && error.status < 500) return false;
  }
  return failureCount < 2;
}
const RETRY_DELAY_MS = 2500;

// Server-side bars cache TTLs, mirrored as staleTime so flipping timeframe
// pills back and forth never refetches inside the cache window.
const INTRADAY_STALE_MS = 15 * 60 * 1000; // minute/hour timespans
const DAILY_STALE_MS = 12 * 60 * 60 * 1000; // day/week timespans

export function barsStaleTime(range: string): number {
  return range === "1d" || range === "3d" || range === "1w" ? INTRADAY_STALE_MS : DAILY_STALE_MS;
}

// useStockSearch queries Polygon ticker search. Enabled at ≥ 2 characters —
// debounce the input before passing it here.
export function useStockSearch(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ["stock-search", query],
    queryFn: async (): Promise<TickerResult[]> =>
      (await apiGet(`/api/stocks/search?q=${encodeURIComponent(query)}`, stockSearchResponse))
        .results,
    enabled: query.length >= 2,
    staleTime: DAILY_STALE_MS,
    retry: retryOn429,
    retryDelay: RETRY_DELAY_MS,
  });
}

// useDayPrices fetches one trading day's OHLC (weekends walk back server-side;
// compare actual_date to date to detect that).
export function useDayPrices(ticker: string, date: string) {
  return useQuery({
    queryKey: ["stock-day", ticker, date],
    queryFn: async (): Promise<DayPrice> =>
      apiGet(
        `/api/stocks/${encodeURIComponent(ticker)}/day?date=${encodeURIComponent(date)}`,
        dayPriceResponse,
      ),
    enabled: Boolean(ticker) && Boolean(date),
    staleTime: DAILY_STALE_MS,
    retry: retryOn429,
    retryDelay: RETRY_DELAY_MS,
  });
}

export function useStockBars(ticker: string, range: string) {
  return useQuery({
    queryKey: ["stock-bars", ticker, range],
    queryFn: async (): Promise<StockBars> =>
      apiGet(
        `/api/stocks/${encodeURIComponent(ticker)}/bars?range=${encodeURIComponent(range)}`,
        stockBarsResponse,
      ),
    enabled: Boolean(ticker),
    staleTime: barsStaleTime(range),
    retry: retryOn429,
    retryDelay: RETRY_DELAY_MS,
  });
}

export function useQuote(ticker: string) {
  return useQuery({
    queryKey: ["stock-quote", ticker],
    queryFn: async (): Promise<StockQuote> =>
      apiGet(`/api/stocks/${encodeURIComponent(ticker)}/quote`, stockQuoteResponse),
    enabled: Boolean(ticker),
    staleTime: INTRADAY_STALE_MS,
    retry: retryOn429,
    retryDelay: RETRY_DELAY_MS,
  });
}
