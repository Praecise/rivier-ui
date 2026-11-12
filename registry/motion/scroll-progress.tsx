"use client";
/**
 * @name scroll-progress
 * @category motion
 * @description A thin bar fixed to the top of the viewport that fills as the page, or one element, is scrolled through.
 * @when Long reading pages: an article, documentation, a case study. Pass `target` to follow the article rather than the whole page. Not a loading indicator (use a progress control for that).
 * @example
 * <ScrollProgress />
 *
 * const article = useRef<HTMLElement>(null);
 * <ScrollProgress target={article} className="h-1" />
 * <article ref={article}>…</article>
 */
import { motion, useScroll, type HTMLMotionProps } from "motion/react";
import type { RefObject } from "react";
import { cn } from "@/lib/cn";
import { useMotionSafe } from "@/lib/motion";

export type ScrollProgressProps = HTMLMotionProps<"div"> & {
  /** Follow this element (from its top reaching the top of the viewport to its end reaching the bottom) instead of the page. */
  target?: RefObject<HTMLElement | null>;
};

/**
 * Decoration: aria-hidden, and it only ever changes scaleX. It is not rendered on the server or under
 * reduced motion, so nothing is drawn until it can show the real position.
 */
export function ScrollProgress({ className, target, style, ...props }: ScrollProgressProps) {
  const safe = useMotionSafe();
  const { scrollYProgress } = useScroll(target ? { target, offset: ["start start", "end end"] } : undefined);
  if (!safe) return null;

  return (
    <motion.div
      aria-hidden="true"
      data-slot="scroll-progress"
      className={cn("pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary rtl:origin-right", className)}
      {...props}
      style={{ ...style, scaleX: scrollYProgress }}
    />
  );
}
