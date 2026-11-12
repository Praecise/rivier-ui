"use client";
/**
 * @name tilt
 * @category motion
 * @description A wrapper that tilts its content in 3D toward the pointer on hover and springs back, with an optional glare.
 * @when A featured card, a product shot, a pricing plan worth lifting off the page. One or a few per view; not for forms or anything read at length, and it does nothing on touch screens.
 * @example
 * <Tilt max={8} glare className="max-w-sm">
 *   <Card>
 *     <CardHeader>
 *       <CardTitle>Studio plan</CardTitle>
 *       <CardDescription>Everything, for one team</CardDescription>
 *     </CardHeader>
 *   </Card>
 * </Tilt>
 */
import { motion, useSpring } from "motion/react";
import { useEffect, useImperativeHandle, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { SPRING, isFinePointer, useMotionSafe } from "@/lib/motion";

export type TiltProps = ComponentProps<"div"> & {
  /** The largest tilt, in degrees. Default 8. */
  max?: number;
  /** The perspective distance, in pixels: smaller is more dramatic. Default 800. */
  perspective?: number;
  /** Adds a soft highlight-coloured light across the top that brightens as the card tilts back. Default false. */
  glare?: boolean;
  /** Classes for the tilting element that holds the children. */
  contentClassName?: string;
};

/**
 * The root sets the perspective, keeps its place and is the hover area; the inner element rotates
 * (rotateX/rotateY, transform only). The glare is a gradient drawn once and never repainted: only its
 * opacity changes. It takes the corner radius of the first child's surface through `rounded-surface`.
 */
export function Tilt({ className, contentClassName, max = 8, perspective = 800, glare = false, children, style, ref, ...props }: TiltProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, []);
  const safe = useMotionSafe();
  const rotateX = useSpring(0, SPRING);
  const rotateY = useSpring(0, SPRING);
  const glareOpacity = useSpring(0, SPRING);

  useEffect(() => {
    const root = rootRef.current;
    if (!safe || !root || !isFinePointer()) return;
    const move = (event: PointerEvent): void => {
      if (event.pointerType === "touch") return;
      const rect = root.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const across = (event.clientX - rect.left) / rect.width - 0.5;
      const down = (event.clientY - rect.top) / rect.height - 0.5;
      rotateX.set(-down * 2 * max);
      rotateY.set(across * 2 * max);
      glareOpacity.set(Math.max(0, Math.min(1, 0.5 - down)));
    };
    const leave = (): void => {
      rotateX.set(0);
      rotateY.set(0);
      glareOpacity.set(0);
    };
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave, { passive: true });
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      rotateX.jump(0);
      rotateY.jump(0);
      glareOpacity.jump(0);
    };
  }, [safe, max, rotateX, rotateY, glareOpacity]);

  return (
    <div ref={rootRef} data-slot="tilt" className={cn(className)} style={{ perspective, ...style }} {...props}>
      <motion.div data-slot="tilt-content" className={cn("relative h-full", contentClassName)} style={{ rotateX, rotateY }}>
        {children}
        {glare ? (
          <motion.div
            aria-hidden="true"
            data-slot="tilt-glare"
            className="pointer-events-none absolute inset-0 rounded-surface"
            style={{
              opacity: glareOpacity,
              backgroundImage:
                "radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--highlight) 28%, transparent), transparent 70%)",
            }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}
