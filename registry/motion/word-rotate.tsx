"use client";
/**
 * @name word-rotate
 * @category motion
 * @description One word in a sentence that changes to the next of a list in place, rising and fading, once through the list (or round and round with `loop`, pausing while hovered or focused); screen readers hear the whole list once, and under reduced motion the last word simply stands.
 * @when A headline that names several things one after another: "Charts for teams / schools / newsrooms". Keep the words about the same length. For a whole heading appearing use text-reveal; for a number counting up use number-ticker.
 * @example
 * <h1>Maps for <WordRotate words={["teams", "schools", "newsrooms"]} /></h1>
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useMotionSafe } from "@/lib/motion";

export type WordRotateProps = Omit<ComponentProps<"span">, "children"> & {
  words: readonly string[];
  /** Milliseconds each word stays. Default 2200. */
  interval?: number;
  /** Go round again and again. Default false: once through, then the last word stays (no motion lasts past a few seconds). */
  loop?: boolean;
  /** Stops it where it is. */
  paused?: boolean;
  /** Joins the words for screen readers. Default: Intl's list format in `locale`. */
  locale?: string;
};

export function WordRotate({ words, interval = 2200, loop = false, paused = false, locale = "en-US", className, ...props }: WordRotateProps) {
  const safe = useMotionSafe();
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false);
  const last = words.length - 1;
  const running = safe && !paused && !hold && words.length > 1 && (loop || index < last);
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setIndex((i) => (i >= last ? 0 : i + 1)), interval);
    return () => window.clearTimeout(timer);
  }, [running, index, interval, last]);
  const shown = safe ? (words[index] ?? "") : (words[last] ?? "");
  const spoken = new Intl.ListFormat(locale, { type: "disjunction" }).format(words);
  return (
    <span data-slot="word-rotate" className={cn("relative inline-grid align-bottom", className)} onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)} {...props}>
      <span className="sr-only">{spoken}</span>
      {/* The widest word holds the space, so the sentence does not jump. */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {words.reduce((a, b) => (b.length > a.length ? b : a), "")}
      </span>
      <span aria-hidden="true" className="col-start-1 row-start-1 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={shown}
            className="inline-block"
            initial={safe ? { opacity: 0, y: "60%" } : false}
            animate={{ opacity: 1, y: "0%" }}
            exit={safe ? { opacity: 0, y: "-60%" } : { opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          >
            {shown}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
