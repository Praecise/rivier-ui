"use client";
/**
 * @name geo-map
 * @category viz
 * @description A map drawn from GeoJSON the project passes (no tiles, no hosted data), in any d3-geo projection fitted to its box, zoomed and panned by dragging, pinching, Ctrl and the wheel, a double click, buttons or keys, with parts for a graticule, plain shapes, a scale bar, and layers that are read item by item by arrow keys.
 * @when Showing places, regions or routes from data the project holds: a choropleth, sites on a map, flows between cities. Add layers inside it: choropleth, geo-markers, geo-routes, geo-hexbin, geo-tiles. Inside layout/map-frame it loads only when asked. For a street map with search and directions, bring a map engine and put it in map-frame; for a spinning globe as decoration use three/globe.
 * @example
 * <GeoMap label="Regions of the study area" fit={regions} projection="equal-earth">
 *   <GeoGraticule />
 *   <GeoFeatures data={regions} />
 *   <GeoMarkers label="Sites" points={[{ id: "a", name: "Site A", lon: 10.7, lat: 59.9 }]} />
 *   <GeoScaleBar />
 * </GeoMap>
 */
import {
  geoAzimuthalEqualArea,
  geoConicEqualArea,
  geoDistance,
  geoEqualEarth,
  geoEquirectangular,
  geoGraticule10,
  geoMercator,
  geoNaturalEarth1,
  geoOrthographic,
  geoPath,
  geoTransverseMercator,
  type ExtendedFeature,
  type ExtendedFeatureCollection,
  type GeoPath,
  type GeoPermissibleObjects,
  type GeoProjection,
} from "d3-geo";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { createContext, use, useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { useSize } from "@/lib/use-size";
import { ChartDataTable, ChartTooltip, formatNumber, type ChartTable, type ChartTooltipRow } from "@/components/viz/chart";

/** The projections by name. Pass a function for any other d3-geo projection. */
export type GeoProjectionName = "equal-earth" | "natural-earth" | "mercator" | "equirectangular" | "orthographic" | "conic-equal-area" | "azimuthal-equal-area" | "transverse-mercator";

/** Zoom and pan: `k` is the zoom (1 is the fitted map), `x` and `y` the shift in pixels. */
export type GeoView = { k: number; x: number; y: number };

export type GeoMapLabels = {
  zoomIn: string;
  zoomOut: string;
  reset: string;
  /** What the map is called as a kind of thing, for screen readers. */
  map: string;
  /** Said once when the map takes focus. */
  help: string;
  /** Said after a zoom: "Zoom 2×". */
  zoom: (k: string) => string;
};

const LABELS: GeoMapLabels = {
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  reset: "Reset the view",
  map: "map",
  help: "Arrow keys move the map, plus and minus zoom, 0 resets. Tab reaches the layers.",
  zoom: (k) => `Zoom ${k}×`,
};

const FACTORIES: Record<GeoProjectionName, () => GeoProjection> = {
  "equal-earth": geoEqualEarth,
  "natural-earth": geoNaturalEarth1,
  mercator: geoMercator,
  equirectangular: geoEquirectangular,
  orthographic: geoOrthographic,
  "conic-equal-area": geoConicEqualArea,
  "azimuthal-equal-area": geoAzimuthalEqualArea,
  "transverse-mercator": geoTransverseMercator,
};

const SPHERE: GeoPermissibleObjects = { type: "Sphere" };
const HOME: GeoView = { k: 1, x: 0, y: 0 };
const PAN_STEP = 64;

type GeoMapContextValue = {
  /** The projection with the zoom and pan applied: what every layer draws with. */
  projection: GeoProjection;
  path: GeoPath;
  width: number;
  height: number;
  view: GeoView;
  /** The projection's scale at zoom 1, so a layer can tell how far it is zoomed in pixels. */
  baseScale: number;
  /** Moves the view so the point at these pixels is in the middle. */
  centreOn: (x: number, y: number) => void;
  /** The HTML layer over the map where tooltips go. */
  overlay: HTMLElement | null;
  locale: string;
};

const GeoMapContext = createContext<GeoMapContextValue | null>(null);

/** The map a layer is inside: its projection, path, size and view. */
export function useGeoMap(part = "A map layer"): GeoMapContextValue {
  const context = use(GeoMapContext);
  if (!context) throw new Error(`${part} must be inside a GeoMap.`);
  return context;
}

export type GeoMapProps = Omit<ComponentProps<"div">, "children"> & {
  /** What the map shows, for assistive technology. */
  label: string;
  /** The GeoJSON the map is fitted to at zoom 1. Default: the whole sphere. */
  fit?: GeoPermissibleObjects | ExtendedFeatureCollection;
  projection?: GeoProjectionName | (() => GeoProjection);
  /** Turns the globe before projecting: [longitude, latitude], as d3-geo's rotate. */
  rotate?: [number, number] | [number, number, number];
  /** Zoom and pan. Controlled with `onViewChange`. */
  view?: GeoView;
  defaultView?: GeoView;
  onViewChange?: (view: GeoView) => void;
  minZoom?: number;
  maxZoom?: number;
  /** When the wheel zooms: with Ctrl or ⌘ held (default, so the page still scrolls), always, or never. */
  wheel?: "modifier" | "always" | "never";
  /** Width / height. Default 16 / 10. */
  aspect?: number;
  /** A fixed height in pixels instead of a ratio. */
  height?: number;
  /** Space between the fitted shape and the edge, in pixels. Default 12. */
  padding?: number;
  /** The zoom buttons. Default true. */
  showControls?: boolean;
  labels?: Partial<GeoMapLabels>;
  locale?: string;
  /** Layers and parts: GeoGraticule, GeoFeatures, choropleth, markers, routes… */
  children?: ReactNode;
};

export function GeoMap({
  label,
  fit = SPHERE,
  projection = "equal-earth",
  rotate,
  view: viewProp,
  defaultView = HOME,
  onViewChange,
  minZoom = 1,
  maxZoom = 16,
  wheel = "modifier",
  aspect = 16 / 10,
  height,
  padding = 12,
  showControls = true,
  labels: given,
  locale = "en-US",
  className,
  style,
  children,
  ...props
}: GeoMapProps) {
  const labels = { ...LABELS, ...given };
  const { ref, width, height: measured } = useSize<HTMLDivElement>();
  const [view, setView] = useControllableState<GeoView>({ value: viewProp, defaultValue: defaultView, onChange: onViewChange });
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const helpId = useId();
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: GeoView; distance: number; centre: { x: number; y: number }; moved: boolean } | null>(null);

  const clampView = (next: GeoView): GeoView => {
    const k = Math.max(minZoom, Math.min(maxZoom, next.k));
    // Keep at least a quarter of the map in the box.
    const spareX = width * 0.75;
    const spareY = measured * 0.75;
    return { k, x: Math.max(width - width * k - spareX, Math.min(spareX, next.x)), y: Math.max(measured - measured * k - spareY, Math.min(spareY, next.y)) };
  };
  const zoomAt = (factor: number, px = width / 2, py = measured / 2, base = view): GeoView => {
    const k = Math.max(minZoom, Math.min(maxZoom, base.k * factor));
    return clampView({ k, x: px - ((px - base.x) * k) / base.k, y: py - ((py - base.y) * k) / base.k });
  };
  const zoomText = (k: number): string => formatNumber(k, locale, { maximumFractionDigits: 1 });
  const zoomBy = (factor: number): void => {
    const next = zoomAt(factor);
    setView(next);
    announce(labels.zoom(zoomText(next.k)));
  };

  const factory = typeof projection === "function" ? projection : FACTORIES[projection];
  let context: GeoMapContextValue | null = null;
  if (width > 0 && measured > 0) {
    const base = factory();
    if (rotate) base.rotate(rotate);
    base.fitExtent(
      [
        [padding, padding],
        [width - padding, measured - padding],
      ],
      fit as GeoPermissibleObjects,
    );
    const scale = base.scale();
    const [tx, ty] = base.translate();
    base.scale(scale * view.k).translate([tx * view.k + view.x, ty * view.k + view.y]);
    base.clipExtent([
      [0, 0],
      [width, measured],
    ]);
    context = {
      projection: base,
      path: geoPath(base),
      width,
      height: measured,
      view,
      baseScale: scale,
      centreOn: (x, y) => setView(clampView({ k: view.k, x: view.x + (width / 2 - x), y: view.y + (measured / 2 - y) })),
      overlay,
      locale,
    };
  }

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.target !== event.currentTarget) return;
    const pans: Record<string, [number, number]> = { ArrowLeft: [PAN_STEP, 0], ArrowRight: [-PAN_STEP, 0], ArrowUp: [0, PAN_STEP], ArrowDown: [0, -PAN_STEP] };
    const pan = pans[event.key];
    if (pan) setView(clampView({ k: view.k, x: view.x + pan[0], y: view.y + pan[1] }));
    else if (event.key === "+" || event.key === "=") zoomBy(1.5);
    else if (event.key === "-" || event.key === "_") zoomBy(1 / 1.5);
    else if (event.key === "0") {
      setView(HOME);
      announce(labels.zoom(zoomText(1)));
    } else return;
    event.preventDefault();
  };
  const local = (event: MouseEvent<SVGSVGElement>): { x: number; y: number } => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const startGesture = (): void => {
    const points = [...pointers.current.values()];
    const a = points[0];
    const b = points[1] ?? a;
    if (!a || !b) return;
    gesture.current = { view, distance: Math.hypot(a.x - b.x, a.y - b.y), centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, moved: false };
  };
  const onPointerDown = (event: PointerEvent<SVGSVGElement>): void => {
    if (event.button !== 0) return;
    pointers.current.set(event.pointerId, local(event));
    startGesture();
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, local(event));
    const points = [...pointers.current.values()];
    const a = points[0];
    const b = points[1] ?? a;
    if (!a || !b) return;
    const start = gesture.current;
    const centre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (!start.moved && Math.hypot(centre.x - start.centre.x, centre.y - start.centre.y) < 4 && points.length < 2) return;
    if (!start.moved) {
      start.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const factor = points.length > 1 && start.distance > 0 ? Math.hypot(a.x - b.x, a.y - b.y) / start.distance : 1;
    const zoomed = zoomAt(factor, start.centre.x, start.centre.y, start.view);
    setView(clampView({ k: zoomed.k, x: zoomed.x + centre.x - start.centre.x, y: zoomed.y + centre.y - start.centre.y }));
  };
  const onPointerEnd = (event: PointerEvent<SVGSVGElement>): void => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size > 0) startGesture();
    else gesture.current = null;
  };
  const onWheel = (event: globalThis.WheelEvent, node: SVGSVGElement): void => {
    if (wheel === "never" || (wheel === "modifier" && !event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    const box = node.getBoundingClientRect();
    setView(zoomAt(Math.exp(-event.deltaY * 0.002), event.clientX - box.left, event.clientY - box.top));
  };
  // React listens to the wheel passively, where preventDefault is ignored: the newest handler is kept here
  // and called from a listener of our own.
  const wheelHandler = useRef(onWheel);
  useEffect(() => {
    wheelHandler.current = onWheel;
  });
  const attachWheel = (node: SVGSVGElement | null): (() => void) | undefined => {
    if (!node) return undefined;
    const listener = (event: globalThis.WheelEvent): void => wheelHandler.current(event, node);
    node.addEventListener("wheel", listener, { passive: false });
    return () => node.removeEventListener("wheel", listener);
  };

  return (
    <div
      ref={ref}
      data-slot="geo-map"
      className={cn("relative w-full min-w-0 overflow-hidden rounded-surface border bg-card", className)}
      style={{ ...(height === undefined ? { aspectRatio: String(aspect) } : { height }), ...style }}
      {...props}
    >
      {context ? (
        <GeoMapContext value={context}>
          <svg
            ref={attachWheel}
            data-slot="geo-map-svg"
            role="application"
            aria-roledescription={labels.map}
            aria-label={label}
            aria-describedby={helpId}
            tabIndex={0}
            width={width}
            height={measured}
            viewBox={`0 0 ${width} ${measured}`}
            direction="ltr"
            className={cn("absolute inset-0 block select-none animate-in fade-in-0 motion-reduce:animate-none", view.k > 1 ? "touch-none cursor-grab" : "touch-pan-y")}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onDoubleClick={(event) => {
              const point = local(event);
              setView(zoomAt(event.shiftKey ? 1 / 2 : 2, point.x, point.y));
            }}
          >
            {children}
          </svg>
        </GeoMapContext>
      ) : null}
      <span id={helpId} className="sr-only">
        {labels.help}
      </span>
      <div ref={setOverlay} data-slot="geo-map-overlay" className="pointer-events-none absolute inset-0" />
      {showControls ? (
        <div data-slot="geo-map-controls" className="absolute end-2 top-2 flex flex-col overflow-hidden rounded-control border bg-background">
          <GeoMapButton label={labels.zoomIn} onClick={() => zoomBy(1.5)} disabled={view.k >= maxZoom}>
            <Plus aria-hidden="true" />
          </GeoMapButton>
          <GeoMapButton label={labels.zoomOut} onClick={() => zoomBy(1 / 1.5)} disabled={view.k <= minZoom} className="border-y">
            <Minus aria-hidden="true" />
          </GeoMapButton>
          <GeoMapButton
            label={labels.reset}
            onClick={() => {
              setView(HOME);
              announce(labels.zoom(zoomText(1)));
            }}
            disabled={view.k === 1 && view.x === 0 && view.y === 0}
          >
            <RotateCcw aria-hidden="true" />
          </GeoMapButton>
        </div>
      ) : null}
    </div>
  );
}

function GeoMapButton({ label, className, children, ...props }: Omit<ComponentProps<"button">, "type"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn("flex size-9 items-center justify-center text-foreground hover:bg-accent disabled:opacity-40 pointer-coarse:size-11 [&_svg]:size-4", className)}
      {...props}
    >
      {children}
    </button>
  );
}

