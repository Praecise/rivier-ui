"use client";
/**
 * @name map-frame
 * @category layout
 * @description The frame around a map, not a map: it holds the map's size, shows a still until the person asks for the map, keeps a text list beside it, and takes the map to full screen and back. The map engine is yours.
 * @when Any page that shows a map from any engine (MapLibre, Leaflet, a hosted maps script). It gives the map what an engine does not: no request to a third party before the person presses the button (put the line about that in MapFrameNotice), no layout shift, the same information as a list (MapFrameList) so that the map is never the only way to it, a way to skip past the map with the keyboard, and full screen that behaves as a modal. For a still picture of a place with no interaction use an image in aspect.
 * @example
 * <MapFrame aria-label="Map of the three stops">
 *   <MapFrameStage className="aspect-video">
 *     <MapFramePlaceholder>
 *       <MapFrameActivate>Show the map</MapFrameActivate>
 *       <MapFrameNotice>The map is loaded from Example Maps, which will see your address.</MapFrameNotice>
 *     </MapFramePlaceholder>
 *     <MapFrameCanvas><MyMapEngine stops={stops} /></MapFrameCanvas>
 *     <MapFrameToolbar>
 *       <MapFrameFullscreen />
 *     </MapFrameToolbar>
 *   </MapFrameStage>
 *   <MapFrameList>
 *     <ol>{stops.map((stop) => <li key={stop.id}>{stop.name}, {stop.address}</li>)}</ol>
 *   </MapFrameList>
 * </MapFrame>
 */
import { Maximize2, Minimize2 } from "lucide-react";
import { createContext, use, useEffect, useId, useRef, type ComponentProps, type KeyboardEvent } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

type MapFrameContextValue = {
  id: string;
  label: string | undefined;
  active: boolean;
  setActive: (active: boolean) => void;
  fullscreen: boolean;
  setFullscreen: (fullscreen: boolean) => void;
};

const MapFrameContext = createContext<MapFrameContextValue | null>(null);

function useMapFrame(part: string): MapFrameContextValue {
  const context = use(MapFrameContext);
  if (!context) throw new Error(`<${part}> must be used inside <MapFrame>.`);
  return context;
}

export type MapFrameProps = ComponentProps<"section"> & {
  /** Whether the map has been asked for (controlled). Until it is true nothing inside MapFrameCanvas is rendered. */
  active?: boolean;
  /** Start with the map on, when no third party is involved or consent was given before. */
  defaultActive?: boolean;
  onActiveChange?: (active: boolean) => void;
  /** Whether the stage fills the viewport (controlled). */
  fullscreen?: boolean;
  defaultFullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
};

/** A named region: give it an `aria-label` that says what the map shows ("Map of the three stops"). */
export function MapFrame({ className, active, defaultActive = false, onActiveChange, fullscreen, defaultFullscreen = false, onFullscreenChange, ...props }: MapFrameProps) {
  const id = useId();
  const [isActive, setActive] = useControllableState({ value: active, defaultValue: defaultActive, onChange: onActiveChange });
  const [isFullscreen, setFullscreen] = useControllableState({ value: fullscreen, defaultValue: defaultFullscreen, onChange: onFullscreenChange });
  return (
    <MapFrameContext
      value={{ id, label: props["aria-label"], active: isActive, setActive, fullscreen: isFullscreen && isActive, setFullscreen }}
    >
      <section data-slot="map-frame" data-active={isActive ? "" : undefined} className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props} />
    </MapFrameContext>
  );
}

/** Makes everything outside `element` inert, as a modal does, and returns the way back. */
function isolate(element: HTMLElement): () => void {
  const changed: HTMLElement[] = [];
  for (let node: HTMLElement | null = element; node && node !== document.body; node = node.parentElement) {
    for (const sibling of node.parentElement?.children ?? []) {
      if (sibling !== node && sibling instanceof HTMLElement && !sibling.inert && sibling.id !== "rui-announcer") {
        sibling.inert = true;
        changed.push(sibling);
      }
    }
  }
  return () => {
    for (const sibling of changed) sibling.inert = false;
  };
}

export type MapFrameStageProps = ComponentProps<"div"> & {
  /** The link that lets a keyboard user go past the map. Translate it with the interface. */
  skipLabel?: string;
  /** Said when the stage fills the screen, and when it goes back. Translate them. */
  enteredLabel?: string;
  leftLabel?: string;
};

