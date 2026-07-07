import { useEffect, useRef } from "react";
import {
  AreaSeries,
  BarSeries,
  BaselineSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";

import type { StockBar } from "@/lib/api-types";

export type ChartType = "line" | "area" | "candlestick" | "bars" | "baseline";

// Dark-theme palette matching the app's chart tokens (see MonthlyCashflow).
const AXIS_COLOR = "#94a3b8";
const GRID_COLOR = "#334155";
const BORDER_COLOR = "#334155";
const UP_COLOR = "#34d399";
const DOWN_COLOR = "#f87171";
const LINE_COLOR = "#60a5fa";
const PURCHASE_LINE_COLOR = "#facc15";

// PriceChart is the single lightweight-charts wrapper (market-price charts
// only — recharts stays for analysis). Client-only: the chart is created in an
// effect, resized via ResizeObserver, and destroyed on unmount. The purchase
// price is drawn as a labeled horizontal line on every chart type, and the
// baseline type anchors at it (green above / red below = up or down at a
// glance).
export function PriceChart({
  bars,
  chartType,
  purchasePrice,
  height = 380,
}: {
  bars: StockBar[];
  chartType: ChartType;
  purchasePrice?: number;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const chart = createChart(container, {
      height,
      autoSize: false,
      width: container.clientWidth,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: AXIS_COLOR,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: GRID_COLOR, style: LineStyle.Solid, visible: true },
        horzLines: { color: GRID_COLOR, style: LineStyle.Solid, visible: true },
      },
      rightPriceScale: { borderColor: BORDER_COLOR },
      timeScale: { borderColor: BORDER_COLOR, timeVisible: true, secondsVisible: false },
      crosshair: {
        horzLine: { labelBackgroundColor: "#1e293b" },
        vertLine: { labelBackgroundColor: "#1e293b" },
      },
    });
    chartRef.current = chart;

    const closeData = bars.map((b) => ({ time: b.t as UTCTimestamp, value: b.c }));
    const ohlcData = bars.map((b) => ({
      time: b.t as UTCTimestamp,
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
    }));

    const series = (() => {
      switch (chartType) {
        case "area": {
          const s = chart.addSeries(AreaSeries, {
            lineColor: LINE_COLOR,
            lineWidth: 2,
            topColor: "rgba(96, 165, 250, 0.35)",
            bottomColor: "rgba(96, 165, 250, 0.02)",
          });
          s.setData(closeData);
          return s;
        }
        case "candlestick": {
          const s = chart.addSeries(CandlestickSeries, {
            upColor: UP_COLOR,
            downColor: DOWN_COLOR,
            borderUpColor: UP_COLOR,
            borderDownColor: DOWN_COLOR,
            wickUpColor: UP_COLOR,
            wickDownColor: DOWN_COLOR,
          });
          s.setData(ohlcData);
          return s;
        }
        case "bars": {
          const s = chart.addSeries(BarSeries, {
            upColor: UP_COLOR,
            downColor: DOWN_COLOR,
            thinBars: false,
          });
          s.setData(ohlcData);
          return s;
        }
        case "baseline": {
          const base = purchasePrice ?? closeData[0]?.value ?? 0;
          const s = chart.addSeries(BaselineSeries, {
            baseValue: { type: "price", price: base },
            topLineColor: UP_COLOR,
            topFillColor1: "rgba(52, 211, 153, 0.28)",
            topFillColor2: "rgba(52, 211, 153, 0.02)",
            bottomLineColor: DOWN_COLOR,
            bottomFillColor1: "rgba(248, 113, 113, 0.02)",
            bottomFillColor2: "rgba(248, 113, 113, 0.28)",
            lineWidth: 2,
          });
          s.setData(closeData);
          return s;
        }
        default: {
          const s = chart.addSeries(LineSeries, { color: LINE_COLOR, lineWidth: 2 });
          s.setData(closeData);
          return s;
        }
      }
    })();

    if (purchasePrice != null && Number.isFinite(purchasePrice)) {
      series.createPriceLine({
        price: purchasePrice,
        color: PURCHASE_LINE_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Bought @ ${purchasePrice.toFixed(2)}`,
      });
    }

    chart.timeScale().fitContent();

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, chartType, purchasePrice, height]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}

export default PriceChart;
