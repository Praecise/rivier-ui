"use client";
/**
 * @name color-picker
 * @category ui
 * @description A colour chosen in OKLCH (lightness, chroma, hue: even steps the eye sees as even): a field of lightness and chroma to point at, a slider for each of the three that the keys drive, swatches of the project's colours, and the value as text that can be typed, in OKLCH or hex.
 * @when Choosing a brand colour, a highlight, a label colour. To choose among a few fixed colours use toggle-group or radio-group with swatches; for the theme's highlight use theme-provider (its accent hue and chroma are this picker's).
 * @example
 * <ColorPicker aria-label="Label colour" defaultValue="oklch(0.62 0.17 250)" swatches={["oklch(0.62 0.17 250)", "oklch(0.7 0.15 150)", "#d95926"]} />
 */
import { Slider } from "radix-ui";
import { useEffect, useId, useRef, useState, type ComponentProps, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { inputVariants } from "@/components/ui/input";

export type Oklch = { l: number; c: number; h: number };

const MAX_CHROMA = 0.37;

/** OKLCH to sRGB, each 0 to 1 (outside means out of the sRGB gamut). Björn Ottosson's matrices. */
export function oklchToRgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_];
  const gamma = (x: number): number => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.sign(x) * Math.abs(x) ** (1 / 2.4) - 0.055);
  return [gamma(linear[0] ?? 0), gamma(linear[1] ?? 0), gamma(linear[2] ?? 0)];
}

/** sRGB (0 to 1 each) to OKLCH. */
export function rgbToOklch([r, g, b]: [number, number, number]): Oklch {
  const lin = (x: number): number => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l_ = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m_ = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s_ = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const Bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const h = (Math.atan2(Bb, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, Bb), h: h < 0 ? h + 360 : h };
}

const inGamut = (rgb: readonly number[]): boolean => rgb.every((x) => x >= -0.0005 && x <= 1.0005);

/** Reads "oklch(L C H)" (L as 0–1 or a percentage) or "#rgb" / "#rrggbb". */
export function parseColor(text: string): Oklch | null {
  const t = text.trim().toLowerCase();
  const ok = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*[\d.%]+\s*)?\)$/.exec(t);
  if (ok) return { l: Number(ok[1]) / (ok[2] ? 100 : 1), c: Number(ok[3]), h: Number(ok[4]) % 360 };
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/.exec(t);
  if (hex) {
    const digits = (hex[1] ?? "").length === 3 ? [...(hex[1] ?? "")].map((d) => d + d).join("") : (hex[1] ?? "");
    return rgbToOklch([parseInt(digits.slice(0, 2), 16) / 255, parseInt(digits.slice(2, 4), 16) / 255, parseInt(digits.slice(4, 6), 16) / 255]);
  }
  return null;
}

export function formatColor(color: Oklch, format: "oklch" | "hex"): string {
  if (format === "hex") {
    const to = (x: number): string =>
      Math.round(Math.max(0, Math.min(1, x)) * 255)
        .toString(16)
        .padStart(2, "0");
    const [r, g, b] = oklchToRgb(color);
    return `#${to(r)}${to(g)}${to(b)}`;
  }
  return `oklch(${color.l.toFixed(3)} ${color.c.toFixed(3)} ${color.h.toFixed(1)})`;
}

export type ColorPickerLabels = { lightness: string; chroma: string; hue: string; value: string; swatches: string; outOfGamut: string; field: string };

const LABELS: ColorPickerLabels = {
  lightness: "Lightness",
  chroma: "Colourfulness",
  hue: "Hue",
  value: "Colour value",
  swatches: "Colours",
  outOfGamut: "Outside what most screens show: it will be shown a little less colourful",
  field: "Lightness and colourfulness",
};

export type ColorPickerProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  /** A CSS colour as "oklch(…)" or "#rrggbb". */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** How the value is written. Default "oklch". */
  format?: "oklch" | "hex";
  swatches?: readonly string[];
  labels?: Partial<ColorPickerLabels>;
  name?: string;
};

