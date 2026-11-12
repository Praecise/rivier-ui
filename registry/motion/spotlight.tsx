"use client";
/**
 * @name spotlight
 * @category motion
 * @description A surface on which a soft light in the highlight colour follows the pointer.
 * @when A hero panel, a feature card or a call-to-action band that should respond to the pointer. Give it a border and a background like any surface. Decoration only: it does nothing on touch screens, so never rely on it to show something.
 * @example
 * <Spotlight className="rounded-surface border bg-card p-8">
 *   <h3 className="text-xl font-medium">Made to be changed</h3>
 *   <p className="text-muted-foreground">Every component is yours to edit.</p>
 * </Spotlight>
 * <Spotlight size={640} className="rounded-surface border p-12">…</Spotlight>
 */
import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useImperativeHandle, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { SPRING, isFinePointer, useMotionSafe } from "@/lib/motion";

export type SpotlightProps = ComponentProps<"div"> & {
  /** The diameter of the light, in pixels. Default 480. */
  size?: number;
};

/**
 * The light is one element whose gradient is drawn once. Following the pointer only changes that element's
 * transform, and showing it only changes its opacity, so the surface is never repainted. It sits above the
 * surface's background and below its content (the root is its own stacking context).
 */
export function Spotlight({ className, size = 480, children, ref, ...props }: SpotlightProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, []);
  const safe = useMotionSafe();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useSpring(0, SPRING);

  useEffect(() => {
    const root = rootRef.current;
    if (!safe || !root || !isFinePointer()) return;
    const move = (event: PointerEvent): void => {
      if (event.pointerType === "touch") return;
      const rect = root.getBoundingClientRect();
      x.set(event.clientX - rect.left - root.clientLeft);
      y.set(event.clientY - rect.top - root.clientTop);
      opacity.set(1);
    };
    const leave = (): void => opacity.set(0);
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave, { passive: true });
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      opacity.jump(0);
    };
  }, [safe, x, y, opacity]);

  return (
    <div ref={rootRef} data-slot="spotlight" className={cn("relative isolate overflow-hidden", className)} {...props}>
      <motion.div
        aria-hidden="true"
        data-slot="spotlight-light"
        className="pointer-events-none absolute top-0 left-0 -z-10 rounded-full"
        style={{
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          x,
          y,
          opacity,
          backgroundImage: "radial-gradient(closest-side, color-mix(in oklab, var(--highlight) 24%, transparent), transparent)",
        }}
      />
      {children}
    </div>
  );
}
