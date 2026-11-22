"use client";
/**
 * @name candlestick-chart
 * @category viz
 * @description Opening, highest, lowest and closing values per period (a price, a reading): a thin line from low to high, a body from open to close, filled when it closed lower and hollow when it closed higher, so the direction is never colour alone.
 * @when Showing the range and the direction of a value within each period: prices by day, temperatures by day with their extremes. For the close alone use line-chart; for spread across many observations use box-plot.
 * @example
 * <CandlestickChart
 *   label="Price by day"
 *   data={[
 *     { day: new Date("2026-03-02"), open: 10, high: 12, low: 9.5, close: 11.4 },
 *     { day: new Date("2026-03-03"), open: 11.4, high: 11.8, low: 10.1, close: 10.3 },
 *     { day: new Date("2026-03-04"), open: 10.3, high: 11, low: 10, close: 10.9 },
 *   ]}
 *   x="day"
 * />
 */
import { scaleBand } from "d3-scale";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  axisNumberFormatter,
  ChartAxis,
  ChartContainer,
  ChartEmpty,
  ChartGrid,
  chartLinear,
  ChartSvg,
  ChartTooltip,
  dateFormatter,
  formatNumber,
  readNumber,
  useChartCursor,
  widestText,
  type ChartBaseProps,
} from "@/components/viz/chart";

export type CandlestickChartLabels = { open: string; high: string; low: string; close: string; up: string; down: string; period: string };

export type CandlestickChartProps<T extends object> = ChartBaseProps & {
  /** One object per period, in time order. */
  data: readonly T[];
  /** The field naming the period: a Date, a number or a text. */
  x: keyof T & string;
  open?: keyof T & string;
  high?: keyof T & string;
  low?: keyof T & string;
  close?: keyof T & string;
  /** Replaces the period format. */
  formatX?: (value: unknown) => string;
  timeZone?: string;
  showGrid?: boolean;
  labels?: Partial<CandlestickChartLabels>;
};

const LABELS: CandlestickChartLabels = { open: "Open", high: "High", low: "Low", close: "Close", up: "Closed higher", down: "Closed lower", period: "Period" };

type Candle = { name: string; open: number; high: number; low: number; close: number };

export function CandlestickChart<T extends object>({
  data,
  x,
  open = "open" as keyof T & string,
  high = "high" as keyof T & string,
  low = "low" as keyof T & string,
  close = "close" as keyof T & string,
  formatX,
  timeZone,
  showGrid = true,
  labels: given,
  label,
  aspect,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: CandlestickChartProps<T>) {
  const labels = { ...LABELS, ...given };
  const candles = useMemo(() => {
    const dates = data.map((row) => (row as Record<string, unknown>)[x]).filter((v): v is Date => v instanceof Date);
    const span = dates.length > 1 ? Math.abs((dates[dates.length - 1]?.getTime() ?? 0) - (dates[0]?.getTime() ?? 0)) : 0;
    const dateText = dateFormatter(Math.min(span, 300 * 86400000), "full", locale, timeZone);
    return data.flatMap((row): Candle[] => {
      const o = readNumber(row, open);
      const h = readNumber(row, high);
      const l = readNumber(row, low);
      const c = readNumber(row, close);
      if (o === null || h === null || l === null || c === null) return [];
      const raw = (row as Record<string, unknown>)[x];
      const name = formatX ? formatX(raw) : raw instanceof Date ? dateText(raw) : String(raw ?? "");
      return [{ name, open: o, high: Math.max(h, o, c), low: Math.min(l, o, c), close: c }];
    });
  }, [data, x, open, high, low, close, formatX, locale, timeZone]);
  const cursor = useChartCursor(candles.length);
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const table = {
    caption: label,
    columns: [labels.period, labels.open, labels.high, labels.low, labels.close],
    rows: candles.map((c) => [c.name, number(c.open), number(c.high), number(c.low), number(c.close)]),
  };
  const current = cursor.active === null ? undefined : candles[cursor.active];
  const rowsOf = (c: Candle): { label: string; value: string }[] => [
    { label: labels.open, value: number(c.open) },
    { label: labels.high, value: number(c.high) },
    { label: labels.low, value: number(c.low) },
    { label: labels.close, value: number(c.close) },
    { label: "", value: c.close >= c.open ? labels.up : labels.down },
  ];

  return (
    <div data-slot="candlestick-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer
        aspect={aspect}
        height={height}
        table={table}
        announcement={
          cursor.keyboard && current
            ? `${current.name}: ${rowsOf(current)
                .map((row) => `${row.label} ${row.value}`.trim())
                .join(", ")}`
            : ""
        }
      >
        {({ width, height: plotHeight }) => {
          if (candles.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const top = 10;
          const bottom = 26;
          const lowest = Math.min(...candles.map((c) => c.low));
          const highest = Math.max(...candles.map((c) => c.high));
          const sy = chartLinear(lowest, highest, [plotHeight - bottom, top]);
          const axisY = formatValue ?? axisNumberFormatter(Math.max(Math.abs(lowest), Math.abs(highest)), locale);
          const left = widestText(sy.ticks.map(axisY)) + 12;
          const band = scaleBand<number>()
            .domain(candles.map((_, i) => i))
            .range([left, width - 4])
            .paddingInner(0.3)
            .paddingOuter(0.15);
          const body = Math.max(1, Math.min(14, band.bandwidth()));
          const centre = (i: number): number => (band(i) ?? 0) + band.bandwidth() / 2;
          const every = Math.max(1, Math.ceil((widestText(candles.map((c) => c.name)) + 10) / band.step()));
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                {showGrid ? <ChartGrid offsets={sy.ticks.map((tick) => sy.scale(tick))} from={left} to={width - 4} /> : null}
                <ChartAxis side="left" at={left - 8} ticks={sy.ticks.map((tick) => ({ offset: sy.scale(tick), label: axisY(tick) }))} />
                <ChartAxis side="bottom" at={plotHeight - bottom + 6} ticks={candles.flatMap((c, i) => (i % every === 0 ? [{ offset: centre(i), label: c.name }] : []))} />
                <g aria-hidden="true">
                  {candles.map((c, i) => {
                    const up = c.close >= c.open;
                    const y0 = sy.scale(Math.max(c.open, c.close));
                    const y1 = sy.scale(Math.min(c.open, c.close));
                    return (
                      <g
                        key={i}
                        onPointerEnter={() => cursor.point(i)}
                        className={cn("transition-opacity duration-instant motion-reduce:transition-none", cursor.active !== null && cursor.active !== i && "opacity-40")}
                      >
                        <rect x={band(i) ?? 0} y={top} width={band.bandwidth()} height={plotHeight - bottom - top} fill="transparent" />
                        <line x1={centre(i)} x2={centre(i)} y1={sy.scale(c.high)} y2={sy.scale(c.low)} className={up ? "stroke-chart-1" : "stroke-chart-2"} strokeWidth={1.25} />
                        <rect
                          x={centre(i) - body / 2}
                          y={y0}
                          width={body}
                          height={Math.max(1, y1 - y0)}
                          className={up ? "fill-background stroke-chart-1" : "fill-chart-2 stroke-chart-2"}
                          strokeWidth={1.5}
                        />
                      </g>
                    );
                  })}
                </g>
              </ChartSvg>
              {current && cursor.active !== null ? (
                <ChartTooltip
                  x={centre(cursor.active) + body / 2}
                  y={sy.scale((current.high + current.low) / 2)}
                  side={centre(cursor.active) > width / 2 ? "left" : "right"}
                  title={current.name}
                  rows={rowsOf(current)}
                />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