/**
 * The box the map lives in. Give it its size with a class (`aspect-video`, `h-96`): it holds that size
 * before, while and after the map loads, so nothing shifts. In full screen the same element is lifted to
 * the browser's top layer and fills the viewport: it is not moved in the document, so the map engine keeps
 * its state. While it is there the rest of the page is inert, Escape leaves, and focus is back on the
 * full-screen button.
 */
export function MapFrameStage({
  className,
  children,
  skipLabel = "Skip the map",
  enteredLabel = "The map fills the screen. Press Escape to go back.",
  leftLabel = "The map is back in the page.",
  onKeyDown,
  ...props
}: MapFrameStageProps) {
  const frame = useMapFrame("MapFrameStage");
  const { fullscreen, setFullscreen, active } = frame;
  const stage = useRef<HTMLDivElement>(null);
  const labels = useRef({ enteredLabel, leftLabel });
  useEffect(() => {
    labels.current = { enteredLabel, leftLabel };
  });

  useEffect(() => {
    const node = stage.current;
    if (!fullscreen || !node) return;
    // The top layer sits above every stacking context, wherever the frame is in the page.
    const topLayer = typeof node.showPopover === "function";
    if (topLayer) {
      node.setAttribute("popover", "manual");
      node.showPopover();
    }
    const release = isolate(node);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    announce(labels.current.enteredLabel);
    return () => {
      release();
      document.documentElement.style.overflow = overflow;
      if (topLayer) {
        if (node.matches(":popover-open")) node.hidePopover();
        node.removeAttribute("popover");
      }
      announce(labels.current.leftLabel);
    };
  }, [fullscreen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Escape" || !fullscreen) return;
    event.preventDefault();
    event.stopPropagation();
    setFullscreen(false);
    event.currentTarget.querySelector<HTMLElement>("[data-slot=map-frame-fullscreen]")?.focus();
  };

  return (
    <>
      {active ? (
        <a
          data-slot="map-frame-skip"
          href={`#${frame.id}-after`}
          onClick={(event) => {
            event.preventDefault();
            document.getElementById(`${frame.id}-after`)?.focus();
          }}
          className="sr-only focus-visible:not-sr-only focus-visible:w-fit focus-visible:rounded-control focus-visible:bg-background focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:text-foreground focus-visible:underline"
        >
          {skipLabel}
        </a>
      ) : null}
      <div
        ref={stage}
        data-slot="map-frame-stage"
        data-fullscreen={fullscreen ? "" : undefined}
        role={fullscreen ? "dialog" : undefined}
        aria-modal={fullscreen ? true : undefined}
        aria-label={fullscreen ? frame.label : undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative isolate aspect-video w-full min-w-0 overflow-hidden rounded-surface border border-border bg-muted text-foreground",
          "data-[fullscreen]:fixed data-[fullscreen]:inset-0 data-[fullscreen]:z-50 data-[fullscreen]:m-0 data-[fullscreen]:aspect-auto data-[fullscreen]:h-dvh data-[fullscreen]:max-h-none data-[fullscreen]:w-full data-[fullscreen]:max-w-none data-[fullscreen]:rounded-none data-[fullscreen]:border-0 data-[fullscreen]:p-0",
          className,
        )}
        {...props}
      >
        {children}
      </div>
      <span id={`${frame.id}-after`} tabIndex={-1} data-slot="map-frame-after" className="sr-only" />
    </>
  );
}

/**
 * What the stage shows until the map is asked for: by default a flat block; give it a still picture or a
 * summary as children, with the MapFrameActivate button and the MapFrameNotice line. It is removed once
 * the map is on.
 */
export function MapFramePlaceholder({ className, ...props }: ComponentProps<"div">) {
  const { active } = useMapFrame("MapFramePlaceholder");
  if (active) return null;
  return (
    <div
      data-slot="map-frame-placeholder"
      className={cn("absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto p-5 text-center", className)}
      {...props}
    />
  );
}

export type MapFrameActivateProps = Omit<ComponentProps<"button">, "type">;

/**
 * The button that turns the map on. Nothing inside MapFrameCanvas exists before it is pressed, so no
 * script is fetched and no address is sent. It is described by the MapFrameNotice of the same frame. Focus
 * moves to the map when it appears.
 */
