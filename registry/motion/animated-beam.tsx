"use client";
/**
 * @name animated-beam
 * @category motion
 * @description A flat line drawn between two elements inside a container, bowed if asked, along which a row of dots lights up in turn from the start to the end, showing that something flows from one to the other; it follows the elements as the layout changes and stands still under reduced motion.
 * @when A diagram in a page that says data or work moves between parts: a source feeding a product, a step handing to the next. Decoration: say the same in words nearby. For a real diagram the person edits use flow-diagram; for amounts use sankey-chart.
 * @example
 * const box = useRef(null), a = useRef(null), b = useRef(null);
 * <div ref={box} className="relative flex justify-between">
 *   <div ref={a}>Source</div>
 *   <div ref={b}>Product</div>
 *   <AnimatedBeam containerRef={box} fromRef={a} toRef={b} curvature={40} />
 * </div>
 */
import { useEffect, useState, type ComponentProps, type CSSProperties, type RefObject } from "react";
import { cn } from "@/lib/cn";

export type AnimatedBeamProps = Omit<ComponentProps<"svg">, "children"> & {
  /** The positioned box both elements are in; the beam is drawn over it. */
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  /** How far the line bows, in pixels; negative bows the other way. Default 0. */
  curvature?: number;
  /** How many dots travel along it. Default 8. */
  dots?: number;
  /** Seconds for the light to cross. Default 2. */
  duration?: number;
  /** The CSS variable of its colour. Default "--highlight". */
  color?: string;
};

type Line = { width: number; height: number; d: string; points: { x: number; y: number }[] };

export function AnimatedBeam({ containerRef, fromRef, toRef, curvature = 0, dots = 8, duration = 2, color = "--highlight", className, style, ...props }: AnimatedBeamProps) {
  const [line, setLine] = useState<Line | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    const from = fromRef.current;
    const to = toRef.current;
    if (!container || !from || !to) return;
    let frame = 0;
    const measure = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = container.getBoundingClientRect();
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const x1 = a.left + a.width / 2 - box.left;
        const y1 = a.top + a.height / 2 - box.top;
        const x2 = b.left + b.width / 2 - box.left;
        const y2 = b.top + b.height / 2 - box.top;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2 - curvature;
        const points = Array.from({ length: dots }, (_, i) => {
          const t = (i + 0.5) / dots;
          return { x: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2, y: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2 };
        });
        setLine({ width: box.width, height: box.height, d: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`, points });
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(from);
    observer.observe(to);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [containerRef, fromRef, toRef, curvature, dots]);
  if (!line) return null;
  return (
    <svg
      data-slot="animated-beam"
      aria-hidden="true"
      width={line.width}
      height={line.height}
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-visible", className)}
      style={{ color: `var(${color})`, ...style }}
      {...props}
    >
      <path d={line.d} fill="none" className="stroke-border-strong" strokeWidth={1.5} />
      {line.points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={2.5}
          fill="currentColor"
          className="animate-[beam_var(--beam-duration)_linear_infinite] opacity-15 motion-reduce:animate-none motion-reduce:opacity-60"
          style={{ ["--beam-duration" as string]: `${duration}s`, animationDelay: `${(index / line.points.length) * duration}s` } as CSSProperties}
        />
      ))}
      <style>{"@keyframes beam { 0%, 100% { opacity: 0.15 } 12% { opacity: 1 } 30% { opacity: 0.15 } }"}</style>
    </svg>
  );
}
