"use client";
/**
 * @name magnetic
 * @category motion
 * @description A wrapper whose child is gently pulled toward the pointer while it is hovered, and springs back when the pointer leaves.
 * @when The one main call to action on a marketing page, or an icon button that should feel alive. Not for every button, not inside dense interfaces, and it does nothing on touch screens.
 * @example
 * <Magnetic>
 *   <Button size="lg">Start a project</Button>
 * </Magnetic>
 * <Magnetic strength={0.5}>
 *   <Button variant="outline" size="icon" aria-label="Play"><Play /></Button>
 * </Magnetic>
 */
import { motion, useSpring } from "motion/react";
import { useEffect, useImperativeHandle, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { SPRING, isFinePointer, useMotionSafe } from "@/lib/motion";

export type MagneticProps = ComponentProps<"div"> & {
  /** How far the child follows, as a fraction of the pointer's distance from the centre (0 to 1). Default 0.3. */
  strength?: number;
};

/**
 * The root keeps its place and is the hover area (so the target does not run away from the pointer); the
 * inner element is the one moved, with transform only. Pointer positions go straight into spring motion
 * values: no React state changes while the pointer moves.
 */
export function Magnetic({ className, strength = 0.3, children, ref, ...props }: MagneticProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, []);
  const safe = useMotionSafe();
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);

  useEffect(() => {
    const root = rootRef.current;
    if (!safe || !root || !isFinePointer()) return;
    const pull = Math.max(0, Math.min(1, strength));
    const move = (event: PointerEvent): void => {
      if (event.pointerType === "touch") return;
      const rect = root.getBoundingClientRect();
      x.set((event.clientX - (rect.left + rect.width / 2)) * pull);
      y.set((event.clientY - (rect.top + rect.height / 2)) * pull);
    };
    const leave = (): void => {
      x.set(0);
      y.set(0);
    };
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave, { passive: true });
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      x.jump(0);
      y.jump(0);
    };
  }, [safe, strength, x, y]);

  return (
    <div ref={rootRef} data-slot="magnetic" className={cn("inline-block", className)} {...props}>
      <motion.div data-slot="magnetic-content" className="inline-block align-top" style={{ x, y }}>
        {children}
      </motion.div>
    </div>
  );
}
