"use client";
/**
 * @name use-size
 * @category lib
 * @description Measures an element with ResizeObserver and returns its content width and height in whole pixels.
 * @when Drawing to the size of a container: charts, canvases. For layout that only needs to adapt, use container queries (`@container`, `@md:`) instead.
 * @example
 * const { ref, width, height } = useSize<HTMLDivElement>();
 * return <div ref={ref} className="aspect-video w-full">{width > 0 && <svg width={width} height={height} />}</div>;
 */
import { useEffect, useState } from "react";

export type Size = { width: number; height: number };

const EMPTY: Size = { width: 0, height: 0 };

/**
 * `ref` goes on the element to measure. Width and height are 0 on the server and until the first
 * measurement, so give the element its size in CSS (an aspect ratio or a height) and draw only when
 * `width > 0`: the layout then never shifts.
 */
export function useSize<T extends Element = HTMLDivElement>(): Size & { ref: (node: T | null) => void } {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState<Size>(EMPTY);

  useEffect(() => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      setSize((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref: setNode, width: size.width, height: size.height };
}
