"use client";
/**
 * @name page-transition
 * @category motion
 * @description Wraps page content and plays a short enter (a fade and a small rise) each time the route changes.
 * @when The content area of an app or site, once, in the layout. The first page load is not animated. Where the browser supports it and elements should morph between pages, use view-transition instead; do not use both.
 * @example
 * // app/template.tsx (Next.js). A template is re-created on navigation; the pathname is the key.
 * "use client";
 * import { usePathname } from "next/navigation";
 * import type { ReactNode } from "react";
 * import { PageTransition } from "@/components/motion/page-transition";
 *
 * export default function Template({ children }: { children: ReactNode }) {
 *   return <PageTransition routeKey={usePathname()}>{children}</PageTransition>;
 * }
 */
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";
import { DURATION, EASE, useMotionSafe } from "@/lib/motion";

export type PageTransitionProps = Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit"> & {
  /** Identifies the page: the pathname. The enter plays when it changes. */
  routeKey: string;
  /** How far the new page rises as it fades in, in pixels. Default 8. */
  distance?: number;
  /**
   * Also fade the old page out before the new one enters (AnimatePresence mode="wait"). This needs the
   * PageTransition itself to stay mounted while its children change, as in a persistent layout that passes
   * the route's element down; in a Next.js template the old page is removed at once, so leave it off there.
   */
  exit?: boolean;
};

/**
 * Opacity and transform only, and nothing is hidden in server markup: on the server and for the hydration
 * render the page is in its final state, and the enter plays only for pages mounted on the client after
 * that. Under reduced motion pages change at once.
 */
export function PageTransition({ className, routeKey, distance = 8, exit = false, transition, ...props }: PageTransitionProps) {
  const safe = useMotionSafe();
  const reduced = useReducedMotion();
  const timing = reduced ? { duration: 0 } : (transition ?? { duration: DURATION.slow, ease: EASE });

  const page = (
    <motion.div
      key={routeKey}
      data-slot="page-transition"
      className={cn(className)}
      initial={safe ? { opacity: 0, y: distance } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={exit && !reduced ? { opacity: 0 } : undefined}
      transition={timing}
      {...props}
    />
  );

  if (!exit) return page;
  return (
    <AnimatePresence mode="wait" initial={false}>
      {page}
    </AnimatePresence>
  );
}
