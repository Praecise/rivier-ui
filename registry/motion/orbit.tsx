"use client";
/**
 * @name orbit
 * @category motion
 * @description Items set evenly on a ring around a centre that turns slowly, the items staying upright, with the centre in the middle; it pauses while hovered or focused, and under reduced motion the ring stands still.
 * @when Showing that several things connect to one: integrations around a product, sources around a result. Use few items (three to eight) of the same size, each with its own name. For a row of logos use marquee; for a real network use network-graph.
 * @example
 * <Orbit center={<Logo />} items={[<Icon key="a" />, <Icon key="b" />, <Icon key="c" />]} itemLabels={["Maps", "Charts", "Films"]} />
 */
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type OrbitProps = Omit<ComponentProps<"div">, "children"> & {
  center?: ReactNode;
  items: readonly ReactNode[];
  /** Each item's name, for screen readers; the items are listed in this order. */
  itemLabels: readonly string[];
  /** Seconds for one turn. Default 40. */
  duration?: number;
  /** The ring's size as a share of the box. Default 0.8. */
  ring?: number;
  /** Turn the other way. */
  reverse?: boolean;
};

export function Orbit({ center, items, itemLabels, duration = 40, ring = 0.8, reverse = false, className, style, ...props }: OrbitProps) {
  return (
    <div
      data-slot="orbit"
      className={cn("group/orbit relative aspect-square w-full max-w-md", className)}
      style={{ ["--orbit-duration" as string]: `${duration}s`, ...style } as CSSProperties}
      {...props}
    >
      <ul className="sr-only">
        {itemLabels.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      <div aria-hidden="true" className="absolute inset-0 m-auto rounded-full border border-dashed border-border-strong" style={{ width: `${ring * 100}%`, height: `${ring * 100}%` }} />
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 animate-[spin_var(--orbit-duration)_linear_infinite] group-hover/orbit:[animation-play-state:paused] group-focus-within/orbit:[animation-play-state:paused] motion-reduce:animate-none",
          reverse && "[animation-direction:reverse]",
        )}
      >
        {items.map((item, index) => {
          const angle = (index / items.length) * 2 * Math.PI - Math.PI / 2;
          return (
            <div
              key={index}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${50 + Math.cos(angle) * ring * 50}%`, top: `${50 + Math.sin(angle) * ring * 50}%` }}
            >
              {/* Turned back as the ring turns, so the item stays upright. */}
              <div className={cn("animate-[spin_var(--orbit-duration)_linear_infinite] [animation-direction:reverse] group-hover/orbit:[animation-play-state:paused] group-focus-within/orbit:[animation-play-state:paused] motion-reduce:animate-none", reverse && "[animation-direction:normal]")}>
                {item}
              </div>
            </div>
          );
        })}
      </div>
      {center ? <div className="absolute inset-0 m-auto flex size-1/4 items-center justify-center">{center}</div> : null}
    </div>
  );
}
