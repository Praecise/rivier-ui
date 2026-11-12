"use client";
/**
 * @name price-breakdown
 * @category ui
 * @description What a price is made of, line by line, and the total: labels at the start, amounts in aligned figures at the end.
 * @when A quote, a basket summary, a receipt, a booking's cost before paying. Every amount the total includes gets a line, discounts and fees too. For one figure with a label use stat; for many records in rows and columns use table.
 * @example
 * <PriceBreakdown currency="EUR" locale="en-IE" announceTotal={(total) => `Total is now ${total}`}>
 *   <PriceLine label="2 adults" note="€46 each" amount={92} />
 *   <PriceLine label="Service fee" amount={6} />
 *   <PriceLine label="Early booking" amount={-10} discount />
 *   <PriceTotal label="Total" note="Taxes included" amount={88} />
 * </PriceBreakdown>
 */
import { createContext, use, useEffect, useMemo, useRef, type ComponentProps, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";

type PriceContextValue = {
  format: (amount: number) => string;
  announceTotal: ((total: string) => string) | undefined;
};

const PriceContext = createContext<PriceContextValue | null>(null);

function usePrice(part: string): PriceContextValue {
  const context = use(PriceContext);
  if (!context) throw new Error(`<${part}> must be used inside <PriceBreakdown>.`);
  return context;
}

export type PriceBreakdownProps = ComponentProps<"dl"> & {
  /** The currency of every amount, as an ISO 4217 code ("EUR"). Used with `locale` unless `formatAmount` is given. */
  currency?: string;
  /** The locale the amounts are written in ("en-IE", "de-DE"). Default: the runtime's. */
  locale?: string;
  /** Formats an amount yourself: minor units, a currency per line, "Free" for zero. */
  formatAmount?: (amount: number) => string;
  /**
   * When given, a change of the total is said to screen-reader users in full, with the sentence this
   * returns ("Total is now €88.00"). It is not said when the breakdown first appears.
   */
  announceTotal?: (total: string) => string;
};

/** A description list: each line is a term (the label) and its amount, so the pair is read together. */
export function PriceBreakdown({ className, currency, locale, formatAmount, announceTotal, children, ...props }: PriceBreakdownProps) {
  const formatter = useMemo(() => new Intl.NumberFormat(locale, currency ? { style: "currency", currency } : { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale, currency]);
  const format = formatAmount ?? ((amount: number): string => formatter.format(amount));
  return (
    <PriceContext value={{ format, announceTotal }}>
      <dl data-slot="price-breakdown" className={cn("flex w-full min-w-0 flex-col gap-2.5 text-sm", className)} {...props}>
        {children}
      </dl>
    </PriceContext>
  );
}

export type PriceLineProps = Omit<ComponentProps<"div">, "children"> & {
  /** What the amount is for. */
  label: ReactNode;
  /** A second line under the label: how it was worked out, a date, a condition. */
  note?: ReactNode;
  /** The amount as a number, formatted by the breakdown. A discount is negative. */
  amount?: number;
  /** A reduction: the amount is marked as one. Its minus sign (from a negative `amount`) says so without colour. */
  discount?: boolean;
  /** Shown in place of the formatted amount: "Free", "Included", a struck-through former price. */
  children?: ReactNode;
};

export function PriceLine({ label, note, amount, discount = false, className, children, ...props }: PriceLineProps) {
  const { format } = usePrice("PriceLine");
  return (
    <div data-slot="price-line" data-discount={discount ? "" : undefined} className={cn("flex min-w-0 items-baseline justify-between gap-4", className)} {...props}>
      <dt className="min-w-0 text-foreground">
        <span className="block break-words">{label}</span>
        {note ? <span className="block text-xs text-muted-foreground">{note}</span> : null}
      </dt>
      <dd data-slot="price-amount" className={cn("shrink-0 text-end whitespace-nowrap tabular-nums", discount && "font-medium text-success")}>
        {children ?? (amount === undefined ? null : format(amount))}
      </dd>
    </div>
  );
}

export type PriceTotalProps = PriceLineProps;

/** The total: told apart by a rule above it and its weight. Its amount is what `announceTotal` reads out when it changes. */
export function PriceTotal({ label, note, amount, className, children, ...props }: PriceTotalProps) {
  const { format, announceTotal } = usePrice("PriceTotal");
  const text = amount === undefined ? null : format(amount);
  const previous = useRef(text);
  const say = useRef(announceTotal);
  useEffect(() => {
    say.current = announceTotal;
  });
  useEffect(() => {
    if (previous.current === text) return;
    previous.current = text;
    if (text !== null && say.current) announce(say.current(text));
  }, [text]);

  return (
    <div data-slot="price-total" className={cn("mt-1 flex min-w-0 items-baseline justify-between gap-4 border-t border-border-strong pt-3 text-base font-medium", className)} {...props}>
      <dt className="min-w-0 text-foreground">
        <span className="block break-words">{label}</span>
        {note ? <span className="block text-xs font-normal text-muted-foreground">{note}</span> : null}
      </dt>
      <dd data-slot="price-amount" className="shrink-0 text-end whitespace-nowrap tabular-nums">
        {children ?? text}
      </dd>
    </div>
  );
}
