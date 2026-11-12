"use client";
/**
 * @name theme-color
 * @category lib
 * @description Resolves a theme CSS variable such as "--highlight" to an rgb() string that three.js and canvas code can parse, and re-reads it when the theme changes.
 * @when Anything that cannot use a Tailwind class or `var()`: three.js materials, canvas drawing. In markup use the token classes (`bg-primary`, `fill-chart-1`) instead.
 * @example
 * const { "--highlight": highlight, "--foreground": ink } = useThemeColors(["--highlight", "--foreground"]);
 * material.color.set(highlight);
 *
 * // Outside React:
 * const border = readThemeColor("--border");
 */
import { useEffect, useState } from "react";

/** What is returned on the server, and when a variable does not exist or the browser cannot resolve it. */
const NEUTRAL = "rgb(128, 128, 128)";
/** The canvas keeps this when it is handed a colour it cannot parse; it is how a failed parse is detected. */
const SENTINEL = "rgb(1, 2, 3)";
const WATCHED = ["class", "data-theme", "data-accent", "style"];

let pixel: CanvasRenderingContext2D | null | undefined;

/** Any CSS colour the browser understands (oklch included) to "rgb(r, g, b)", by painting one pixel and reading it back. */
function toRgb(css: string): string | null {
  if (pixel === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    pixel = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!pixel) return null;
  pixel.fillStyle = SENTINEL;
  const before = pixel.fillStyle;
  pixel.fillStyle = css;
  if (pixel.fillStyle === before && css !== SENTINEL) return null;
  pixel.clearRect(0, 0, 1, 1);
  pixel.fillRect(0, 0, 1, 1);
  const data = pixel.getImageData(0, 0, 1, 1).data;
  const alpha = (data[3] ?? 0) / 255;
  if (alpha === 0) return null;
  // The canvas stores premultiplied colour: divide the alpha back out. The alpha itself is dropped,
  // because THREE.Color has no alpha channel.
  const channel = (index: number): number => Math.min(255, Math.round((data[index] ?? 0) / alpha));
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/**
 * Resolves a CSS variable ("--highlight") to "rgb(r, g, b)" as it applies to `element` (default: <html>), so
 * a part of the page themed with its own `data-accent` resolves to its own colour. A value that is not a
 * variable name is treated as a CSS colour and converted the same way. Alpha is dropped.
 */
export function readThemeColor(name: string, element?: Element): string {
  if (typeof document === "undefined") return NEUTRAL;
  const target = element ?? document.documentElement;
  // A probe needs a parent that renders children: not a canvas, and <body> rather than <html>.
  const host = target instanceof HTMLCanvasElement ? (target.parentElement ?? document.body) : target === document.documentElement ? (document.body ?? target) : target;
  const isVariable = name.startsWith("--");
  if (isVariable && getComputedStyle(host).getPropertyValue(name).trim() === "") return NEUTRAL;
  // The browser, not this code, works out var() and calc() inside the token: a hidden element takes the
  // colour and its computed value is what gets painted.
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;width:0;height:0;visibility:hidden;pointer-events:none";
  probe.style.color = isVariable ? `var(${name})` : name;
  host.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return toRgb(computed) ?? NEUTRAL;
}

function readAll<const T extends readonly string[]>(names: T, element?: Element | null): Record<T[number], string> {
  const colors: Record<string, string> = {};
  for (const name of names) colors[name] = readThemeColor(name, element ?? undefined);
  return colors as Record<T[number], string>;
}

/**
 * The resolved colours for a list of variables, keyed by name, read again whenever the theme changes
 * (`class`, `data-theme`, `data-accent` or `style` on <html>, and on `element` when one is given).
 * On the server every colour is a neutral grey: do not print these values into server-rendered markup.
 */
export function useThemeColors<const T extends readonly string[]>(names: T, element?: Element | null): Record<T[number], string> {
  const key = names.join("|");
  const [state, setState] = useState(() => ({ key, element, colors: readAll(names, element) }));
  let current = state;
  // Asked for other variables, or for another element: read at once, so no render sees a missing colour.
  if (state.key !== key || state.element !== element) {
    current = { key, element, colors: readAll(names, element) };
    setState(current);
  }

  useEffect(() => {
    const list = key.split("|") as unknown as T;
    const update = (): void =>
      setState((previous) => {
        const next = readAll(list, element);
        return previous.key === key && previous.element === element && list.every((name: T[number]) => previous.colors[name] === next[name]) ? previous : { key, element, colors: next };
      });
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: WATCHED });
    // A themed part of the page: watch the elements between it and <html> too.
    for (let node = element?.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      observer.observe(node, { attributes: true, attributeFilter: WATCHED });
    }
    return () => observer.disconnect();
  }, [key, element]);

  return current.colors;
}
