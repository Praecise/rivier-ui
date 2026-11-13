"use client";
/**
 * @name geo-markers
 * @category viz
 * @description A geo-map layer of places: points in their group's colour and shape with optional names, or bubbles whose area is a number; each read by arrow keys and listed in a table.
 * @when Marking sites, cities or events on a map, or comparing counts by place (bubbles: area, never radius, carries the number). For values that belong to whole regions use choropleth; for thousands of points use geo-hexbin. Goes inside geo-map.
 * @example
 * <GeoMap label="Our stores" fit={country}>
 *   <GeoFeatures data={country} />
 *   <GeoMarkers
 *     label="Stores"
 *     points={[
 *       { id: "a", name: "Harbour", lon: 5.32, lat: 60.39, value: 120 },
 *       { id: "b", name: "Station", lon: 10.75, lat: 59.91, value: 340 },
 *     ]}
 *     variant="bubble"
 *     valueLabel="Visits"
 *   />
 * </GeoMap>
 */
import { scaleSqrt } from "d3-scale";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { ChartMark, chartSeries, formatNumber } from "@/components/viz/chart";
import { GeoLayer, GeoTable, useGeoMap } from "@/components/viz/geo-map";

export type GeoPoint = {
  id: string;
  name: string;
  lon: number;
  lat: number;
  /** A number: the bubble's area, and a row in the tooltip and the table. */
  value?: number;
  /** A group: one colour and shape per group, in order of first appearance (or `groups`). */
  group?: string;
};

export type GeoMarkersProps = Omit<ComponentProps<"g">, "children"> & {
  /** The layer's name, for screen readers and the table. */
  label: string;
  points: readonly GeoPoint[];
  /** "point" marks each place; "bubble" sizes it by `value`. */
  variant?: "point" | "bubble";
  groups?: readonly string[];
  /** Write each place's name beside its mark. Default: when there are 12 or fewer. */
  showLabels?: boolean;
  /** The largest bubble's radius in pixels at zoom 1. Default 24. */
  maxRadius?: number;
  valueLabel?: string;
  /** Words for the table's column heads. */
  labels?: { place: string; group: string; latitude: string; longitude: string };
  formatValue?: (value: number) => string;
};

const LABELS = { place: "Place", group: "Group", latitude: "Latitude", longitude: "Longitude" };

export function GeoMarkers({ label, points, variant = "point", groups, showLabels, maxRadius = 24, valueLabel = "Value", labels = LABELS, formatValue, className, ...props }: GeoMarkersProps) {
  const { projection, locale, view } = useGeoMap("GeoMarkers");
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const order = groups ? [...groups] : [...new Set(points.map((p) => p.group ?? ""))];
  const grouped = order.length > 1 || (order[0] ?? "") !== "";
  const radius = scaleSqrt()
    .domain([0, Math.max(1e-9, ...points.map((p) => Math.max(0, p.value ?? 0)))])
    .range([0, maxRadius * Math.sqrt(view.k)]);
  const placed = points.flatMap((point) => {
    const at = projection([point.lon, point.lat]);
    return at ? [{ point, x: at[0], y: at[1], group: Math.max(0, order.indexOf(point.group ?? "")) }] : [];
  });
  // Big bubbles first, so small ones are drawn over them and stay visible.
  const drawOrder = variant === "bubble" ? [...placed.keys()].sort((a, b) => (placed[b]?.point.value ?? 0) - (placed[a]?.point.value ?? 0)) : [...placed.keys()];
  const labelled = showLabels ?? placed.length <= 12;
  const coordinate = (value: number): string => formatNumber(value, locale, { maximumFractionDigits: 3 });
  const items = placed.map((item) => ({
    x: item.x,
    y: item.y,
    title: item.point.name,
    rows: [
      ...(grouped ? [{ label: "", value: item.point.group ?? "", index: item.group < 5 ? item.group : -1, mark: "rect" as const }] : []),
      ...(item.point.value !== undefined ? [{ label: valueLabel, value: number(item.point.value) }] : []),
    ],
  }));
  return (
    <>
      <GeoLayer label={label} items={items} className={className} {...props}>
        {(active, point) => (
          <g data-slot="geo-markers" aria-hidden="true">
            {drawOrder.map((index) => {
              const item = placed[index];
              if (!item) return null;
              const colour = grouped ? (item.group < 5 ? item.group : -1) : 0;
              const dim = active !== null && active !== index;
              return (
                <g key={item.point.id} onPointerEnter={() => point(index)} className={cn("transition-opacity duration-instant motion-reduce:transition-none", dim && "opacity-50")}>
                  <circle cx={item.x} cy={item.y} r={Math.max(12, variant === "bubble" ? radius(Math.max(0, item.point.value ?? 0)) : 0)} fill="transparent" />
                  {variant === "bubble" ? (
                    <circle
                      cx={item.x}
                      cy={item.y}
                      r={Math.max(2, radius(Math.max(0, item.point.value ?? 0)))}
                      className={cn(chartSeries(colour).fill, "stroke-background")}
                      fillOpacity={0.7}
                      strokeWidth={1.25}
                    />
                  ) : (
                    <ChartMark index={colour} x={item.x} y={item.y} radius={5} />
                  )}
                  {labelled ? (
                    <text x={item.x + 8} y={item.y} dy="0.32em" className="fill-foreground stroke-background text-xs" paintOrder="stroke" strokeWidth={3} strokeLinejoin="round">
                      {item.point.name}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {active !== null && placed[active] ? (
              <circle
                cx={placed[active]?.x}
                cy={placed[active]?.y}
                r={(variant === "bubble" ? Math.max(2, radius(Math.max(0, placed[active]?.point.value ?? 0))) : 5) + 4}
                fill="none"
                className="pointer-events-none stroke-foreground"
                strokeWidth={2}
              />
            ) : null}
          </g>
        )}
      </GeoLayer>
      <GeoTable
        caption={label}
        columns={[labels.place, ...(grouped ? [labels.group] : []), ...(points.some((p) => p.value !== undefined) ? [valueLabel] : []), labels.latitude, labels.longitude]}
        rows={points.map((p) => [
          p.name,
          ...(grouped ? [p.group ?? ""] : []),
          ...(points.some((q) => q.value !== undefined) ? [p.value === undefined ? "" : number(p.value)] : []),
          coordinate(p.lat),
          coordinate(p.lon),
        ])}
      />
    </>
  );
}
