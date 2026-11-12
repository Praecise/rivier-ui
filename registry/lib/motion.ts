"use client";
/**
 * @name motion
 * @category lib
 * @description The motion tokens as numbers for the motion package (easing, durations, a pointer spring), the useMotionSafe gate, and the entrance engine the reveal components share.
 * @when Any component animated with the motion package: take timing from here so it matches the CSS tokens, and gate on useMotionSafe so server markup is the final state. For CSS transitions use the duration-* and ease-out utilities instead.
 * @example
 * const safe = useMotionSafe();
 * return (
 *   <motion.div
 *     initial={safe ? { opacity: 0 } : false}
 *     animate={{ opacity: 1 }}
 *     transition={{ duration: DURATION.slow, ease: EASE }}
 *   />
 * );
 */
import { animate, useInView, useReducedMotion, type UseInViewOptions } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from "react";

/** Mirrors --ease: cubic-bezier(0.2, 0, 0, 1). */
export const EASE = [0.2, 0, 0, 1] as const;

/** Mirrors --duration-instant, --duration-base, --duration-slow and --duration-scene, in seconds. */
export const DURATION = { instant: 0.12, base: 0.2, slow: 0.32, scene: 0.7 } as const;

/** The spring pointer effects (magnetic, tilt, spotlight) settle with: quick, no visible overshoot. */
export const SPRING = { stiffness: 260, damping: 28, mass: 0.6 } as const;

const subscribe = (): (() => void) => () => {};
const onClient = (): boolean => true;
const onServer = (): boolean => false;

/**
 * True only when motion is allowed (the visitor has not asked for reduced motion) and the component is on the
 * client. It is false on the server and for the hydration render, so server markup is always the final,
 * readable state; it is already true on the first render of a component that mounts on the client later
 * (a route change, conditional UI), so an entrance can start without a flash.
 */
export function useMotionSafe(): boolean {
  const mounted = useSyncExternalStore(subscribe, onClient, onServer);
  const reduced = useReducedMotion();
  return mounted && !reduced;
}

/** Whether the device has a pointer that hovers precisely (a mouse or trackpad). Call it in an effect or handler. */
export function isFinePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Whether the element's box is entirely outside the viewport. Call it in an effect or handler. */
export function isOffscreen(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.top >= window.innerHeight || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.right <= 0;
}

/** The way content travels as it arrives. "start" and "end" follow the writing direction. */
export type EntranceDirection = "up" | "down" | "start" | "end" | "none";

export type EntranceOptions = {
  /** The way the content travels as it arrives. Default "up". */
  direction?: EntranceDirection;
  /** How far it travels, in pixels. Default 24. */
  distance?: number;
  /** Seconds each element takes. Default DURATION.scene. */
  duration?: number;
  /** Seconds before it starts: a number, or a function of the element's index for a stagger. */
  delay?: number | ((index: number, elements: HTMLElement[]) => number);
  /** Play once (default), or again each time it comes back into view. */
  once?: boolean;
  /**
   * What happens when the content is already in view as the page loads. false (default): it is left as it is,
   * so nothing that was readable disappears. true: it is hidden and then played, for a hero that should arrive.
   */
  playOnLoad?: boolean;
  /** Grows or shrinks the viewport edge used for "in view", as a CSS margin ("0px 0px -10% 0px"). */
  margin?: UseInViewOptions["margin"];
  /** How much of the root must be in view: "some" (default), "all", or a fraction. */
  amount?: UseInViewOptions["amount"];
};

function startOffset(root: HTMLElement, direction: EntranceDirection, distance: number): string | null {
  if (direction === "none" || distance === 0) return null;
  if (direction === "up") return `translate3d(0px, ${distance}px, 0px)`;
  if (direction === "down") return `translate3d(0px, ${-distance}px, 0px)`;
  const rtl = getComputedStyle(root).direction === "rtl";
  const towardsLeft = (direction === "start") !== rtl;
  return `translate3d(${towardsLeft ? distance : -distance}px, 0px, 0px)`;
}

function clearEntrance(element: HTMLElement): void {
  element.style.removeProperty("opacity");
  element.style.removeProperty("transform");
}

/**
 * The entrance shared by reveal, stagger and text-reveal. It watches `rootRef` (an element that is never
 * transformed, so one that starts clipped or moved out of view is still detected) and fades and moves the
 * elements `getTargets` returns. Only opacity and transform are touched, and only from effects: the markup
 * React renders is always the final state, and the inline styles are removed again when the entrance ends.
 */
export function useEntrance(
  rootRef: RefObject<HTMLElement | null>,
  getTargets: (root: HTMLElement) => HTMLElement[],
  options: EntranceOptions = {},
): void {
  const { once = true, margin, amount } = options;
  const safe = useMotionSafe();
  const inView = useInView(rootRef, { once, margin, amount });

  const latest = useRef({ getTargets, options });
  const state = useRef<{ phase: "idle" | "hidden" | "shown"; seen: boolean; run: number; stop: (() => void) | null }>({
    phase: "idle",
    seen: false,
    run: 0,
    stop: null,
  });
  useLayoutEffect(() => {
    latest.current = { getTargets, options };
  });

  const controls = useRef({
    hide(root: HTMLElement): void {
      const current = state.current;
      const { direction = "up", distance = 24 } = latest.current.options;
      const offset = startOffset(root, direction, distance);
      current.stop?.();
      current.stop = null;
      current.run += 1;
      for (const element of latest.current.getTargets(root)) {
        element.style.opacity = "0";
        if (offset) element.style.transform = offset;
      }
      current.phase = "hidden";
    },
    play(root: HTMLElement): void {
      const current = state.current;
      const { direction = "up", distance = 24, duration = DURATION.scene, delay = 0 } = latest.current.options;
      const offset = startOffset(root, direction, distance);
      const elements = latest.current.getTargets(root);
      const run = (current.run += 1);
      const delays = elements.map((_, index) => (typeof delay === "function" ? delay(index, elements) : delay));
      const animations = elements.map((element, index) => {
        const keyframes = offset ? { opacity: [0, 1], transform: [offset, "translate3d(0px, 0px, 0px)"] } : { opacity: [0, 1] };
        const animation = animate(element, keyframes, { duration, ease: EASE, delay: delays[index] ?? 0 });
        animation.finished.then(
          () => {
            if (state.current.run === run) clearEntrance(element);
          },
          () => {},
        );
        return animation;
      });
      current.stop = () => {
        for (const animation of animations) animation.stop();
      };
      current.phase = "shown";
    },
    reset(root: HTMLElement): void {
      const current = state.current;
      current.stop?.();
      current.stop = null;
      current.run += 1;
      for (const element of latest.current.getTargets(root)) clearEntrance(element);
      current.phase = "idle";
    },
  });

  // Before paint: hide only what the visitor cannot see yet (or everything, when asked to play on load).
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!safe || !root) return;
    const { hide, reset } = controls.current;
    if (latest.current.options.playOnLoad || isOffscreen(root)) hide(root);
    return () => reset(root);
  }, [safe, rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!safe || !root) return;
    const current = state.current;
    if (inView) {
      current.seen = true;
      if (current.phase === "hidden") controls.current.play(root);
    } else if (!once && current.seen && current.phase !== "hidden") {
      controls.current.hide(root);
    }
  }, [inView, safe, once, rootRef]);
}
