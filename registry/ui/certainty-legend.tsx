"use client";
/**
 * @name certainty-legend
 * @category ui
 * @description A small key of three or four named classes (how sure something is, or any other kind), each with its own pattern as well as its own colour, where each class can be switched off and on.
 * @when A scene, a map, a drawing or a chart marks its parts by class and the reader needs the key and a way to hide a class: what is recorded, what is worked out, what is a guess. The project supplies the names; the legend reports which classes are shown (`onValueChange`) and the project applies that to its own scene. Use CertaintySwatch to draw the same pattern in the scene's own key or in a caption. The pattern is what tells classes apart for someone who cannot tell the colours apart, so use it in the scene too. For filters with no key use chip; for the series of a chart, the chart's own legend.
 * @example
 * const classes = [
 *   { id: "recorded", label: "Recorded", description: "Measured on site" },
 *   { id: "inferred", label: "Inferred", description: "Worked out from what remains" },
 *   { id: "imagined", label: "Imagined", description: "A guess, drawn to complete the picture" },
 * ];
 * <CertaintyLegend aria-label="How sure each part is" classes={classes} defaultValue={["recorded", "inferred", "imagined"]} onValueChange={(shown) => scene.show(shown)} />
 *
 * // The same pattern elsewhere
 * <CertaintySwatch pattern="hatch" tone={2} />
 */
