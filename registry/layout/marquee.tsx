/**
 * @name marquee
 * @category layout
 * @description A row that scrolls sideways without end. It pauses on hover and on keyboard focus, and under reduced motion it is an ordinary wrapped row.
 * @when A strip of logos, short quotes or tags where no single item must be read. Not for content the reader needs: everything is also in the markup once, but it moves. For a few items that fit, use stack or grid.
 * @example
 * <Marquee aria-label="Clients" speed="slow">
 *   <img src="/logos/atlas.svg" alt="Atlas" className="h-8 w-auto" />
 *   <img src="/logos/north.svg" alt="North" className="h-8 w-auto" />
 *   <img src="/logos/field.svg" alt="Field" className="h-8 w-auto" />
 * </Marquee>
 * <Marquee direction="right" speed={25} gap="1rem" fade={false}>
 *   <Badge variant="outline">Design</Badge>
 *   <Badge variant="outline">Build</Badge>
 *   <Badge variant="outline">Launch</Badge>
 * </Marquee>
 */
import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/cn";

const SPEED = { slow: 60, normal: 40, fast: 20 } as const;

export type MarqueeProps = ComponentProps<"div"> & {
  /** Which way the row travels. Defaults to "left". */
  direction?: "left" | "right";
  /** "slow", "normal" or "fast", or the number of seconds one full loop takes. Defaults to "normal" (40 seconds). */
  speed?: keyof typeof SPEED | number;
  /** Space between items, as a CSS length. Defaults to "3rem". */
  gap?: string;
  /** Fade the two ends out with a mask. Defaults to true. */
  fade?: boolean;
  /** Stop while the pointer is over the row. It always stops while something inside has keyboard focus. Defaults to true. */
  pauseOnHover?: boolean;
};

/*
 * Two tracks side by side, each sliding by its own width plus the gap, so the second lands exactly where the
 * first began. The second track is a copy for the loop only: aria-hidden and inert, so it is not read and
 * cannot be focused. The animation moves `transform` and nothing else. Needs the `rui-marquee` keyframe from
 * the theme; `--rui-marquee-end` is where a track finishes, flipped for right-to-left pages.
 */
const TRACK =
  "flex min-w-full shrink-0 items-center justify-around gap-(--marquee-gap) group-focus-within/marquee:[animation-play-state:paused] motion-reduce:w-full motion-reduce:min-w-0 motion-reduce:shrink motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center";

const FADE =
  "[mask-image:linear-gradient(to_right,transparent,black_var(--marquee-fade),black_calc(100%_-_var(--marquee-fade)),transparent)] motion-reduce:[mask-image:none]";

export function Marquee({ className, direction = "left", speed = "normal", gap = "3rem", fade = true, pauseOnHover = true, style, children, ...props }: MarqueeProps) {
  const seconds = typeof speed === "number" ? Math.max(1, speed) : SPEED[speed];
  const track = cn(
    TRACK,
    direction === "right"
      ? "animate-[rui-marquee_var(--marquee-duration)_linear_infinite_reverse]"
      : "animate-[rui-marquee_var(--marquee-duration)_linear_infinite]",
    pauseOnHover && "group-hover/marquee:[animation-play-state:paused]",
  );
  return (
    <div
      data-slot="marquee"
      className={cn(
        "group/marquee flex w-full gap-(--marquee-gap) overflow-hidden [--marquee-fade:min(3rem,10%)] [--rui-marquee-end:calc(-100%_-_var(--marquee-gap))] motion-reduce:overflow-visible rtl:[--rui-marquee-end:calc(100%_+_var(--marquee-gap))]",
        fade && FADE,
        className,
      )}
      style={{ "--marquee-duration": `${seconds}s`, "--marquee-gap": gap, ...style } as CSSProperties}
      {...props}
    >
      <div data-slot="marquee-track" className={track}>
        {children}
      </div>
      <div data-slot="marquee-track" aria-hidden="true" inert className={cn(track, "motion-reduce:hidden")}>
        {children}
      </div>
    </div>
  );
}
