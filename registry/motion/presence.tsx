"use client";
/**
 * @name presence
 * @category motion
 * @description Animates its children in when they are shown and out before they are removed.
 * @when Conditional UI that is not a Radix primitive: an inline notice, a revealed panel, a step that swaps. Radix dialogs, popovers and menus already animate with their own classes; for content entering on scroll use reveal.
 * @example
 * const [open, setOpen] = useState(false);
 * <Button onClick={() => setOpen((value) => !value)}>Toggle</Button>
 * <Presence show={open} preset="slide-up" className="mt-4 rounded-surface border p-4">
 *   Saved. Your changes are live.
 * </Presence>
 */
import { AnimatePresence, motion, useReducedMotion, type AnimatePresenceProps, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";
import { DURATION, EASE, useMotionSafe } from "@/lib/motion";

export type PresencePreset = "fade" | "scale" | "slide-up" | "slide-down";

/** Where each preset starts from and leaves to. Shown is always opacity 1 with no transform. */
const HIDDEN: Record<PresencePreset, { opacity: number; scale?: number; y?: number }> = {
  fade: { opacity: 0 },
  scale: { opacity: 0, scale: 0.96 },
  "slide-up": { opacity: 0, y: 8 },
  "slide-down": { opacity: 0, y: -8 },
};

const SHOWN = { opacity: 1, scale: 1, y: 0 };

export type PresenceProps = Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit"> & {
  /** Whether the children are present. When it turns false they animate out and are then removed from the page. */
  show: boolean;
  /** fade, scale (fade with a slight grow), slide-up (rises in, sinks out) or slide-down. Default "fade". */
  preset?: PresencePreset;
  /** Also animate in when it is shown from the first render of a client-side mount. Never on server markup. Default false. */
  appear?: boolean;
  /** AnimatePresence mode: "sync" (default), "wait" or "popLayout". */
  mode?: AnimatePresenceProps["mode"];
  /** Called when the exit has finished and the children are gone. */
  onExitComplete?: () => void;
};

/**
 * Opacity and transform only. Content that is shown on the server is rendered in its final state (no
 * entrance on first render), and under reduced motion it appears and disappears at once.
 */
export function Presence({ className, show, preset = "fade", appear = false, mode = "sync", onExitComplete, transition, ...props }: PresenceProps) {
  const safe = useMotionSafe();
  const reduced = useReducedMotion();
  const hidden = HIDDEN[preset];

  return (
    <AnimatePresence initial={appear && safe} mode={mode} onExitComplete={onExitComplete}>
      {show ? (
        <motion.div
          key="presence"
          data-slot="presence"
          className={cn(className)}
          initial={hidden}
          animate={SHOWN}
          exit={hidden}
          transition={reduced ? { duration: 0 } : (transition ?? { duration: DURATION.base, ease: EASE })}
          {...props}
        />
      ) : null}
    </AnimatePresence>
  );
}
