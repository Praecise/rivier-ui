"use client";
/**
 * @name geo-routes
 * @category viz
 * @description A geo-map layer of journeys and flows between places: great-circle routes (the shortest way over the globe) or arcs drawn over the map, thicker for larger amounts, with an arrow for the direction; each read by arrow keys and listed in a table.
 * @when Showing movement between places: flights, deliveries, migration, trade. Keep to a few dozen routes, or aggregate them first. For flows without geography use sankey-chart or chord-diagram. Goes inside geo-map.
 * @example
 * <GeoMap label="Flights from the hub" projection="natural-earth">
 *   <GeoGraticule />
 *   <GeoRoutes
 *     label="Flights"
 *     routes={[
 *       { id: "1", name: "Hub to Port", from: [10.7, 59.9], to: [-74, 40.7], value: 12 },
 *       { id: "2", name: "Hub to Cape", from: [10.7, 59.9], to: [18.4, -33.9], value: 4 },
 *     ]}
 *     valueLabel="Flights a week"
 *   />
 * </GeoMap>
 */
import { geoDistance, geoInterpolate } from "d3-geo";
import { scaleSqrt } from "d3-scale";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { chartSeries, formatNumber } from "@/components/viz/chart";
import { GeoLayer, GeoTable, useGeoMap } from "@/components/viz/geo-map";

export type GeoRoute = {
  id: string;
  name: string;
  /** [longitude, latitude]. */
  from: [number, number];
  to: [number, number];
  /** Places it passes through on the way, in order. */
  via?: readonly [number, number][];
  /** The amount carried: the line's width, and a row in the tooltip and the table. */
  value?: number;
  /** A group: one colour per group, in order of first appearance. */
  group?: string;
};

export type GeoRoutesProps = Omit<ComponentProps<"g">, "children"> & {
  label: string;
  routes: readonly GeoRoute[];
  /** "great-circle" follows the globe; "arc" bows each route over the map, which keeps crossing routes apart. */
  variant?: "great-circle" | "arc";
  /** An arrow at the middle of each route. Default true. */
  showDirection?: boolean;
  valueLabel?: string;
  /** Words for the table: the route column and the distance column. */
  labels?: { route: string; distance: string };
  formatValue?: (value: number) => string;
};

const LABELS = { route: "Route", distance: "Distance" };

export function GeoRoutes({ label, routes, variant = "great-circle", showDirection = true, valueLabel = "Value", labels = LABELS, formatValue, className, ...props }: GeoRoutesProps) {
  const { projection, path, locale } = useGeoMap("GeoRoutes");
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const groups = [...new Set(routes.map((r) => r.group ?? ""))];
  const grouped = groups.length > 1;
  const width = scaleSqrt()
    .domain([0, Math.max(1e-9, ...routes.map((r) => Math.max(0, r.value ?? 0)))])
    .range([1.25, 7]);
  const distance = (route: GeoRoute): number => {
    const stops = [route.from, ...(route.via ?? []), route.to];
    return stops.slice(1).reduce((sum, stop, i) => sum + geoDistance(stops[i] ?? stop, stop) * 6371, 0);
  };
  const drawn = routes.map((route) => {
    const stroke = route.value === undefined ? 2 : width(Math.max(0, route.value));
    const colour = grouped ? Math.min(groups.indexOf(route.group ?? ""), 5) : 0;
    if (variant === "great-circle") {
      const d = path({ type: "LineString", coordinates: [route.from, ...(route.via ?? []), route.to] }) ?? "";
      const middle = projection(geoInterpolate(route.from, route.to)(0.5));
      const ahead = projection(geoInterpolate(route.from, route.to)(0.52));
      return { route, d, stroke, colour: colour > 4 ? -1 : colour, middle, angle: middle && ahead ? Math.atan2(ahead[1] - middle[1], ahead[0] - middle[0]) : 0 };
    }
    const a = projection(route.from);
    const b = projection(route.to);
    if (!a || !b) return { route, d: "", stroke, colour, middle: null, angle: 0 };
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    // The control point sits off the middle, square to the route, a quarter of its length away.
    const cx = mx - dy * 0.25;
    const cy = my + dx * 0.25;
    const middle: [number, number] = [(a[0] + 2 * cx + b[0]) / 4, (a[1] + 2 * cy + b[1]) / 4];
    return { route, d: `M${a[0]},${a[1]}Q${cx},${cy} ${b[0]},${b[1]}`, stroke, colour: colour > 4 ? -1 : colour, middle, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  });
  const kilometres = (value: number): string => formatNumber(value, locale, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 });
  const items = drawn.map((item) => ({
    x: item.middle?.[0] ?? -1,
    y: item.middle?.[1] ?? -1,
    title: item.route.name,
    rows: [...(item.route.value !== undefined ? [{ label: valueLabel, value: number(item.route.value) }] : []), { label: labels.distance, value: kilometres(distance(item.route)) }],
  }));
  const ends = routes
    .flatMap((r) => [r.from, r.to])
    .flatMap((p) => {
      const at = projection(p);
      return at ? [at] : [];
    });
  return (
    <>
      <GeoLayer label={label} items={items} className={className} {...props}>
        {(active, point) => (
          <g data-slot="geo-routes" aria-hidden="true" fill="none">
            {drawn.map((item, index) => (
              <g
                key={item.route.id}
                onPointerEnter={() => point(index)}
                className={cn("transition-opacity duration-instant motion-reduce:transition-none", active !== null && active !== index && "opacity-35")}
              >
                <path d={item.d} stroke="transparent" strokeWidth={Math.max(12, item.stroke + 8)} />
                <path d={item.d} className={chartSeries(item.colour).stroke} strokeWidth={item.stroke} strokeLinecap="round" strokeOpacity={0.85} />
                {showDirection && item.middle ? (
                  <path
                    d="M-5,-4 L3,0 L-5,4"
                    transform={`translate(${item.middle[0]},${item.middle[1]}) rotate(${(item.angle * 180) / Math.PI})`}
                    className="stroke-foreground"
                    strokeWidth={1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}
              </g>
            ))}
            {ends.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={2.5} className="fill-foreground stroke-background" strokeWidth={1} />
            ))}
            {active !== null && drawn[active] ? (
              <path d={drawn[active]?.d ?? ""} className="pointer-events-none stroke-foreground" strokeWidth={(drawn[active]?.stroke ?? 2) + 2} strokeOpacity={0.5} />
            ) : null}
          </g>
        )}
      </GeoLayer>
      <GeoTable
        caption={label}
        columns={[labels.route, ...(routes.some((r) => r.value !== undefined) ? [valueLabel] : []), labels.distance]}
        rows={routes.map((r) => [r.name, ...(routes.some((q) => q.value !== undefined) ? [r.value === undefined ? "" : number(r.value)] : []), kilometres(distance(r))])}
      />
    </>
  );
}
