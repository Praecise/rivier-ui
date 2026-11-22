"use client";
/**
 * @name choropleth
 * @category viz
 * @description A geo-map layer that colours each region by a number, on one hue from faint to strong, on two hues either side of a midpoint, or in classes with stated edges; with a legend that says each step's range in words and a table of every region's value.
 * @when Showing a rate or a share that varies by region: turnout by district, rainfall by county. Use rates, not raw counts (large regions look important whatever their count); for counts use geo-markers bubbles. Goes inside geo-map.
 * @example
 * const scale = choroplethScale(regions.features.map((f) => f.properties.rate), { thresholds: [10, 20, 30] });
 * <GeoMap label="Rate by region" fit={regions}>
 *   <Choropleth label="Rate by region" data={regions} value={(f) => f.properties?.rate} name={(f) => f.properties?.name} scale={scale} />
 * </GeoMap>
 * <ChoroplethLegend title="Rate (%)" scale={scale} />
 */
import type { ExtendedFeature, ExtendedFeatureCollection } from "d3-geo";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { chartDiverging, chartSequential, formatNumber } from "@/components/viz/chart";
import { GeoLayer, GeoTable, useGeoMap } from "@/components/viz/geo-map";

export type ChoroplethScaleOptions = {
  /** "sequential": one hue, more is stronger. "diverging": two hues either side of `midpoint`. Ignored with `thresholds`. */
  kind?: "sequential" | "diverging";
  /** Class edges, low to high: [10, 20, 30] makes four classes (below 10, 10 to 20, 20 to 30, 30 and above). */
  thresholds?: readonly number[];
  /** The values at the ends of the scale. Default: the data's own. */
  domain?: readonly [number, number];
  /** The neutral middle of a diverging scale. Default 0. */
  midpoint?: number;
};

export type ChoroplethStep = { color: string; from: number | null; to: number | null };

export type ChoroplethScale = {
  color: (value: number) => string;
  /** The steps a legend shows, low to high. */
  steps: readonly ChoroplethStep[];
  kind: "sequential" | "diverging" | "classes";
};

/** The colour scale of a choropleth, to share between the layer and its legend. */
export function choroplethScale(values: readonly (number | null | undefined)[], options: ChoroplethScaleOptions = {}): ChoroplethScale {
  const numbers = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const low = options.domain?.[0] ?? (numbers.length ? Math.min(...numbers) : 0);
  const high = options.domain?.[1] ?? (numbers.length ? Math.max(...numbers) : 1);
  if (options.thresholds && options.thresholds.length > 0) {
    const edges = [...options.thresholds].sort((a, b) => a - b);
    const classes = edges.length + 1;
    const colorOf = (index: number): string => chartSequential(classes === 1 ? 1 : index / (classes - 1));
    return {
      kind: "classes",
      color: (value) => colorOf(edges.filter((edge) => value >= edge).length),
      steps: Array.from({ length: classes }, (_, i) => ({ color: colorOf(i), from: i === 0 ? null : (edges[i - 1] ?? null), to: i === classes - 1 ? null : (edges[i] ?? null) })),
    };
  }
  if (options.kind === "diverging") {
    const mid = options.midpoint ?? 0;
    const reach = Math.max(Math.abs(high - mid), Math.abs(low - mid)) || 1;
    return {
      kind: "diverging",
      color: (value) => chartDiverging((value - mid) / reach),
      steps: [-1, -0.5, 0, 0.5, 1].map((share) => ({ color: chartDiverging(share), from: mid + share * reach, to: null })),
    };
  }
  const span = high - low || 1;
  return {
    kind: "sequential",
    color: (value) => chartSequential((value - low) / span),
    steps: [0, 0.25, 0.5, 0.75, 1].map((share) => ({ color: chartSequential(share), from: low + share * span, to: null })),
  };
}

export type ChoroplethProps = Omit<ComponentProps<"g">, "children" | "name" | "scale"> & {
  /** The layer's name, for screen readers and the table. */
  label: string;
  data: ExtendedFeatureCollection;
  /** Each region's number; null or undefined for no value. */
  value: (feature: ExtendedFeature) => number | null | undefined;
  /** Each region's name. */
  name: (feature: ExtendedFeature) => string;
  /** The colour scale; make it with choroplethScale to share it with the legend. Default: sequential over the data. */
  scale?: ChoroplethScale;
  /** The name of the value in the tooltip and the table. Default "Value". */
  valueLabel?: string;
  /** Said for a region with no value. Default "No value". */
  noValue?: string;
  formatValue?: (value: number) => string;
};

