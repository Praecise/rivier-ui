"use client";
/**
 * @name histogram
 * @category viz
 * @description How the values of one measure are spread: the range cut into equal bins, each bar as tall as the number of values that fall in it, with arrow-key reading of each bin.
 * @when Seeing the shape of a distribution: where most values are, how wide, whether there are two humps or a long tail. To compare the spread of several groups use box-plot; to compare totals across categories use bar-chart.
 * @example
 * <Histogram
 *   label="Delivery times"
 *   data={[{ minutes: 22 }, { minutes: 31 }, { minutes: 28 }, { minutes: 45 }, { minutes: 26 }, { minutes: 33 }]}
 *   value="minutes"
 *   valueLabel="Minutes"
 *   bins={8}
 * />
 */
import { bin } from "d3-array";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  axisNumberFormatter,
  ChartAxis,
  ChartContainer,
  ChartEmpty,
  ChartGrid,
  chartLinear,
  chartSeries,
  ChartSvg,
  ChartTooltip,
  formatNumber,
  readNumber,
  useChartCursor,
  widestText,
  type ChartBaseProps,
} from "@/components/viz/chart";

export type HistogramProps<T extends object> = ChartBaseProps & {
  /** One object per observation. */
  data: readonly T[];
  /** The field that holds the measured number. */
  value: keyof T & string;
  /** About how many bins. The edges are rounded to nice numbers, so the count can differ a little. Default 10. */
  bins?: number;
  /** The range to bin over. Default: the data's own. */
  domain?: readonly [number, number];
  /** Bars as a share of all observations instead of a count. */
  share?: boolean;
  /** The measure's name, under the axis and in the table. Default: the field name. */
  valueLabel?: string;
  /** The name of the bar heights. Default "Count", or "Share" with `share`. */
  countLabel?: string;
  showGrid?: boolean;
};

const GAP = 2;
const ROUND = "[rx:min(var(--radius),4px)] [ry:min(var(--radius),4px)]";

export function Histogram<T extends object>({
  data,
  value,
  bins = 10,
  domain,
  share = false,
  valueLabel,
  countLabel,
  showGrid = true,
  label,
  aspect,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: HistogramProps<T>) {
  const groups = useMemo(() => {
    const values = data.flatMap((row) => {
      const number = readNumber(row, value);
      return number === null ? [] : [number];
    });
    if (values.length === 0)
      return {
        total: 0,
        cells: [] as { x0: number; x1: number; count: number }[],
      };
    const binner = bin().thresholds(bins);
    if (domain) binner.domain([domain[0], domain[1]]);
    const cells = binner(values).map((cell) => ({
      x0: cell.x0 ?? 0,
      x1: cell.x1 ?? 0,
      count: cell.length,
    }));
    return { total: values.length, cells };
  }, [data, value, bins, domain]);

  const { cells, total } = groups;
  const cursor = useChartCursor(cells.length);
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const percent = (amount: number): string =>
    formatNumber(amount, locale, {
      style: "percent",
      maximumFractionDigits: 1,
    });
  const height_ = (count: number): number => (share ? count / Math.max(1, total) : count);
  const heightText = (count: number): string => (share ? percent(count / Math.max(1, total)) : formatNumber(count, locale));
  const names = {
    value: valueLabel ?? value,
    count: countLabel ?? (share ? "Share" : "Count"),
  };
  const range = (cell: { x0: number; x1: number }): string => `${number(cell.x0)} – ${number(cell.x1)}`;
  const table = {
    caption: label,
    columns: [names.value, names.count],
    rows: cells.map((cell) => [range(cell), heightText(cell.count)]),
  };
  const current = cursor.active === null ? undefined : cells[cursor.active];

  return (
    <div data-slot="histogram" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer aspect={aspect} height={height} table={table} announcement={cursor.keyboard && current ? `${range(current)}: ${heightText(current.count)}` : ""}>
        {({ width, height: plotHeight }) => {
          if (cells.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const top = 10;
          const bottom = 44;
          const highest = Math.max(...cells.map((cell) => height_(cell.count)));
          const sy = chartLinear(0, highest || 1, [plotHeight - bottom, top]);
          const axisY = share ? percent : axisNumberFormatter(highest);
          const left = widestText(sy.ticks.map(axisY)) + 12;
          const first = cells[0]?.x0 ?? 0;
          const last = cells[cells.length - 1]?.x1 ?? 1;
          const sx = chartLinear(first, last, [left, width - 8], 70);
          sx.scale.domain([first, last]);
          const ticks = sx.scale.ticks(Math.max(2, Math.floor((width - left) / 70)));
          const axisX = formatValue ?? axisNumberFormatter(Math.max(Math.abs(first), Math.abs(last)), locale);
          const zero = sy.scale(0);
          const shown = current
            ? {
                x: (sx.scale(current.x0) + sx.scale(current.x1)) / 2,
                y: sy.scale(height_(current.count)),
              }
            : undefined;
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                {showGrid ? <ChartGrid offsets={sy.ticks.map((tick) => sy.scale(tick))} from={left} to={width - 8} /> : null}
                <ChartAxis
                  side="left"
                  at={left - 8}
                  ticks={sy.ticks.map((tick) => ({
                    offset: sy.scale(tick),
                    label: axisY(tick),
                  }))}
                />
                <ChartAxis
                  side="bottom"
                  at={plotHeight - bottom + 6}
                  ticks={ticks.map((tick) => ({
                    offset: sx.scale(tick),
                    label: axisX(tick),
                  }))}
                />
                <text aria-hidden="true" x={(left + width) / 2} y={plotHeight - 4} textAnchor="middle" className="fill-muted-foreground">
                  {names.value}
                </text>
                <g aria-hidden="true">
                  {cells.map((cell, index) => {
                    const x0 = sx.scale(cell.x0) + GAP / 2;
                    const w = Math.max(1, sx.scale(cell.x1) - sx.scale(cell.x0) - GAP);
                    const y = sy.scale(height_(cell.count));
                    const h = zero - y;
                    return (
                      <g key={index} className={cn("transition-opacity duration-instant motion-reduce:transition-none", cursor.active !== null && cursor.active !== index && "opacity-45")}>
                        {h > 0 ? (
                          <>
                            <rect x={x0} y={y} width={w} height={h} className={cn(chartSeries(0).fill, ROUND)} />
                            <rect x={x0} y={y + h / 2} width={w} height={h / 2} className={chartSeries(0).fill} />
                          </>
                        ) : null}
                        <rect
                          x={sx.scale(cell.x0)}
                          y={top}
                          width={Math.max(1, sx.scale(cell.x1) - sx.scale(cell.x0))}
                          height={zero - top}
                          fill="transparent"
                          onPointerEnter={() => cursor.point(index)}
                        />
                      </g>
                    );
                  })}
                  <line x1={left} x2={width - 8} y1={zero} y2={zero} className="stroke-border-strong" shapeRendering="crispEdges" />
                </g>
              </ChartSvg>
              {shown && current ? (
                <ChartTooltip
                  x={shown.x}
                  y={shown.y}
                  align="center"
                  side={shown.x > width / 2 ? "left" : "right"}
                  title={range(current)}
                  rows={[
                    {
                      label: names.count,
                      value: heightText(current.count),
                      index: 0,
                      mark: "rect",
                    },
                  ]}
                />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
