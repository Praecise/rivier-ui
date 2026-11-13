"use client";
/**
 * @name geo-tiles
 * @category viz
 * @description A geo-map layer of raster map tiles from an address template the project gives ("…/{z}/{x}/{y}.png"), placed under the other layers and following the zoom, with the attribution the tile provider asks for. It has no default address: nothing is fetched unless the project names a server.
 * @when A geo-map needs a picture of streets or terrain under the data and the project has a tile server it may use (its own, or a provider whose terms it accepts). Use projection="mercator" (tiles are drawn in Web Mercator). Tiles come from a third party, so put the map in layout/map-frame with a MapFrameNotice and nothing is requested before the person asks. Without tiles, draw shapes with GeoFeatures.
 * @example
 * <GeoMap label="Delivery area" fit={area} projection="mercator">
 *   <GeoTiles url="https://tiles.example.org/{z}/{x}/{y}.png" attribution="© Example contributors" />
 *   <GeoFeatures data={area} variant="line" />
 * </GeoMap>
 */
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useGeoMap } from "@/components/viz/geo-map";

export type GeoTilesProps = Omit<ComponentProps<"g">, "children"> & {
  /** The tile address, with {z}, {x} and {y}, and {s} for a subdomain. No default: the project names its server. */
  url: string;
  /** What the provider asks to be shown: words, or a link. Required: tiles are someone's work. */
  attribution: ReactNode;
  /** Subdomains {s} rotates through: ["a", "b", "c"]. */
  subdomains?: readonly string[];
  /** The tile zooms the server has. Default 0 to 19. */
  minZoom?: number;
  maxZoom?: number;
  /** The tiles' size in pixels at their own zoom. Default 256. */
  tileSize?: number;
  /** How strongly the tiles show, 0 to 1. Default 1; lower it so data layers read over a busy map. */
  opacity?: number;
};

/** The edge of the Web Mercator square, in degrees of latitude. */
const MAX_LATITUDE = 85.0511287798066;

export function GeoTiles({ url, attribution, subdomains, minZoom = 0, maxZoom = 19, tileSize = 256, opacity = 1, className, ...props }: GeoTilesProps) {
  const { projection, width, height, overlay } = useGeoMap("GeoTiles");
  const rotation = projection.rotate();
  const turned = rotation.some((angle) => Math.abs(angle) > 1e-6);
  useEffect(() => {
    if (turned) console.warn("GeoTiles: the map is rotated, and tiles are only drawn on an unrotated Mercator projection.");
  }, [turned]);
  const left = projection([-180, 0]);
  const top = projection([0, MAX_LATITUDE]);
  const right = projection([180, 0]);
  if (!left || !top || !right || turned) return null;
  const world = right[0] - left[0];
  if (!(world > 0)) return null;
  const zoom = Math.max(minZoom, Math.min(maxZoom, Math.round(Math.log2(world / tileSize))));
  const count = 2 ** zoom;
  const size = world / count;
  const tiles: { key: string; href: string; x: number; y: number }[] = [];
  const firstColumn = Math.floor((0 - left[0]) / size);
  const lastColumn = Math.floor((width - left[0]) / size);
  const firstRow = Math.max(0, Math.floor((0 - top[1]) / size));
  const lastRow = Math.min(count - 1, Math.floor((height - top[1]) / size));
  for (let column = firstColumn; column <= lastColumn; column++) {
    for (let row = firstRow; row <= lastRow; row++) {
      // Columns wrap round the world; rows do not.
      const x = ((column % count) + count) % count;
      const sub = subdomains && subdomains.length > 0 ? (subdomains[(x + row) % subdomains.length] ?? "") : "";
      const href = url.replaceAll("{z}", String(zoom)).replaceAll("{x}", String(x)).replaceAll("{y}", String(row)).replaceAll("{s}", sub);
      tiles.push({ key: `${zoom}/${column}/${row}`, href, x: left[0] + column * size, y: top[1] + row * size });
    }
  }
  return (
    <>
      <g data-slot="geo-tiles" aria-hidden="true" opacity={opacity} className={cn("pointer-events-none", className)} {...props}>
        {tiles.map((tile) => (
          // A pixel more each way, so no hairline of background shows between tiles.
          <image key={tile.key} href={tile.href} x={tile.x - 0.5} y={tile.y - 0.5} width={size + 1} height={size + 1} preserveAspectRatio="none" />
        ))}
      </g>
      {overlay
        ? createPortal(
            <div
              data-slot="geo-tiles-attribution"
              className="pointer-events-auto absolute bottom-0 end-0 max-w-[70%] truncate rounded-ss-control bg-background/85 px-1.5 py-0.5 text-xs text-muted-foreground [&_a]:underline"
            >
              {attribution}
            </div>,
            overlay,
          )
        : null}
    </>
  );
}
