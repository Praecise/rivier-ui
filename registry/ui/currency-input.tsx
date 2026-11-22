"use client";
/**
 * @name currency-input
 * @category ui
 * @description An amount of money typed the way the locale writes it (its decimal mark, its grouping, its symbol before or after), shown formatted when the field is left, kept as a plain number, with Up and Down to step it and a range it is held to.
 * @when Prices, budgets, transfers, any amount in a currency. Also numbers with a unit through `unit` instead of `currency` (kilograms, percent). For a small whole number with buttons use number-stepper; for a range use slider.
 * @example
 * <CurrencyInput aria-label="Budget" currency="EUR" locale="de-DE" defaultValue={1250.5} min={0} name="budget" />
 */
import { useId, useState, type ComponentProps, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { inputVariants } from "@/components/ui/input";

export type CurrencyInputProps = Omit<ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "type" | "size" | "min" | "max" | "step"> & {
  /** The amount, or null when the field is empty. */
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  /** An ISO 4217 code: "EUR", "USD", "NOK". */
  currency?: string;
  /** A unit instead of a currency: "kilogram", "percent". */
  unit?: string;
  /** BCP 47. Default "en-US". */
  locale?: string;
  min?: number;
  max?: number;
  /** What Up and Down add or take away. Default 1. Shift with them: ten times as much. */
  step?: number;
  invalid?: boolean;
};

export function CurrencyInput({
  value,
  defaultValue = null,
  onValueChange,
  currency = "USD",
  unit,
  locale = "en-US",
  min,
  max,
  step = 1,
  invalid,
  name,
  className,
  onBlur,
  onFocus,
  ...props
}: CurrencyInputProps) {
  const [amount, setAmount] = useControllableState<number | null>({ value, defaultValue, onChange: onValueChange });
  const [draft, setDraft] = useState<string | null>(null);
  const affixId = useId();
  const options: Intl.NumberFormatOptions = unit ? { style: "unit", unit } : { style: "currency", currency };
  const display = new Intl.NumberFormat(locale, options);
  const digits = display.resolvedOptions().maximumFractionDigits ?? 2;
  const plain = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  // Where the symbol or unit goes, and what it is, from the locale's own format of a sample.
  const sample = display.formatToParts(1);
  const affix = sample
    .filter((p) => p.type === "currency" || p.type === "unit" || (p.type === "percentSign" && unit === "percent"))
    .map((p) => p.value)
    .join("");
  const before = sample.findIndex((p) => p.type === "currency" || p.type === "unit") < sample.findIndex((p) => p.type === "integer");
  const clamp = (n: number): number => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const round = (n: number): number => Math.round(n * 10 ** digits) / 10 ** digits;
  const parse = (text: string): number | null => {
    const cleaned = text
      .replaceAll(group === " " || group === " " ? /[\s  ]/g : group, "")
      .replace(/\s/g, "")
      .replace(decimal, ".")
      .replace(/[^\d.-]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };
  const stepBy = (event: KeyboardEvent<HTMLInputElement>, sign: 1 | -1): void => {
    event.preventDefault();
    const base = draft === null ? (amount ?? 0) : (parse(draft) ?? 0);
    const next = clamp(round(base + sign * step * (event.shiftKey ? 10 : 1)));
    setAmount(next);
    setDraft(plain.format(next));
  };
  const shown = draft ?? (amount === null ? "" : new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount));

  return (
    <div data-slot="currency-input" className={cn("relative w-full min-w-0", className)}>
      <span id={affixId} className="sr-only">
        {unit ? unit : (new Intl.DisplayNames(locale, { type: "currency" }).of(currency) ?? currency)}
      </span>
      <span aria-hidden="true" className={cn("pointer-events-none absolute inset-y-0 flex items-center text-sm text-muted-foreground", before ? "start-3" : "end-3")}>
        {affix}
      </span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={shown}
        aria-invalid={invalid || undefined}
        aria-describedby={affixId}
        onFocus={(event) => {
          setDraft(amount === null ? "" : plain.format(amount));
          onFocus?.(event);
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          setAmount(parse(event.target.value));
        }}
        onBlur={(event) => {
          const parsed = draft === null ? amount : parse(draft);
          setAmount(parsed === null ? null : clamp(round(parsed)));
          setDraft(null);
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") stepBy(event, 1);
          else if (event.key === "ArrowDown") stepBy(event, -1);
        }}
        className={cn(inputVariants(), "text-end tabular-nums", before ? "ps-[calc(var(--spacing)*3+var(--affix,2ch))]" : "pe-[calc(var(--spacing)*3+var(--affix,2ch))]")}
        style={{ ["--affix" as string]: `${Math.max(1, affix.length) + 1}ch` }}
        {...props}
      />
      {name ? <input type="hidden" name={name} value={amount === null ? "" : String(amount)} /> : null}
    </div>
  );
}
