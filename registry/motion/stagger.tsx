"use client";
/**
 * @name stagger
 * @category motion
 * @description A container whose items fade and move into place one after another when it scrolls into view.
 * @when A grid of cards, a feature list, a row of logos. For one block use reveal; for the words of a heading use text-reveal.
 * @example
 * <Stagger className="grid gap-4 sm:grid-cols-3" interval={0.08}>
 *   <StaggerItem><Card>Design</Card></StaggerItem>
 *   <StaggerItem><Card>Build</Card></StaggerItem>
 *   <StaggerItem><Card>Launch</Card></StaggerItem>
 * </Stagger>
 */
import { useImperativeHandle, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useEntrance, type EntranceDirection, type EntranceOptions } from "@/lib/motion";

export type StaggerProps = ComponentProps<"div"> & {
  /** Seconds between one item and the next. Default 0.08. */
  interval?: number;
  /** Seconds before the first item. Default 0. */
  delay?: number;
  /** Seconds each item takes. Default: the scene duration (0.7). */
  duration?: number;
  /** The way each item travels as it arrives. Default "up". */
  direction?: EntranceDirection;
  /** How far each item travels, in pixels. Default 16. */
  distance?: number;
  /** Play once (default), or again each time the container comes back into view. */
  once?: boolean;
  /** Also play when it is already in view as the page loads (items are hidden first). Default false. */
  playOnLoad?: boolean;
  /** Grows or shrinks the viewport edge used for "in view", as a CSS margin. */
  margin?: EntranceOptions["margin"];
  /** How much of the container must be in view: "some" (default), "all", or a fraction. */
  amount?: EntranceOptions["amount"];
};

/** The items of this container in document order; items of a Stagger nested inside belong to that one. */
function itemsOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-slot="stagger-item"]')).filter(
    (item) => item.closest('[data-slot="stagger"]') === root,
  );
}

/** The container is never transformed and is the element watched; only the items move. */
export function Stagger({
  className,
  interval = 0.08,
  delay = 0,
  duration,
  direction = "up",
  distance = 16,
  once = true,
  playOnLoad = false,
  margin,
  amount,
  ref,
  ...props
}: StaggerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, []);
  useEntrance(rootRef, itemsOf, {
    direction,
    distance,
    duration,
    delay: (index) => delay + index * interval,
    once,
    playOnLoad,
    margin,
    amount,
  });

  return <div ref={rootRef} data-slot="stagger" className={cn(className)} {...props} />;
}

/** One revealed item. It can sit at any depth inside its Stagger; the order is the order in the document. */
export function StaggerItem({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="stagger-item" className={cn(className)} {...props} />;
}
