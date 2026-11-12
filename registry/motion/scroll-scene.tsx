"use client";
/**
 * @name scroll-scene
 * @category motion
 * @description A tall section with a pinned viewport whose children are driven by scroll progress from 0 to 1, for scroll-told sequences.
 * @when A product story told as the visitor scrolls: steps that replace each other, a device that turns, a diagram that builds. Use sparingly, one or two per page. For a simple entrance use reveal; for a drifting background use parallax.
 * @example
 * <ScrollScene length={3}>
 *   <ScrollSceneStep from={0} to={0.33} className="grid place-items-center p-6">
 *     <h2 className="text-3xl font-medium">Design</h2>
 *   </ScrollSceneStep>
 *   <ScrollSceneStep from={0.33} to={0.66} className="grid place-items-center p-6">
 *     <h2 className="text-3xl font-medium">Build</h2>
 *   </ScrollSceneStep>
 *   <ScrollSceneStep from={0.66} to={1} className="grid place-items-center p-6">
 *     <h2 className="text-3xl font-medium">Launch</h2>
 *   </ScrollSceneStep>
 * </ScrollScene>
 *
 * <ScrollScene length={2}>
 *   {(progress, active) => <Dial progress={progress} still={!active} />}
 * </ScrollScene>
 *
 * function Dial({ progress, still }: { progress: MotionValue<number>; still: boolean }) {
 *   const rotate = useTransform(progress, [0, 1], [0, 180]);
 *   return <motion.div className="size-40 border" style={{ rotate: still ? 0 : rotate }} />;
 * }
 */
import { motion, useReducedMotion, useScroll, useTransform, type HTMLMotionProps, type MotionValue } from "motion/react";
import { createContext, useContext, useImperativeHandle, useRef, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useMotionSafe } from "@/lib/motion";

type Scene = { progress: MotionValue<number>; active: boolean };

const SceneContext = createContext<Scene | null>(null);

function useScene(): Scene {
  const scene = useContext(SceneContext);
  if (!scene) throw new Error("useSceneProgress and ScrollSceneStep must be used inside <ScrollScene>.");
  return scene;
}

/** The scene's scroll progress, 0 at the moment it pins to 1 at the moment it lets go, as a motion value. */
export function useSceneProgress(): MotionValue<number> {
  return useScene().progress;
}

/**
 * Whether the scene is pinned and scroll-driven. False on the server, before hydration and under reduced
 * motion: then the scene is an ordinary stack, and children should show their content in full.
 */
export function useSceneActive(): boolean {
  return useScene().active;
}

export type ScrollSceneProps = Omit<ComponentProps<"section">, "children"> & {
  /** How long the scene stays pinned, in viewport heights of scrolling (its total height). Default 3. */
  length?: number;
  /** Content, or a function given the progress value and whether the scene is active. */
  children?: ReactNode | ((progress: MotionValue<number>, active: boolean) => ReactNode);
  /** Classes for the pinned viewport that holds the children. */
  viewportClassName?: string;
};

/**
 * Height: the section reserves `length` viewport heights with a min-height that is in the server markup, so
 * the page's layout is the same before and after the scene starts. Until it is active the children are an
 * ordinary, readable stack inside that space; once active they sit in a sticky, viewport-high box. Under
 * reduced motion the reserved height is dropped in CSS from the first paint and nothing pins.
 */
export function ScrollScene({ className, viewportClassName, length = 3, children, style, ref, ...props }: ScrollSceneProps) {
  const rootRef = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLElement, []);
  const active = useMotionSafe();
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: rootRef, offset: ["start start", "end end"] });

  return (
    <section
      ref={rootRef}
      data-slot="scroll-scene"
      data-active={active || undefined}
      className={cn("relative min-h-[calc(var(--scene-length)*100svh)] motion-reduce:min-h-0", reduced && "min-h-0", className)}
      style={{ "--scene-length": Math.max(1, length), ...style } as CSSProperties}
      {...props}
    >
      <div data-slot="scroll-scene-viewport" className={cn("relative", active && "sticky top-0 h-svh overflow-hidden", viewportClassName)}>
        <SceneContext value={{ progress: scrollYProgress, active }}>
          {typeof children === "function" ? children(scrollYProgress, active) : children}
        </SceneContext>
      </div>
    </section>
  );
}

export type ScrollSceneStepProps = HTMLMotionProps<"div"> & {
  /** The progress (0 to 1) at which this step starts to appear. */
  from: number;
  /** The progress (0 to 1) by which it has gone. */
  to: number;
  /** How much of the scene each cross-fade takes, as progress. Default 0.06. */
  fade?: number;
};

/**
 * A layer that is shown between two points of the scene, cross-fading at each end (opacity only). A step that
 * starts at 0 is there from the beginning, and one that ends at 1 stays. When the scene is not active every
 * step is an ordinary block, fully visible, one after another.
 */
export function ScrollSceneStep({ className, from, to, fade = 0.06, style, ...props }: ScrollSceneStepProps) {
  const { progress, active } = useScene();
  const start = Math.max(0, Math.min(1, from));
  const end = Math.max(start, Math.min(1, to));
  const ramp = Math.min(Math.max(fade, 0.001), (end - start) / 2);

  const input: number[] = [];
  const output: number[] = [];
  const point = (at: number, value: number): void => {
    if (input.length > 0 && at <= (input[input.length - 1] ?? 0)) return;
    input.push(at);
    output.push(value);
  };
  if (start > 0) {
    point(start, 0);
    point(start + ramp, 1);
  } else {
    point(0, 1);
  }
  if (end < 1) {
    point(end - ramp, 1);
    point(end, 0);
  } else {
    point(1, 1);
  }
  // A step that never fades (0 to 1) still needs two points for the range.
  if (input.length < 2) {
    input.push((input[0] ?? 0) + 1);
    output.push(output[0] ?? 1);
  }

  const opacity = useTransform(progress, input, output);
  // A faded-out layer must not take clicks meant for the one showing. It stays in the accessibility tree.
  const pointerEvents = useTransform(opacity, (value) => (value > 0.5 ? "auto" : "none"));

  return (
    <motion.div
      data-slot="scroll-scene-step"
      className={cn(active && "absolute inset-0", className)}
      {...props}
      style={active ? { ...style, opacity, pointerEvents } : style}
    />
  );
}
