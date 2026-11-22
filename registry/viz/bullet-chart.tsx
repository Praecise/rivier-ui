"use client";
/**
 * @name bullet-chart
 * @category viz
 * @description One measure against its target and its bands (poor, fair, good) in a single slim row: the value as a bar, the target as a tick, the bands as steps of grey behind them. Several rows stack, each on its own scale.
 * @when Showing how a few measures stand against their goals in little space: a dashboard of targets, a scorecard. For one value against a limit with nothing else use radial-progress or progress; to compare many values with each other use bar-chart.
 * @example
 * <BulletChart
 *   label="Quarter targets"
 *   items={[
 *     { label: "Revenue", value: 270, target: 250, ranges: [150, 225, 300] },
 *     { label: "New customers", value: 1400, target: 1600, ranges: [1000, 1500, 2000] },
 *   ]}
 * />
 */
import { scaleLinear } from "d3-scale";
import { useState, type ComponentProps, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { ChartDataTable, formatNumber, type ChartFormat } from "@/components/viz/chart";

export type BulletItem = {
  label: string;
  /** A short note under the label: a unit or a period. */
  note?: string;
  value: number;
  target?: number;
  /** The upper edges of the bands from worst to best: [poor, fair, good]. The last is the end of the scale unless `max` is set. */
  ranges?: readonly number[];
  max?: number;
};

export type BulletChartLabels = { measure: string; value: string; target: string; bands: string };

export type BulletChartProps = Omit<ComponentProps<"div">, "children"> &
  Omit<ChartFormat, "timeZone"> & {
    items: readonly BulletItem[];
    /** What the chart shows, for assistive technology. */
    label: string;
    labels?: Partial<BulletChartLabels>;
  };

const LABELS: BulletChartLabels = { measure: "Measure", value: "Value", target: "Target", bands: "Bands" };
/** Band greys from the worst (strongest) to the best (faintest): a mix of the text colour into the surface. */
const BANDS = [26, 17, 10, 6];

export function BulletChart({ items, label, labels: given, locale, formatValue, className, ...props }: BulletChartProps) {
  const labels = { ...LABELS, ...given };
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const [focus, setFocus] = useState(0);
  const table = {
    caption: label,
    columns: [labels.measure, labels.value, labels.target, labels.bands],
    rows: items.map((item) => [item.label, number(item.value), item.target === undefined ? "" : number(item.target), (item.ranges ?? []).map(number).join(", ")]),
  };
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    const steps: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next = focus;
    if (event.key in steps) next = Math.max(0, Math.min(items.length - 1, focus + (steps[event.key] ?? 0)));
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    setFocus(next);
    (event.currentTarget.children[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <div data-slot="bullet-chart" className={cn("@container w-full min-w-0", className)} {...props}>
      {/* Each row is a focusable item that says its own values: the roving tab stop of a list. */}
      <ul aria-label={label} className="flex flex-col gap-4" onKeyDown={onKeyDown}>
        {items.map((item, index) => {
          const end = item.max ?? Math.max(item.value, item.target ?? 0, ...(item.ranges ?? [])) * (item.max === undefined && !item.ranges?.length ? 1.1 : 1);
          const scale = scaleLinear()
            .domain([Math.min(0, item.value), end || 1])
            .range([0, 100])
            .clamp(true);
          const bands = [...(item.ranges ?? [])].sort((a, b) => a - b);
          const spoken = `${item.label}: ${labels.value} ${number(item.value)}${item.target === undefined ? "" : `, ${labels.target} ${number(item.target)}`}`;
          return (
            <li
              key={index}
              tabIndex={index === focus ? 0 : -1}
              aria-label={spoken}
              onFocus={() => setFocus(index)}
              className="grid grid-cols-1 items-center gap-x-4 gap-y-1 rounded-control @sm:grid-cols-[minmax(6rem,10rem)_1fr]"
            >
              <div className="min-w-0" aria-hidden="true">
                <div className="truncate text-sm font-medium">{item.label}</div>
                {item.note ? <div className="truncate text-xs text-muted-foreground">{item.note}</div> : null}
              </div>
              <div className="flex min-w-0 items-center gap-3" aria-hidden="true">
                <div
                  className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-[min(var(--radius),4px)]"
                  style={{ backgroundColor: `color-mix(in oklab, var(--foreground) ${BANDS[3]}%, var(--background))` }}
                >
                  {bands.map((edge, b) => (
                    <span
                      key={b}
                      className="absolute inset-y-0 start-0"
                      style={{
                        width: `${scale(edge)}%`,
                        zIndex: bands.length - b,
                        backgroundColor: `color-mix(in oklab, var(--foreground) ${BANDS[Math.min(b, BANDS.length - 1)]}%, var(--background))`,
                      }}
                    />
                  ))}
                  <span className="absolute inset-y-[30%] start-0 z-10 rounded-e-[min(var(--radius),3px)] bg-chart-1" style={{ width: `${scale(item.value)}%` }} />
                  {item.target === undefined ? null : <span className="absolute inset-y-[12%] z-20 w-0.5 bg-foreground" style={{ insetInlineStart: `calc(${scale(item.target)}% - 1px)` }} />}
                </div>
                <span className="w-16 shrink-0 text-end text-sm tabular-nums">{number(item.value)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <ChartDataTable {...table} />
    </div>
  );
}
