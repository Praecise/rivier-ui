"use client";
/**
 * @name number-stepper
 * @category ui
 * @description A number with a button either side to take one away or add one, that can also be typed: a spin button.
 * @when A small whole number that is usually changed by a step or two: people in a party, a quantity, nights. For a number where the rough position matters use slider; for a free number (a price, a year) use input with type="number". Name it with a Label (pass the same `id`) or `aria-label`.
 * @example
 * <Label htmlFor="adults">Adults</Label>
 * <NumberStepper id="adults" defaultValue={2} min={1} max={12} />
 *
 * // Controlled, with its own parts and translated button names
 * <NumberStepper value={nights} onValueChange={setNights} min={1} aria-label="Nights">
 *   <NumberStepperDecrement aria-label="One night fewer" />
 *   <NumberStepperInput />
 *   <NumberStepperIncrement aria-label="One night more" />
 * </NumberStepper>
 */
import { Minus, Plus } from "lucide-react";
import { createContext, use, useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

type StepperContextValue = {
  inputId: string;
  value: number;
  min: number;
  max: number;
  step: number;
  largeStep: number;
  disabled: boolean;
  readOnly: boolean;
  name: string | undefined;
  format: (value: number) => string;
  valueText: ((value: number) => string) | undefined;
  labelProps: { "aria-label"?: string | undefined; "aria-labelledby"?: string | undefined; "aria-describedby"?: string | undefined; "aria-invalid"?: ComponentProps<"input">["aria-invalid"] };
  /** Sets the value, clamped to the range and snapped to the step. */
  commit: (next: number) => void;
};

const StepperContext = createContext<StepperContextValue | null>(null);

function useStepper(part: string): StepperContextValue {
  const context = use(StepperContext);
  if (!context) throw new Error(`<${part}> must be used inside <NumberStepper>.`);
  return context;
}

/** The number of decimal places a step has, so that 0.1 + 0.2 is shown as 0.3. */
function decimals(step: number): number {
  const text = String(step);
  const point = text.indexOf(".");
  return point === -1 ? 0 : text.length - point - 1;
}

export type NumberStepperProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  /** The controlled value. */
  value?: number;
  /** The starting value when uncontrolled. Default: `min`, or 0. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  /** What one press or one arrow key adds or takes away. Default 1. */
  step?: number;
  /** What Page Up and Page Down add or take away. Default ten steps. */
  largeStep?: number;
  disabled?: boolean;
  readOnly?: boolean;
  /** The field's name in a form: the value is submitted with it. */
  name?: string;
  /** How the number is shown in the field. Default: the plain number. */
  format?: (value: number) => string;
  /** What a screen reader says for a value when the number alone is not enough ("3 adults"). */
  valueText?: (value: number) => string;
  /** The parts, when the default three (decrement, input, increment) are not what is wanted. */
  children?: ReactNode;
};

/**
 * The spin button pattern: Up and Down arrows change the value by a step, Page Up and Page Down by a large
 * step, Home and End go to the limits (when there are any). The buttons are for pointers and touch, and are
 * kept out of the Tab order because the arrow keys already do their work. `id`, `aria-label`,
 * `aria-labelledby`, `aria-describedby` and `aria-invalid` go to the field itself.
 */
export function NumberStepper({
  className,
  id,
  value,
  defaultValue,
  onValueChange,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  largeStep,
  disabled = false,
  readOnly = false,
  name,
  format = String,
  valueText,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: NumberStepperProps) {
  const ownId = useId();
  const [current, setCurrent] = useControllableState({ value, defaultValue: defaultValue ?? (Number.isFinite(min) ? min : 0), onChange: onValueChange });
  const places = decimals(step);
  const commit = (next: number): void => {
    if (Number.isNaN(next)) return;
    setCurrent(Number(Math.min(max, Math.max(min, next)).toFixed(places)));
  };

  return (
    <StepperContext
      value={{
        inputId: id ?? ownId,
        value: current,
        min,
        max,
        step,
        largeStep: largeStep ?? step * 10,
        disabled,
        readOnly,
        name,
        format,
        valueText,
        labelProps: { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid },
        commit,
      }}
    >
      <div
        data-slot="number-stepper"
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "inline-flex h-control w-fit max-w-full items-stretch rounded-control border border-input bg-background text-sm text-foreground has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring has-[input[aria-invalid=true]]:border-destructive data-[disabled]:opacity-50",
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            <NumberStepperDecrement />
            <NumberStepperInput />
            <NumberStepperIncrement />
          </>
        )}
      </div>
    </StepperContext>
  );
}

export type NumberStepperInputProps = Omit<ComponentProps<"input">, "value" | "defaultValue" | "type" | "min" | "max" | "step">;