/** The lines of latitude and longitude every 10°, and the outline of the globe. */
export function GeoGraticule({ outline = true, className, ...props }: ComponentProps<"g"> & { outline?: boolean }) {
  const { path } = useGeoMap("GeoGraticule");
  return (
    <g data-slot="geo-graticule" aria-hidden="true" fill="none" className={cn("stroke-border", className)} {...props}>
      <path d={path(geoGraticule10()) ?? ""} strokeWidth={0.75} />
      {outline ? <path d={path(SPHERE) ?? ""} className="stroke-border-strong" /> : null}
    </g>
  );
}

export type GeoFeaturesProps = Omit<ComponentProps<"g">, "fill"> & {
  /** Shapes to draw as they are: land, borders, the study area. */
  data: ExtendedFeatureCollection | ExtendedFeature | GeoPermissibleObjects;
  /** "fill" draws a muted ground with a hairline edge; "line" only the edges. */
  variant?: "fill" | "line";
};

/** Plain shapes under or over the data: a base of land or regions. Decoration: hidden from screen readers. */
export function GeoFeatures({ data, variant = "fill", className, ...props }: GeoFeaturesProps) {
  const { path } = useGeoMap("GeoFeatures");
  const features = (data as ExtendedFeatureCollection).type === "FeatureCollection" ? (data as ExtendedFeatureCollection).features : [data as ExtendedFeature];
  return (
    <g data-slot="geo-features" aria-hidden="true" className={cn(variant === "fill" ? "fill-muted stroke-border-strong" : "fill-none stroke-border-strong", className)} strokeWidth={0.75} {...props}>
      {features.map((feature, index) => (
        <path key={index} d={path(feature) ?? ""} />
      ))}
    </g>
  );
}

