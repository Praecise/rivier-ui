"use client";
/**
 * @name hotspots
 * @category ui
 * @description Named buttons placed over a picture or a video at a point, each present only between two moments of the clip, with the same choices as a plain list for people who cannot point at the picture.
 * @when Something in the frame can be asked about or chosen while it is on screen: an object in a scene, a place on a still, a choice in a story. Put Hotspots inside the frame (VideoPlayer, or any `relative` box over a picture) and HotspotList after it; both take the same `hotspots`. A hotspot that appears is announced, because nothing else would tell a screen-reader user it is there. For a point on a map use the map's own markers; for marks on the time bar use the scrubber's `marks`.
 * @example
 * const spots = [
 *   { id: "kiln", x: 32, y: 55, start: 4, end: 12, label: "The kiln door" },
 *   { id: "shelf", x: 70, y: 30, start: 9, end: 20, label: "Drying shelf" },
 * ];
 * <VideoPlayerProvider>
 *   <VideoPlayer aria-label="Inside the workshop">
 *     <VideoPlayerVideo src="/workshop.mp4" />
 *     <Hotspots hotspots={spots} onSelect={(spot) => openCard(spot.id)} />
 *     <VideoPlayerControls>…</VideoPlayerControls>
 *   </VideoPlayer>
 *   <HotspotList hotspots={spots} onSelect={(spot) => openCard(spot.id)} aria-label="In this scene" />
 * </VideoPlayerProvider>
 */
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useOptionalMediaContext } from "@/lib/use-media";

export type HotspotSpec = {
  id: string;
  /** Where its centre is, as a percentage of the frame's width from the left of the picture, and of its height from the top. */
  x: number;
  y: number;
  /** The moments, in seconds, between which it is present. Left out: always. */
  start?: number;
  end?: number;
  /** Its name: what a press chooses. */
  label: string;
};

const activeAt = (hotspots: readonly HotspotSpec[], time: number): HotspotSpec[] =>
  hotspots.filter((spot) => (spot.start ?? Number.NEGATIVE_INFINITY) <= time && time < (spot.end ?? Number.POSITIVE_INFINITY)).sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

type HotspotSource = {
  hotspots: readonly HotspotSpec[];
  /** The current time in seconds. Left out, it is the player's (0 with no player, so untimed hotspots still show). */
  time?: number;
  onSelect?: (hotspot: HotspotSpec) => void;
};

export type HotspotsProps = Omit<ComponentProps<"div">, "children" | "onSelect" | "dir"> &
  HotspotSource & {
    /** What is announced when a hotspot appears. Default: its name. Return "" to say nothing. */
    announcement?: (hotspot: HotspotSpec) => string;
    /** Replaces what a hotspot draws inside its button (the default is a ring with a dot). */
    children?: (hotspot: HotspotSpec) => ReactNode;
  };

/**
 * The layer over the frame. It lets the pointer through except on the hotspots themselves, which are real
 * buttons in the order they appear in the clip, so Tab reaches them in time order. Positions are measured
 * from the left of the picture in every language: a picture is not mirrored in a right-to-left page, so
 * the layer is laid out left to right (the names still find their own direction). Each button is at least
 * 44px across whatever is drawn in it, and arrives by fading in only (at once under reduced motion).
 */
export function Hotspots({ className, hotspots, time, onSelect, announcement, children, ...props }: HotspotsProps) {
  const context = useOptionalMediaContext();
  const active = activeAt(hotspots, time ?? context?.state.time ?? 0);
  const ids = active.map((spot) => spot.id).join("\n");

  const latest = useRef({ active, announcement });
  /** The hotspots present at the last look. null before the first: what is there as the page loads is not news. */
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    latest.current = { active, announcement };
  });
  useEffect(() => {
    const present = new Set(ids === "" ? [] : ids.split("\n"));
    for (const spot of latest.current.active) {
      if (seen.current === null || seen.current.has(spot.id)) continue;
      const message = latest.current.announcement ? latest.current.announcement(spot) : spot.label;
      if (message) announce(message);
    }
    seen.current = present;
  }, [ids]);

  return (
    <div data-slot="hotspots" dir="ltr" className={cn("pointer-events-none absolute inset-0 z-10", className)} {...props}>
      {active.map((spot) => (
        <Hotspot key={spot.id} x={spot.x} y={spot.y} aria-label={spot.label} data-hotspot={spot.id} onClick={() => onSelect?.(spot)}>
          {children?.(spot)}
        </Hotspot>
      ))}
    </div>
  );
}

export type HotspotProps = Omit<ComponentProps<"button">, "type"> & {
  /** Percentage of the frame's width from the left of the picture. */
  x: number;
  /** Percentage of the frame's height from the top. */
  y: number;
};

/** One hotspot, for a layer composed by hand. Name it with `aria-label`. */
export function Hotspot({ className, style, x, y, children, ...props }: HotspotProps) {
  const within = (value: number): number => Math.min(100, Math.max(0, value));
  return (
    <button
      type="button"
      data-slot="hotspot"
      className={cn(
        "group/hotspot pointer-events-auto absolute inline-flex size-(--control-h-lg) -translate-1/2 animate-in items-center justify-center rounded-full animation-duration-(--duration-base) fade-in-0 motion-reduce:animate-none",
        className,
      )}
      style={{ insetInlineStart: `${within(x)}%`, top: `${within(y)}%`, ...style }}
      {...props}
    >
      {children ?? (
        <span
          aria-hidden="true"
          className="inline-flex size-7 items-center justify-center rounded-full border-2 border-background bg-foreground transition-transform duration-instant ease-out group-hover/hotspot:scale-110 motion-reduce:transition-none motion-reduce:group-hover/hotspot:scale-100"
        >
          <span className="size-2 rounded-full bg-background" />
        </span>
      )}
    </button>
  );
}

export type HotspotListProps = Omit<ComponentProps<"ul">, "children" | "onSelect"> &
  HotspotSource & {
    /** Shown when nothing can be chosen at this moment. Left out, the list is simply empty. */
    empty?: ReactNode;
  };

/**
 * The hotspots present now, as a list of buttons with their names: the same choices without having to find
 * a point on a picture. Render it after the frame and name it with `aria-label` ("In this scene").
 */
export function HotspotList({ className, hotspots, time, onSelect, empty, ...props }: HotspotListProps) {
  const context = useOptionalMediaContext();
  const active = activeAt(hotspots, time ?? context?.state.time ?? 0);
  return (
    <ul data-slot="hotspot-list" className={cn("flex min-h-(--control-h) flex-wrap items-center gap-2", className)} {...props}>
      {active.map((spot) => (
        <li key={spot.id}>
          <button
            type="button"
            data-slot="hotspot-list-item"
            onClick={() => onSelect?.(spot)}
            className="inline-flex h-control-sm items-center rounded-control border border-border-strong bg-background px-3 text-sm font-medium text-foreground transition-colors duration-instant ease-out hover:bg-accent motion-reduce:transition-none pointer-coarse:h-control"
          >
            <span dir="auto">{spot.label}</span>
          </button>
        </li>
      ))}
      {active.length === 0 && empty ? <li className="text-sm text-muted-foreground">{empty}</li> : null}
    </ul>
  );
}