export function ColorPicker({ value, defaultValue = "oklch(0.62 0.17 250)", onValueChange, format = "oklch", swatches = [], labels: given, name, className, ...props }: ColorPickerProps) {
  const labels = { ...LABELS, ...given };
  const [text, setText] = useControllableState<string>({ value, defaultValue, onChange: onValueChange });
  const color = parseColor(text) ?? { l: 0.62, c: 0.17, h: 250 };
  const [draft, setDraft] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const textId = useId();
  const set = (next: Oklch): void => setText(formatColor({ l: Math.max(0, Math.min(1, next.l)), c: Math.max(0, Math.min(MAX_CHROMA, next.c)), h: ((next.h % 360) + 360) % 360 }, format));
  const gamut = inGamut(oklchToRgb(color));

  // The field is drawn pixel by pixel from the maths: lightness up, chroma across, at the current hue.
  useEffect(() => {
    const node = canvas.current;
    const context = node?.getContext("2d");
    if (!node || !context) return;
    const w = 96;
    const h = 64;
    node.width = w;
    node.height = h;
    const image = context.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const rgb = oklchToRgb({ l: 1 - y / (h - 1), c: (x / (w - 1)) * MAX_CHROMA, h: color.h });
        const i = (y * w + x) * 4;
        const outside = !inGamut(rgb);
        image.data[i] = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255);
        image.data[i + 1] = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255);
        image.data[i + 2] = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255);
        // Colours a screen cannot show are faded, so the edge of the gamut is visible.
        image.data[i + 3] = outside ? 70 : 255;
      }
    }
    context.putImageData(image, 0, 0);
  }, [color.h]);

  const pointAt = (event: PointerEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    const fy = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    // The field is not mirrored in a right-to-left page: chroma grows to the right like the hue bar.
    set({ l: 1 - fy, c: fx * MAX_CHROMA, h: color.h });
  };
  const slider = (label: string, valueOf: number, max: number, stepOf: number, onSet: (v: number) => void, text: string, track: string) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{text}</span>
      </div>
      <Slider.Root value={[valueOf]} max={max} step={stepOf} onValueChange={(v) => onSet(v[0] ?? 0)} dir="ltr" className="relative flex h-6 touch-none select-none items-center">
        <Slider.Track className="relative h-2 grow overflow-hidden rounded-full" style={{ background: track }}>
          <Slider.Range className="absolute h-full" />
        </Slider.Track>
        <Slider.Thumb aria-label={label} aria-valuetext={text} className="block size-5 rounded-full border-2 border-background bg-foreground outline-offset-2 pointer-coarse:size-7" />
      </Slider.Root>
    </div>
  );
  const stops = (fn: (t: number) => Oklch): string => `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) => formatColor(fn(i / 8), "hex")).join(", ")})`;
  const css = formatColor(color, "oklch");

  return (
    <div data-slot="color-picker" role="group" className={cn("flex w-full max-w-80 min-w-0 flex-col gap-3", className)} {...props}>
      <div
        data-slot="color-picker-field"
        aria-hidden="true"
        className="relative aspect-[3/2] w-full cursor-crosshair touch-none overflow-hidden rounded-surface border"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pointAt(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) pointAt(event);
        }}
      >
        <canvas ref={canvas} className="size-full" style={{ imageRendering: "auto" }} />
        <span
          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background outline-2 outline-foreground"
          style={{ left: `${(color.c / MAX_CHROMA) * 100}%`, top: `${(1 - color.l) * 100}%`, background: css }}
        />
      </div>
      <span className="sr-only">{labels.field}</span>
      {slider(
        labels.lightness,
        Math.round(color.l * 1000),
        1000,
        5,
        (v) => set({ ...color, l: v / 1000 }),
        `${Math.round(color.l * 100)}%`,
        stops((t) => ({ l: t, c: Math.min(color.c, 0.12), h: color.h })),
      )}
      {slider(
        labels.chroma,
        Math.round(color.c * 1000),
        Math.round(MAX_CHROMA * 1000),
        5,
        (v) => set({ ...color, c: v / 1000 }),
        color.c.toFixed(3),
        stops((t) => ({ l: color.l, c: t * MAX_CHROMA, h: color.h })),
      )}
      {slider(
        labels.hue,
        Math.round(color.h),
        359,
        1,
        (v) => set({ ...color, h: v }),
        `${Math.round(color.h)}°`,
        stops((t) => ({ l: 0.7, c: 0.13, h: t * 359 })),
      )}
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-(--control-h) shrink-0 rounded-control border" style={{ background: css }} />
        <input
          id={textId}
          aria-label={labels.value}
          value={draft ?? text}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft !== null) {
              const parsed = parseColor(draft);
              if (parsed) set(parsed);
              setDraft(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && draft !== null) {
              const parsed = parseColor(draft);
              if (parsed) set(parsed);
              setDraft(null);
            }
          }}
          aria-invalid={draft !== null && parseColor(draft) === null ? true : undefined}
          className={cn(inputVariants(), "font-mono text-xs")}
        />
      </div>
      {!gamut ? (
        <p data-slot="color-picker-gamut" className="text-xs text-muted-foreground">
          {labels.outOfGamut}
        </p>
      ) : null}
      {swatches.length > 0 ? (
        <div role="group" aria-label={labels.swatches} className="flex flex-wrap gap-2">
          {swatches.map((swatch) => {
            const parsed = parseColor(swatch);
            const chosen = parsed !== null && formatColor(parsed, "hex") === formatColor(color, "hex");
            return (
              <button
                key={swatch}
                type="button"
                aria-pressed={chosen}
                aria-label={swatch}
                onClick={() => parsed && set(parsed)}
                className={cn("size-8 rounded-control border pointer-coarse:size-10", chosen && "outline-2 outline-offset-2 outline-foreground")}
                style={{ background: parsed ? formatColor(parsed, "oklch") : swatch }}
              />
            );
          })}
        </div>
      ) : null}
      {name ? <input type="hidden" name={name} value={text} /> : null}
    </div>
  );
}