export function MapFrameActivate({ className, onClick, ...props }: MapFrameActivateProps) {
  const frame = useMapFrame("MapFrameActivate");
  const canvasId = `${frame.id}-canvas`;
  // The button goes when the map comes: focus moves to the map, which exists once the state has been applied.
  const pressed = useRef(false);
  useEffect(
    () => () => {
      if (pressed.current) document.getElementById(canvasId)?.focus();
    },
    [canvasId],
  );
  return (
    <button
      type="button"
      data-slot="map-frame-activate"
      aria-describedby={`${frame.id}-notice`}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        pressed.current = true;
        frame.setActive(true);
      }}
      className={cn(
        "inline-flex h-control shrink-0 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-medium text-primary-foreground transition-[opacity,scale] duration-instant ease-out select-none hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

/** The line beside the button that says what turning the map on does: who will see what. The project writes it. */
export function MapFrameNotice({ className, ...props }: ComponentProps<"p">) {
  const frame = useMapFrame("MapFrameNotice");
  return <p id={`${frame.id}-notice`} data-slot="map-frame-notice" className={cn("max-w-prose text-xs text-muted-foreground", className)} {...props} />;
}

export type MapFrameCanvasProps = ComponentProps<"div">;

/**
 * Where the map engine goes. It is a box that fills the stage and nothing else: mount the engine in it and
 * let the engine watch the box's size (it changes on full screen). Its children are rendered only once the
 * map has been asked for, and stay mounted through full screen. Its name ("Map") is an `aria-label`.
 */
export function MapFrameCanvas({ className, children, "aria-label": ariaLabel = "Map", ...props }: MapFrameCanvasProps) {
  const frame = useMapFrame("MapFrameCanvas");
  if (!frame.active) return null;
  return (
    <div id={`${frame.id}-canvas`} role="group" aria-label={ariaLabel} tabIndex={-1} data-slot="map-frame-canvas" className={cn("absolute inset-0 outline-none", className)} {...props}>
      {children}
    </div>
  );
}

/** Controls over the map, at the top end of the stage: MapFrameFullscreen and the project's own (zoom, layers, locate). Shown once the map is on. */
export function MapFrameToolbar({ className, "aria-label": ariaLabel = "Map controls", ...props }: ComponentProps<"div">) {
  const { active } = useMapFrame("MapFrameToolbar");
  if (!active) return null;
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-slot="map-frame-toolbar"
      className={cn("absolute end-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap items-center justify-end gap-1 rounded-control border border-border bg-background p-1", className)}
      {...props}
    />
  );
}

export const mapFrameControlClass =
  "inline-flex size-(--control-h-sm) shrink-0 items-center justify-center rounded-control text-foreground transition-[background-color,color] duration-instant ease-out hover:bg-accent disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none pointer-coarse:size-(--control-h) [&_svg]:size-4";

export type MapFrameFullscreenProps = Omit<ComponentProps<"button">, "type" | "aria-label"> & {
  /** The button's name in the page and in full screen. Translate them with the interface. */
  enterLabel?: string;
  exitLabel?: string;
};

/** Takes the stage to full screen and back. Its name says which way it goes. */
export function MapFrameFullscreen({ className, children, enterLabel = "Full screen", exitLabel = "Leave full screen", onClick, ...props }: MapFrameFullscreenProps) {
  const frame = useMapFrame("MapFrameFullscreen");
  return (
    <button
      type="button"
      data-slot="map-frame-fullscreen"
      aria-label={frame.fullscreen ? exitLabel : enterLabel}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) frame.setFullscreen(!frame.fullscreen);
      }}
      className={cn(mapFrameControlClass, className)}
      {...props}
    >
      {children ?? (frame.fullscreen ? <Minimize2 aria-hidden="true" strokeWidth={1.5} /> : <Maximize2 aria-hidden="true" strokeWidth={1.5} />)}
    </button>
  );
}

/**
 * The same information as the map, as text: the places with their names and addresses, the route as
 * steps. The project renders it (a list, a table); it is always in the page, whether the map is on or not.
 */
export function MapFrameList({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="map-frame-list" className={cn("min-w-0 text-sm", className)} {...props} />;
}
