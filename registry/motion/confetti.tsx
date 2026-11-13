"use client";
/**
 * @name confetti
 * @category motion
 * @description A short burst of flat paper pieces in the chart colours from a point, falling and fading on a canvas over the page, started from code (the handle's `fire`) and never under reduced motion; it says nothing and takes no clicks.
 * @when Marking a rare success the person worked for: a first project published, a goal reached. Never for routine actions, never on page load. Say the success in words as well (a toast, a heading): the burst is decoration.
 * @example
 * const confetti = useRef<ConfettiHandle>(null);
 * <Confetti handleRef={confetti} />
 * <Button onClick={(e) => confetti.current?.fire({ x: e.clientX, y: e.clientY })}>Publish</Button>
 */
import { useEffect, useImperativeHandle, useRef, type ComponentProps, type Ref } from "react";
import { cn } from "@/lib/cn";
import { useMotionSafe } from "@/lib/motion";
import { readThemeColor } from "@/lib/theme-color";

export type ConfettiHandle = {
  /** A burst from a point in the window (clientX, clientY); the middle of the window when left out. */
  fire: (from?: { x: number; y: number }) => void;
};

export type ConfettiProps = Omit<ComponentProps<"canvas">, "children"> & {
  handleRef?: Ref<ConfettiHandle>;
  /** Pieces in one burst. Default 120. */
  count?: number;
  /** Seconds a burst lasts. Default 1.8. */
  duration?: number;
};

type Piece = { x: number; y: number; vx: number; vy: number; turn: number; spin: number; w: number; h: number; color: string };

export function Confetti({ handleRef, count = 120, duration = 1.8, className, ...props }: ConfettiProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pieces = useRef<Piece[]>([]);
  const frame = useRef(0);
  const started = useRef(0);
  const safe = useMotionSafe();
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useImperativeHandle(
    handleRef,
    () => ({
      fire(from) {
        const node = canvas.current;
        if (!safe || !node) return;
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        node.width = window.innerWidth * ratio;
        node.height = window.innerHeight * ratio;
        const context = node.getContext("2d");
        if (!context) return;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        const colors = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"].map((name) => readThemeColor(name, node));
        const x = from?.x ?? window.innerWidth / 2;
        const y = from?.y ?? window.innerHeight / 2;
        pieces.current = Array.from({ length: count }, (_, i) => {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
          const speed = 6 + Math.random() * 8;
          return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, turn: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 4, h: 3 + Math.random() * 3, color: colors[i % colors.length] ?? "currentColor" };
        });
        started.current = performance.now();
        cancelAnimationFrame(frame.current);
        const step = (now: number): void => {
          const age = (now - started.current) / 1000;
          context.clearRect(0, 0, window.innerWidth, window.innerHeight);
          if (age > duration) return;
          const fade = Math.max(0, 1 - age / duration);
          for (const p of pieces.current) {
            p.vy += 0.35;
            p.vx *= 0.985;
            p.x += p.vx;
            p.y += p.vy;
            p.turn += p.spin;
            context.save();
            context.globalAlpha = fade;
            context.translate(p.x, p.y);
            context.rotate(p.turn);
            context.fillStyle = p.color;
            context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            context.restore();
          }
          frame.current = requestAnimationFrame(step);
        };
        frame.current = requestAnimationFrame(step);
      },
    }),
    [safe, count, duration],
  );
  return <canvas ref={canvas} data-slot="confetti" aria-hidden="true" className={cn("pointer-events-none fixed inset-0 z-[70] size-full", className)} {...props} />;
}
