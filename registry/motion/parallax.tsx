"use client";
/**
 * @name parallax
 * @category motion
 * @description A clipped frame whose layer moves at a different speed from the page as it scrolls past.
 * @when A background image or a decorative layer behind a section. The frame needs a height of its own (an aspect ratio or a fixed height). Not for text that must be read while it moves; for a pinned, scroll-told sequence use scroll-scene.
 * @example
 * <Parallax speed={0.3} className="aspect-video rounded-surface">
 *   <img src="/landscape.jpg" alt="" className="size-full object-cover" />
 * </Parallax>
 */
import { motion, useMotionTemplate, useScroll, useTransform } from "motion/react";
import { useImperativeHandle, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useMotionSafe } from "@/lib/motion";

export type ParallaxProps = ComponentProps<"div"> & {
  /**
   * How much the layer lags the page, from -1 to 1. 0 moves with the page; positive moves slower (a background
   * falling behind); negative moves faster. At 1 the layer travels half the frame's height each way. Default 0.3.
   */
  speed?: number;
  /** Classes for the moving layer that holds the children. */
  layerClassName?: string;
};

/**
 * Bounded by construction: the frame clips, and the layer is made taller than the frame by exactly the
 * distance it travels, so no edge is ever uncovered and nothing can overflow the page. The frame itself is
 * never transformed and is the scroll target; only the layer's transform changes.
 */
export function Parallax({ className, layerClassName, speed = 0.3, children, ref, ...props }: ParallaxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, []);
  const safe = useMotionSafe();

  const clamped = Math.max(-1, Math.min(1, speed));
  /** Extra layer above and below the frame, as a percentage of the frame's height. */
  const overscan = Math.abs(clamped) * 50;
  /** The same distance as a percentage of the layer's own height, which is what translateY(%) uses. */
  const travel = (overscan / (100 + 2 * overscan)) * 100 * Math.sign(clamped);

  const { scrollYProgress } = useScroll({ target: rootRef, offset: ["start end", "end start"] });
  const shift = useTransform(scrollYProgress, [0, 1], [-travel, travel]);
  const y = useMotionTemplate`${shift}%`;

  return (
    <div ref={rootRef} data-slot="parallax" className={cn("relative overflow-hidden", className)} {...props}>
      <motion.div
        data-slot="parallax-layer"
        className={cn("absolute inset-x-0", layerClassName)}
        style={{ top: `${-overscan}%`, bottom: `${-overscan}%`, y: safe ? y : 0 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