/** The field. It shows the formatted value, takes typing, and commits what was typed on Enter or on leaving. */
export function NumberStepperInput({ className, onKeyDown, onBlur, ...props }: NumberStepperInputProps) {
  const context = useStepper("NumberStepperInput");
  const { value, min, max, step, largeStep, commit } = context;
  /** What is being typed, until it is committed. null: the field shows the value. */
  const [draft, setDraft] = useState<string | null>(null);

  const commitDraft = (): void => {
    if (draft === null) return;
    const typed = Number(draft.trim().replace(",", "."));
    if (draft.trim() !== "" && !Number.isNaN(typed)) commit(typed);
    setDraft(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || context.readOnly) return;
    const base = draft === null ? value : Number(draft.replace(",", ".")) || value;
    const moves: Record<string, number | undefined> = {
      ArrowUp: base + step,
      ArrowDown: base - step,
      PageUp: base + largeStep,
      PageDown: base - largeStep,
      Home: Number.isFinite(min) ? min : undefined,
      End: Number.isFinite(max) ? max : undefined,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      setDraft(null);
      commit(next);
    } else if (event.key === "Enter") {
      commitDraft();
    }
  };

  return (
    <>
      <input
        data-slot="number-stepper-input"
        id={context.inputId}
        role="spinbutton"
        type="text"
        inputMode={decimals(step) > 0 ? "decimal" : "numeric"}
        autoComplete="off"
        aria-valuenow={value}
        aria-valuemin={Number.isFinite(min) ? min : undefined}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        aria-valuetext={context.valueText?.(value)}
        disabled={context.disabled}
        readOnly={context.readOnly}
        value={draft ?? context.format(value)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          commitDraft();
          onBlur?.(event);
        }}
        className={cn("w-12 min-w-0 flex-1 bg-transparent px-1 text-center tabular-nums outline-none disabled:pointer-events-none", className)}
        {...context.labelProps}
        {...props}
      />
      {context.name ? <input type="hidden" name={context.name} value={value} disabled={context.disabled} /> : null}
    </>
  );
}

/** How long a button is held before it starts repeating, and how fast it repeats, in milliseconds. */
const HOLD_DELAY = 400;
const HOLD_EVERY = 80;

type StepButtonProps = ComponentProps<"button"> & { direction: -1 | 1 };

function StepButton({ direction, className, children, onPointerDown, onClick, ...props }: StepButtonProps) {
  const context = useStepper(direction === 1 ? "NumberStepperIncrement" : "NumberStepperDecrement");
  const { value, step, min, max, commit } = context;
  const atLimit = direction === 1 ? value >= max : value <= min;
  const blocked = context.disabled || context.readOnly || atLimit;

  // While the button is held the value keeps changing, so the repeat reads the latest one.
  const latest = useRef({ value, commit });
  useEffect(() => {
    latest.current = { value, commit };
  });
  const timers = useRef<{ delay?: number; repeat?: number }>({});
  const stop = (): void => {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.repeat);
    timers.current = {};
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (blocked) stop();
  }, [blocked]);

  const stepOnce = (): void => latest.current.commit(latest.current.value + direction * step);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>): void => {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0 || blocked) return;
    stepOnce();
    stop();
    timers.current.delay = window.setTimeout(() => {
      timers.current.repeat = window.setInterval(stepOnce, HOLD_EVERY);
    }, HOLD_DELAY);
  };

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-controls={context.inputId}
      disabled={blocked}
      onPointerDown={handlePointerDown}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={(event) => {
        onClick?.(event);
        // A pointer press has already stepped on the way down. This is the click of a keyboard or a screen reader.
        if (!event.defaultPrevented && event.detail === 0) stepOnce();
      }}
      className={cn(
        "inline-flex aspect-square h-full shrink-0 touch-manipulation items-center justify-center text-muted-foreground transition-[background-color,color,opacity] duration-instant ease-out select-none first:rounded-s-control last:rounded-e-control hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export type NumberStepperButtonProps = Omit<ComponentProps<"button">, "type">;

/** Takes one step away. Hold it to keep going. Its name ("Decrease") is an `aria-label`: translate it with the interface. */
export function NumberStepperDecrement({ children, "aria-label": ariaLabel = "Decrease", ...props }: NumberStepperButtonProps) {
  return (
    <StepButton data-slot="number-stepper-decrement" direction={-1} aria-label={ariaLabel} {...props}>
      {children ?? <Minus aria-hidden="true" strokeWidth={1.5} />}
    </StepButton>
  );
}

/** Adds one step. Hold it to keep going. Its name ("Increase") is an `aria-label`: translate it with the interface. */
export function NumberStepperIncrement({ children, "aria-label": ariaLabel = "Increase", ...props }: NumberStepperButtonProps) {
  return (
    <StepButton data-slot="number-stepper-increment" direction={1} aria-label={ariaLabel} {...props}>
      {children ?? <Plus aria-hidden="true" strokeWidth={1.5} />}
    </StepButton>
  );
}
