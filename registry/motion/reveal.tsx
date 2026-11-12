"use client";
/**
 * @name reveal
 * @category motion
 * @description Fades and moves its content into place when it scrolls into view.
 * @when A section, card or image that should arrive as the page is read. For a list revealed one after another use stagger; for a heading use text-reveal; for conditional UI that mounts and unmounts use presence.
 * @example
 * <Reveal>
 *   <h2 className="text-2xl font-medium">Built to be owned</h2>
 * </Reveal>
 * <Reveal direction="start" distance={40} delay={0.1} once={false}>
 *   <img src="/studio.jpg" alt="The studio" className="rounded-surface" />
 * </Reveal>
 */
import { useImperativeHandle, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useEntrance, type EntranceDirection, type EntranceOptions } from "@/lib/motion";

export type RevealProps = ComponentProps<"div"> & {
  /** The way the content travels as it arrives; "start" and "end" follow the writing direction. Default "up". */
  direction?: EntranceDirection;
  /** How far it travels, in pixels. Default 24. */
  distance?: number;
  /** Seconds to wait once it is in view. Default 0. */
  delay?: number;
  /** Seconds the entrance takes. Default: the scene duration (0.7). */
  duration?: number;
  /** Play once (default), or again each time it comes back into view. */
  once?: boolean;
  /** Also play when it is already in view as the page loads (it is hidden first). Default false: left as it is. */
  playOnLoad?: boolean;
  /** Grows or shrinks the viewport edge used for "in view", as a CSS margin. */
  margin?: EntranceOptions["margin"];
  /** How much of the box must be in view: "some" (default), "all", or a fraction. */
  amount?: EntranceOptions["amount"];
  /** Classes for the inner, animated element that holds the children (flex, grid, gap go here). */
  contentClassName?: string;
};

/**
 * Two elements on purpose. The root is never transformed and is the one watched, so content that starts
 * clipped by a parent or moved out of view still triggers; the inner element is the one that moves.
 * `className` sizes and places the root; `contentClassName` lays out the children.
 */
export function Reveal({
  className,
  contentClassName,
  children,
  direction = "up",
  distance = 24,
  delay = 0,
  duration,
  once = true,
  playOnLoad = false,
  margin,
  amount,
  ref,
  ...props
}: RevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, []);
  useEntrance(rootRef, () => (contentRef.current ? [contentRef.current] : []), {
    direction,
    distance,
    delay,
    duration,
    once,
    playOnLoad,
    margin,
    amount,
  });

  return (
    <div ref={rootRef} data-slot="reveal" className={cn(className)} {...props}>
      <div ref={contentRef} data-slot="reveal-content" className={cn("h-full", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
