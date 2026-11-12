"use client";
/**
 * @name layout-transition
 * @category motion
 * @description A shared element that animates from one place to another: render Morph with the same layoutId in two places and it travels between them.
 * @when A tabs or navigation indicator that slides to the active item, a card that grows into its detail view, a selection highlight. Both places must be in the same React tree. Between pages use view-transition; for content that only appears and disappears use presence.
 * @example
 * const [active, setActive] = useState("overview");
 * <MorphGroup id="section-tabs">
 *   <div className="flex gap-1">
 *     {["overview", "pricing", "docs"].map((tab) => (
 *       <button key={tab} onClick={() => setActive(tab)} className="relative h-control rounded-control px-4 text-sm">
 *         {active === tab ? <Morph layoutId="indicator" className="absolute inset-0 rounded-control bg-accent" /> : null}
 *         <span className="relative capitalize">{tab}</span>
 *       </button>
 *     ))}
 *   </div>
 * </MorphGroup>
 */
import { LayoutGroup, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DURATION, EASE } from "@/lib/motion";

export type MorphGroupProps = {
  /** Namespaces the layoutIds inside, so two copies of the same component on a page do not animate into each other. */
  id?: string;
  children?: ReactNode;
};

/** Scopes shared elements. Wrap each instance of a component that uses Morph (motion's LayoutGroup). */
export function MorphGroup({ id, children }: MorphGroupProps) {
  return <LayoutGroup id={id}>{children}</LayoutGroup>;
}

export type MorphProps = Omit<HTMLMotionProps<"div">, "layoutId"> & {
  /** The identity shared by the two places. The element animates from wherever this id was last rendered. */
  layoutId: string;
};

/**
 * How it moves: motion measures the element's box before and after the change and animates the difference
 * with `transform` alone (a translate3d and a scale, built in motion-dom's projection code), so layout is
 * computed once and no width, height, top or left is animated. Because the box is scaled while it travels,
 * motion rewrites `border-radius` each frame to cancel the distortion: that is the one non-transform
 * property that changes, and it does not affect layout. Children of a Morph that changes size are scaled
 * with it; make each one a Morph (or a motion element with `layout`) to keep it undistorted.
 *
 * Under reduced motion the layoutId is dropped, so the element is simply in its new place.
 */
export function Morph({ className, layoutId, transition, ...props }: MorphProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      data-slot="morph"
      className={cn(className)}
      layoutId={reduced ? undefined : layoutId}
      transition={transition ?? { duration: DURATION.slow, ease: EASE }}
      {...props}
    />
  );
}