export function Choropleth({ label, data, value, name, scale, valueLabel = "Value", noValue = "No value", formatValue, className, ...props }: ChoroplethProps) {
  const { path, locale } = useGeoMap("Choropleth");
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const regions = data.features.map((feature) => {
    const amount = value(feature);
    return { feature, name: name(feature), value: typeof amount === "number" && Number.isFinite(amount) ? amount : null, d: path(feature) ?? "", centre: path.centroid(feature) };
  });
  const colors = scale ?? choroplethScale(regions.map((region) => region.value));
  const order = regions.map((_, i) => i).sort((a, b) => (regions[a]?.name ?? "").localeCompare(regions[b]?.name ?? "", locale));
  const items = order.map((i) => {
    const region = regions[i];
    return {
      x: region?.centre[0] ?? 0,
      y: region?.centre[1] ?? 0,
      title: region?.name ?? "",
      rows: [{ label: valueLabel, value: region?.value === null || region === undefined ? noValue : number(region.value) }],
    };
  });
  return (
    <>
      <GeoLayer label={label} items={items} className={className} {...props}>
        {(active, point) => (
          <g data-slot="choropleth" aria-hidden="true">
            {order.map((i, position) => {
              const region = regions[i];
              if (!region || !region.d) return null;
              return (
                <path
                  key={i}
                  d={region.d}
                  style={region.value === null ? undefined : { fill: colors.color(region.value) }}
                  className={cn("stroke-background", region.value === null && "fill-none stroke-border-strong")}
                  strokeWidth={region.value === null ? 0.75 : 1}
                  strokeDasharray={region.value === null ? "3 2" : undefined}
                  onPointerEnter={() => point(position)}
                />
              );
            })}
            {active !== null && regions[order[active] ?? -1] ? <path d={regions[order[active] ?? -1]?.d ?? ""} fill="none" className="pointer-events-none stroke-foreground" strokeWidth={2} /> : null}
          </g>
        )}
      </GeoLayer>
      <GeoTable caption={label} columns={[label, valueLabel]} rows={order.map((i) => [regions[i]?.name ?? "", regions[i]?.value === null ? noValue : number(regions[i]?.value ?? 0)])} />
    </>
  );
}

export type ChoroplethLegendProps = ComponentProps<"div"> & {
  /** What the colours measure, with its unit. */
  title: string;
  scale: ChoroplethScale;
  /** Show the no-value swatch, with these words. Leave out to hide it. */
  noValue?: string;
  locale?: string;
  formatValue?: (value: number) => string;
  /** Words for "below" and "and above" in class ranges. */
  labels?: { below: (value: string) => string; above: (value: string) => string };
};

const RANGE_WORDS = { below: (value: string) => `Below ${value}`, above: (value: string) => `${value} and above` };

/** The key to a choropleth: each step's colour with its range in words, so no value rests on colour alone. */
export function ChoroplethLegend({ title, scale, noValue, locale = "en-US", formatValue, labels = RANGE_WORDS, className, ...props }: ChoroplethLegendProps) {
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const text = (step: ChoroplethStep): string => {
    if (scale.kind !== "classes") return step.from === null ? "" : number(step.from);
    if (step.from === null && step.to !== null) return labels.below(number(step.to));
    if (step.to === null && step.from !== null) return labels.above(number(step.from));
    return `${number(step.from ?? 0)} – ${number(step.to ?? 0)}`;
  };
  return (
    <div data-slot="choropleth-legend" className={cn("flex flex-col gap-1.5 text-xs", className)} {...props}>
      <span className="font-medium text-foreground">{title}</span>
      <ul className={cn("flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground", scale.kind !== "classes" && "gap-x-0")}>
        {scale.steps.map((step, index) => (
          <li key={index} className={cn("flex items-center gap-1.5", scale.kind !== "classes" && "flex-col items-start gap-0.5")}>
            <span aria-hidden="true" className={cn("h-3 rounded-[min(var(--radius),3px)]", scale.kind === "classes" ? "w-4" : "w-10")} style={{ backgroundColor: step.color }} />
            <span className="tabular-nums">{text(step)}</span>
          </li>
        ))}
        {noValue ? (
          <li className="flex items-center gap-1.5 self-start">
            <span aria-hidden="true" className="h-3 w-4 rounded-[min(var(--radius),3px)] border border-dashed border-border-strong" />
            <span>{noValue}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
