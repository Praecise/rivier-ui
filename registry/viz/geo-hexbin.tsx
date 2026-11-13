"use client";
/**
 * @name geo-hexbin
 * @category viz
 * @description A geo-map layer that gathers many points into hexagons or squares of equal size on screen, each coloured on one hue by how many points (or how much weight) fall in it, re-gathered as the map zooms; each cell read by arrow keys and listed in a table.
 * @when Thousands of points where single marks would pile up: sightings, incidents, trips, addresses. For a few dozen named places use geo-markers; for values that belong to regions use choropleth. Goes inside geo-map.
 * @example
 * <GeoMap label="Sightings" fit={area}>
 *   <GeoFeatures data={area} />
 *   <GeoHexbin label="Sightings" points={sightings} radius={14} valueLabel="Sightings" />
 * </GeoMap>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { chartSequential, formatNumber } from "@/components/viz/chart";
import { GeoLayer, GeoTable, useGeoMap } from "@/components/viz/geo-map";

export type GeoWeightedPoint = { lon: number; lat: number /** How much the point counts. Default 1. */; weight?: number };

export type GeoHexbinProps = Omit<ComponentProps<"g">, "children"> & {
  label: string;
  points: readonly GeoWeightedPoint[];
  /** "hex" (the default: every neighbour the same distance away) or "square". */
  shape?: "hex" | "square";
  /** The cell's size in pixels: a hexagon's radius, half a square's side. Default 14. */
  radius?: number;
  /** The name of the cell's total in the tooltip and the table. Default "Count". */
  valueLabel?: string;
  /** Words for the table's column heads. */
  labels?: { cell: string; latitude: string; longitude: string };
  /** The scale under the map, in the overlay. Default true. */
  showLegend?: boolean;
  formatValue?: (value: number) => string;
};

const LABELS = { cell: "Cell", latitude: "Latitude", longitude: "Longitude" };

type Cell = { x: number; y: number; total: number; count: number };

/** The centre of the hexagon a pixel falls in (pointy-top hexagons in offset rows), as in d3-hexbin. */
function hexCentre(x: number, y: number, dx: number, dy: number): [number, number] {
  const py = y / dy;
  let pj = Math.round(py);
  const px = x / dx - (pj & 1) / 2;
  let pi = Math.round(px);
  const py1 = py - pj;
  if (Math.abs(py1) * 3 > 1) {
    const px1 = px - pi;
    const pi2 = pi + (px < pi ? -1 : 1) / 2;
    const pj2 = pj + (py < pj ? -1 : 1);
    const px2 = px - pi2;
    const py2 = py - pj2;
    if (px1 * px1 + py1 * py1 > px2 * px2 + py2 * py2) {
      pi = pi2 + ((pj & 1) !== 0 ? 1 : -1) / 2;
      pj = pj2;
    }
  }
  return [(pi + (pj & 1) / 2) * dx, pj * dy];
}

export function GeoHexbin({ label, points, shape = "hex", radius = 14, valueLabel = "Count", labels = LABELS, showLegend = true, formatValue, className, ...props }: GeoHexbinProps) {
  const { projection, width, height, locale } = useGeoMap("GeoHexbin");
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const dx = shape === "hex" ? radius * 2 * Math.sin(Math.PI / 3) : radius * 2;
  const dy = shape === "hex" ? radius * 1.5 : radius * 2;
  const bins = new Map<string, Cell>();
  for (const point of points) {
    const at = projection([point.lon, point.lat]);
    if (!at || at[0] < -radius || at[1] < -radius || at[0] > width + radius || at[1] > height + radius) continue;
    const [cx, cy] = shape === "hex" ? hexCentre(at[0], at[1], dx, dy) : [Math.floor(at[0] / dx) * dx + dx / 2, Math.floor(at[1] / dy) * dy + dy / 2];
    const key = `${Math.round(cx)}:${Math.round(cy)}`;
    const cell = bins.get(key) ?? { x: cx, y: cy, total: 0, count: 0 };
    cell.total += point.weight ?? 1;
    cell.count += 1;
    bins.set(key, cell);
  }
  // Reading order: top to bottom, then start to end.
  const cells = [...bins.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  const highest = Math.max(1e-9, ...cells.map((c) => c.total));
  const hexagon = Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 6 + (i * Math.PI) / 3;
    return `${(Math.cos(angle) * (radius - 0.75)).toFixed(2)},${(Math.sin(angle) * (radius - 0.75)).toFixed(2)}`;
  }).join(" ");
  const coordinate = (value: number): string => formatNumber(value, locale, { maximumFractionDigits: 2 });
  const where = (cell: Cell): [number, number] | null => projection.invert?.([cell.x, cell.y]) ?? null;
  const items = cells.map((cell, index) => {
    const at = where(cell);
    return { x: cell.x, y: cell.y, title: at ? `${coordinate(at[1])}, ${coordinate(at[0])}` : `${labels.cell} ${index + 1}`, rows: [{ label: valueLabel, value: number(cell.total) }] };
  });
  return (
    <>
      <GeoLayer label={label} items={items} className={className} {...props}>
        {(active, point) => (
          <g data-slot="geo-hexbin" aria-hidden="true">
            {cells.map((cell, index) =>
              shape === "hex" ? (
                <polygon
                  key={index}
                  points={hexagon}
                  transform={`translate(${cell.x},${cell.y})`}
                  style={{ fill: chartSequential(0.15 + 0.85 * (cell.total / highest)) }}
                  className={cn("stroke-background", active === index && "stroke-foreground")}
                  strokeWidth={active === index ? 2 : 0.75}
                  fillOpacity={0.9}
                  onPointerEnter={() => point(index)}
                />
              ) : (
                <rect
                  key={index}
                  x={cell.x - radius + 0.75}
                  y={cell.y - radius + 0.75}
                  width={radius * 2 - 1.5}
                  height={radius * 2 - 1.5}
                  style={{ fill: chartSequential(0.15 + 0.85 * (cell.total / highest)) }}
                  className={cn("stroke-background [rx:min(var(--radius),2px)]", active === index && "stroke-foreground")}
                  strokeWidth={active === index ? 2 : 0.75}
                  fillOpacity={0.9}
                  onPointerEnter={() => point(index)}
                />
              ),
            )}
          </g>
        )}
      </GeoLayer>
      {showLegend && cells.length > 0 ? (
        <g data-slot="geo-hexbin-legend" aria-hidden="true" transform={`translate(${width - 132},${height - 24})`}>
          <rect x={-6} y={-6} width={130} height={26} className="fill-background [rx:min(var(--radius),4px)]" fillOpacity={0.85} />
          {[0, 0.25, 0.5, 0.75, 1].map((share, i) => (
            <rect key={i} x={i * 14} y={0} width={12} height={12} style={{ fill: chartSequential(0.15 + 0.85 * share) }} className="[rx:min(var(--radius),2px)]" />
          ))}
          <text x={74} y={6} dy="0.32em" className="fill-foreground text-xs tabular-nums">
            {number(highest)}
          </text>
        </g>
      ) : null}
      <GeoTable
        caption={label}
        columns={[labels.latitude, labels.longitude, valueLabel]}
        rows={cells.map((cell) => {
          const at = where(cell);
          return [at ? coordinate(at[1]) : "", at ? coordinate(at[0]) : "", number(cell.total)];
        })}
      />
    </>
  );
}