export type GeoScaleBarProps = ComponentProps<"div"> & {
  /** Kilometres or miles. */
  unit?: "kilometer" | "mile";
  /** The longest the bar may be, in pixels. Default 120. */
  maxWidth?: number;
};

/** A bar of a round distance at the middle of the map, which changes with the zoom. Rendered in the overlay. */
export function GeoScaleBar({ unit = "kilometer", maxWidth = 120, className, ...props }: GeoScaleBarProps) {
  const { projection, width, height, overlay, locale } = useGeoMap("GeoScaleBar");
  const a = projection.invert?.([width / 2 - maxWidth / 2, height / 2]);
  const b = projection.invert?.([width / 2 + maxWidth / 2, height / 2]);
  if (!overlay || !a || !b || !Number.isFinite(a[0]) || !Number.isFinite(b[0])) return null;
  const radius = unit === "kilometer" ? 6371 : 3958.8;
  const across = geoDistance(a, b) * radius;
  if (!(across > 0)) return null;
  const magnitude = 10 ** Math.floor(Math.log10(across));
  const nice = [5, 2, 1].map((step) => step * magnitude).find((value) => value <= across) ?? magnitude;
  const pixels = (nice / across) * maxWidth;
  const text = formatNumber(nice, locale, { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: 2 });
  return createPortal(
    <div data-slot="geo-scale-bar" className={cn("absolute bottom-2 start-2 rounded-control bg-background/85 px-1.5 py-1 text-xs tabular-nums text-foreground", className)} {...props}>
      <div className="h-1.5 border-x-2 border-b-2 border-foreground" style={{ width: pixels }} aria-hidden="true" />
      <span>{text}</span>
    </div>,
    overlay,
  );
}

