"use client";
/**
 * @name donut-chart
 * @category viz
 * @description A ring showing how one whole splits into at most five parts, with a label in the centre and each part's value and share in the legend.
 * @when Parts of a whole at a glance, when there are few parts and they differ clearly. To compare parts that are close in size, or more than five, use bar-chart with `orientation="horizontal"`; for one ratio against a limit use radial-progress.
 * @example
 * <DonutChart
 *   label="Traffic by source"
 *   data={[
 *     { source: "Search", visits: 5200 },
 *     { source: "Direct", visits: 3100 },
 *     { source: "Referral", visits: 1400 },
 *   ]}
 *   name="source"
 *   value="visits"
 *   centerLabel="Visits"
 * />
 */
import { arc as arcShape, pie as pieLayout } from "d3-shape";
import { useMemo, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ChartContainer, ChartLegend, chartSeries, ChartSvg, ChartTooltip, formatNumber, readNumber, type ChartFormat } from "@/components/viz/chart";

export type DonutChartProps<T extends object> = Omit<ComponentProps<"div">, "children"> &
  Omit<ChartFormat, "timeZone"> & {
    /** One object per part. Parts that are zero, negative or missing are left out. */
    data: readonly T[];
    /** The field that names the part. */
    name: keyof T & string;
    /** The field that holds its amount. */
    value: keyof T & string;
    /** What the chart shows, for assistive technology. */
    label: string;
    /** The word under the total in the centre. */
    centerLabel?: string;
    /** Replaces the centre (the total and `centerLabel`) with your own content. */
    children?: ReactNode;
    /** The name of the slice that the smallest parts are folded into when there are more than five. */
    otherLabel?: string;
    /** The legend lists every part with its value and share. Default true. */
    showLegend?: boolean;
  };

type Slice = { name: string; value: number; index: number };

/** More slices than this cannot be told apart; the rest become "Other". */
const MAX_SLICES = 5;
/** The space between slices, in pixels: background showing through, so neighbours separate without colour. */
const GAP = 2;

export function DonutChart<T extends object>({
  data,
  name,
  value,
  label,
  centerLabel = "Total",
  children,
  otherLabel = "Other",
  showLegend = true,
  locale,
  formatValue,
  className,
  ...props
}: DonutChartProps<T>) {
  const [active, setActive] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);

  const { slices, total } = useMemo(() => {
    const parts = data.flatMap((row) => {
      const amount = readNumber(row, value);
      return amount !== null && amount > 0 ? [{ name: String((row as Record<string, unknown>)[name] ?? ""), value: amount }] : [];
    });
    let kept: Slice[];
    if (parts.length <= MAX_SLICES) {
      kept = parts.map((part, index) => ({ ...part, index }));
    } else {
      // Keep the four largest, in the order they were given, and fold the rest into one neutral slice.
      const largest = new Set([...parts].sort((a, b) => b.value - a.value).slice(0, MAX_SLICES - 1));
      kept = parts.filter((part) => largest.has(part)).map((part, index) => ({ ...part, index }));
      const rest = parts.filter((part) => !largest.has(part)).reduce((sum, part) => sum + part.value, 0);
      kept.push({ name: otherLabel, value: rest, index: -1 });
    }
    return { slices: kept, total: kept.reduce((sum, slice) => sum + slice.value, 0) };
  }, [data, name, value, otherLabel]);

  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const share = (amount: number): string => formatNumber(total > 0 ? amount / total : 0, locale, { style: "percent", maximumFractionDigits: 0 });
  const table = { caption: label, columns: [name, value, "Share"], rows: slices.map((slice) => [slice.name, number(slice.value), share(slice.value)]) };
  const current = active === null ? undefined : slices[active];
  const announcement = keyboard && current ? `${current.name}: ${number(current.value)}, ${share(current.value)}` : "";

  const move = (step: number): void => {
    if (slices.length === 0) return;
    setKeyboard(true);
    setActive((index) => (index === null ? (step > 0 ? 0 : slices.length - 1) : (index + step + slices.length) % slices.length));
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") move(1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") move(-1);
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  };

  return (
    <div data-slot="donut-chart" className={cn("@container w-full min-w-0", className)} {...props}>
      <div className="flex flex-col items-center gap-4 @sm:flex-row @sm:gap-6">
        <ChartContainer aspect={1} table={table} announcement={announcement} className="max-w-56 shrink-0">
          {(size) => {
            const outer = Math.min(size.width, size.height) / 2;
            const inner = outer - Math.max(10, Math.min(28, outer * 0.26));
            const arcs = pieLayout<Slice>()
              .value((slice) => slice.value)
              .sort(null)
              .padAngle(slices.length > 1 ? GAP / outer : 0)(slices);
            const path = arcShape<(typeof arcs)[number]>().innerRadius(inner).outerRadius(outer).padRadius(outer);
            const hovered = active === null ? undefined : arcs[active];
            const centroid = hovered ? path.centroid(hovered) : [0, 0];
            const tooltipX = size.width / 2 + (centroid[0] ?? 0);
            return (
              <>
                <ChartSvg
                  label={label}
                  width={size.width}
                  height={size.height}
                  interactive
                  onKeyDown={onKeyDown}
                  onPointerLeave={() => setActive(null)}
                  onFocus={(event) => {
                    if (event.currentTarget.matches(":focus-visible")) move(1);
                  }}
                  onBlur={() => setActive(null)}
                >
                  <g aria-hidden="true" transform={`translate(${size.width / 2},${size.height / 2})`}>
                    {arcs.map((arc, index) => (
                      <path
                        key={index}
                        d={path(arc) ?? undefined}
                        className={cn(chartSeries(arc.data.index).fill, "transition-opacity duration-instant motion-reduce:transition-none", active !== null && active !== index && "opacity-45")}
                        onPointerEnter={() => {
                          setKeyboard(false);
                          setActive(index);
                        }}
                      />
                    ))}
                  </g>
                </ChartSvg>
                <div data-slot="donut-chart-center" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                  {children ?? (
                    <>
                      <span className="text-2xl font-semibold text-foreground">{number(total)}</span>
                      <span className="text-xs text-muted-foreground">{centerLabel}</span>
                    </>
                  )}
                </div>
                {current ? (
                  <ChartTooltip
                    x={tooltipX}
                    y={size.height / 2 + (centroid[1] ?? 0)}
                    side={tooltipX > size.width / 2 ? "left" : "right"}
                    rows={[{ label: current.name, value: `${number(current.value)} · ${share(current.value)}`, index: current.index, mark: "rect" }]}
                  />
                ) : null}
              </>
            );
          }}
        </ChartContainer>
        {showLegend ? (
          <ChartLegend
            orientation="vertical"
            mark="rect"
            className="w-full min-w-0 @sm:flex-1"
            items={slices.map((slice) => ({ label: slice.name, index: slice.index, value: `${number(slice.value)} · ${share(slice.value)}` }))}
          />
        ) : null}
      </div>
    </div>
  );
}