import { Eye, EyeOff } from "lucide-react";
import { createContext, use, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

/** The patterns, in the order classes take them: the first class is solid, the second hatched, and so on. */
export const CERTAINTY_PATTERNS = ["solid", "hatch", "dots", "cross"] as const;
export type CertaintyPattern = (typeof CERTAINTY_PATTERNS)[number];
/** One of the theme's first four chart colours. */
export type CertaintyTone = 1 | 2 | 3 | 4;

export type CertaintyClass = {
  id: string;
  /** Its name. */
  label: string;
  /** A line under the name saying what the class means. */
  description?: string;
  /** Its pattern. Left out: by its place in the list. */
  pattern?: CertaintyPattern;
  /** Its colour. Left out: by its place in the list. */
  tone?: CertaintyTone;
};

const TONE: Record<CertaintyTone, string> = { 1: "text-chart-1", 2: "text-chart-2", 3: "text-chart-3", 4: "text-chart-4" };

/** The pattern and colour a class takes from its place in the list (0 is the first). */
export function certaintyStyle(index: number): { pattern: CertaintyPattern; tone: CertaintyTone } {
  const at = ((index % 4) + 4) % 4;
  return { pattern: CERTAINTY_PATTERNS[at] ?? "solid", tone: (at + 1) as CertaintyTone };
}

export type CertaintySwatchProps = Omit<ComponentProps<"svg">, "children"> & {
  pattern?: CertaintyPattern;
  tone?: CertaintyTone;
};

/**
 * A square filled with one pattern in one of the theme's chart colours. Decoration: it is hidden from
 * assistive technology, and the name beside it says what it stands for. Size it with `className` (`size-6`).
 */
export function CertaintySwatch({ className, pattern = "solid", tone = 1, ...props }: CertaintySwatchProps) {
  const id = useId();
  return (
    <svg data-slot="certainty-swatch" data-pattern={pattern} viewBox="0 0 16 16" aria-hidden="true" className={cn("size-4 shrink-0", TONE[tone], className)} {...props}>
      {pattern === "solid" ? null : (
        <defs>
          <pattern id={id} width={pattern === "dots" ? 16 / 3 : 4} height={pattern === "dots" ? 16 / 3 : 4} patternUnits="userSpaceOnUse">
            {pattern === "hatch" ? <path d="M-1 1 L1 -1 M0 4 L4 0 M3 5 L5 3" stroke="currentColor" strokeWidth="1.25" /> : null}
            {pattern === "dots" ? <circle cx={8 / 3} cy={8 / 3} r="1.3" fill="currentColor" /> : null}
            {pattern === "cross" ? <path d="M0 2 H4 M2 0 V4" stroke="currentColor" strokeWidth="1" /> : null}
          </pattern>
        </defs>
      )}
      <rect x="0.75" y="0.75" width="14.5" height="14.5" fill={pattern === "solid" ? "currentColor" : `url(#${id})`} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

type CertaintyLegendContextValue = { shown: readonly string[]; toggle: (id: string) => void; disabled: boolean };

const CertaintyLegendContext = createContext<CertaintyLegendContextValue | null>(null);

export type CertaintyLegendProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  /** The classes, in order. Left out, compose CertaintyLegendItem children yourself. */
  classes?: readonly CertaintyClass[];
  /** The ids of the classes that are shown: controlled. */
  value?: readonly string[];
  /** The classes shown at the start when uncontrolled. Default: every class in `classes`. */
  defaultValue?: readonly string[];
  /** Called with the ids now shown, in the order of `classes`, when one is switched. */
  onValueChange?: (shown: string[], changed: { id: string; shown: boolean }) => void;
  /** The classes cannot be switched: a key only. */
  disabled?: boolean;
  /** The items, when composed by hand. */
  children?: ReactNode;
};

/**
 * A named group of toggle buttons: name it with `aria-label` or `aria-labelledby` ("How sure each part
 * is"). Each button carries `aria-pressed` (pressed means shown), read when focus reaches it and when it
 * changes, so the legend announces nothing more. It applies nothing itself: the project hides and shows
 * the class in its own scene from `onValueChange`.
 */
export function CertaintyLegend({ className, classes, value, defaultValue, onValueChange, disabled = false, children, ...props }: CertaintyLegendProps) {
  const order = classes?.map((item) => item.id) ?? [];
  const [shown, setShown] = useControllableState<readonly string[]>({ value, defaultValue: defaultValue ?? order });

  const toggle = (id: string): void => {
    const on = !shown.includes(id);
    const next = on ? [...shown, id] : shown.filter((other) => other !== id);
    // In the order of the classes, so the value does not depend on the order of the presses.
    const sorted = [...next].sort((a, b) => (order.indexOf(a) === -1 ? order.length : order.indexOf(a)) - (order.indexOf(b) === -1 ? order.length : order.indexOf(b)));
    setShown(sorted);
    onValueChange?.(sorted, { id, shown: on });
  };

  return (
    <CertaintyLegendContext value={{ shown, toggle, disabled }}>
      <div data-slot="certainty-legend" role="group" className={cn("flex min-w-0 flex-wrap gap-2", className)} {...props}>
        {children ??
          classes?.map((item, index) => {
            const style = certaintyStyle(index);
            return (
              <CertaintyLegendItem key={item.id} value={item.id} pattern={item.pattern ?? style.pattern} tone={item.tone ?? style.tone} description={item.description}>
                {item.label}
              </CertaintyLegendItem>
            );
          })}
      </div>
    </CertaintyLegendContext>
  );
}

export type CertaintyLegendItemProps = Omit<ComponentProps<"button">, "value" | "type"> & {
  /** The id of the class. */
  value: string;
  pattern?: CertaintyPattern;
  tone?: CertaintyTone;
  /** A line under the name. */
  description?: ReactNode;
};

/**
 * One class: its swatch, its name, and whether it is shown. Switched off, it keeps its pattern and colour
 * (it is still the key) and is told apart by a crossed eye, a line through its name and `aria-pressed`,
 * never by fading alone.
 */
export function CertaintyLegendItem({ className, value, pattern = "solid", tone = 1, description, disabled, children, onClick, ...props }: CertaintyLegendItemProps) {
  const context = use(CertaintyLegendContext);
  if (!context) throw new Error("<CertaintyLegendItem> must be used inside <CertaintyLegend>.");
  const on = context.shown.includes(value);
  const locked = disabled ?? context.disabled;
  const Mark = on ? Eye : EyeOff;
  return (
    <button
      type="button"
      data-slot="certainty-legend-item"
      data-state={on ? "on" : "off"}
      data-class={value}
      aria-pressed={on}
      disabled={locked}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.toggle(value);
      }}
      className={cn(
        "group/certainty inline-flex min-h-(--control-h) max-w-full min-w-0 items-center gap-2.5 rounded-control border border-input bg-background px-3 py-1.5 text-start text-sm text-foreground transition-colors duration-instant ease-out hover:bg-accent disabled:pointer-events-none aria-pressed:border-border-strong motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <CertaintySwatch pattern={pattern} tone={tone} className="size-5" />
      <span className="flex min-w-0 flex-col">
        <span data-slot="certainty-legend-label" dir="auto" className="truncate font-medium group-data-[state=off]/certainty:line-through">
          {children}
        </span>
        {description ? (
          <span data-slot="certainty-legend-description" dir="auto" className="text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      {locked ? null : <Mark aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-muted-foreground" />}
    </button>
  );
}