/** One thing in a layer that can be read: where it is on screen and what it says. */
export type GeoReadable = { x: number; y: number; title: string; rows: readonly ChartTooltipRow[] };

export type GeoLayerProps = Omit<ComponentProps<"g">, "children"> & {
  /** The layer's name, for screen readers: "Sites", "Population by region". */
  label: string;
  /** Its items in reading order, with where each is now. */
  items: readonly GeoReadable[];
  /** Draws the layer; told which item is being read. */
  children: (active: number | null, point: (index: number | null) => void) => ReactNode;
};

/**
 * A layer that can be read: a focusable group whose items are reached by arrow keys (Home, End, Escape), said
 * aloud, shown in a tooltip, and brought into view when they are off screen. Every layer of the library is
 * built on it; use it for a layer of your own.
 */
export function GeoLayer({ label, items, children, className, ...props }: GeoLayerProps) {
  const { overlay, width, height, centreOn } = useGeoMap("GeoLayer");
  const [active, setActive] = useState<number | null>(null);
  const current = active !== null && active < items.length ? items[active] : undefined;
  const say = (item: GeoReadable | undefined): void => {
    if (item) announce(`${item.title}${item.rows.length > 0 ? ": " : ""}${item.rows.map((row) => `${row.label} ${row.value}`.trim()).join(", ")}`);
  };
  const go = (index: number | null): void => {
    if (index === null || items.length === 0) {
      setActive(null);
      return;
    }
    const next = Math.max(0, Math.min(items.length - 1, index));
    const item = items[next];
    setActive(next);
    say(item);
    if (item && (item.x < 0 || item.y < 0 || item.x > width || item.y > height)) centreOn(item.x, item.y);
  };
  const onKeyDown = (event: KeyboardEvent<SVGGElement>): void => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (event.key in steps) go(active === null ? 0 : active + (steps[event.key] ?? 0));
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(items.length - 1);
    else if (event.key === "Escape") go(null);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <g
      data-slot="geo-layer"
      role="group"
      aria-label={label}
      tabIndex={0}
      className={cn("rounded-control", className)}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
      onPointerLeave={() => setActive(null)}
      {...props}
    >
      {children(current ? active : null, (index) => setActive(index))}
      {current && overlay ? createPortal(<ChartTooltip x={current.x} y={current.y} side={current.x > width / 2 ? "left" : "right"} title={current.title} rows={current.rows} />, overlay) : null}
    </g>
  );
}

/** A layer's data as a table for screen readers, placed in the map's HTML layer (a table cannot sit in SVG). */
export function GeoTable(props: ChartTable) {
  const { overlay } = useGeoMap("GeoTable");
  return overlay ? createPortal(<ChartDataTable {...props} />, overlay) : null;
}
