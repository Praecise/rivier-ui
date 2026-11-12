/**
 * @name stat
 * @category ui
 * @description A number tile: a label, a value, an optional change with its direction, and a slot for a sparkline.
 * @when A headline figure on a dashboard or in a bento cell. Pass `change` as a magnitude ("12%"): the sign and the arrow are added from `direction`. For several figures compared over time use a chart or a table.
 * @example
 * <Stat label="Revenue" value="€48,200" change="12%" direction="up" changeLabel="vs last month" />
 * <Stat label="Churn" value="2.1%" change="0.4 pts" direction="up" tone="negative" />
 * <Stat
 *   label="Uptime"
 *   value="99.98%"
 *   chart={
 *     <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
 *       <polyline points="0,18 20,14 40,16 60,8 80,10 100,4" fill="none" strokeWidth="1.5" className="stroke-chart-1" />
 *     </svg>
 *   }
 * />
 */
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatDirection = "up" | "down" | "flat";
export type StatTone = "positive" | "negative" | "neutral";

export type StatProps = ComponentProps<"div"> & {
  label: ReactNode;
  value: ReactNode;
  /** The size of the change, without a sign: "12%", "340". */
  change?: ReactNode;
  /** Which way the figure moved. Shown by an arrow and a sign (+ or −), never by colour alone. Defaults to "flat". */
  direction?: StatDirection;
  /** Whether the move is good news. Defaults to up = positive, down = negative; set it when up is bad (churn, cost). */
  tone?: StatTone;
  /** A short note after the change: "vs last month". */
  changeLabel?: ReactNode;
  /** A sparkline or other small chart, placed under the figures. */
  chart?: ReactNode;
};

const ICON: Record<StatDirection, typeof Minus> = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };
const SIGN: Record<StatDirection, string> = { up: "+", down: "−", flat: "" };
const TONE: Record<StatTone, string> = { positive: "text-success", negative: "text-destructive", neutral: "text-foreground" };

export function Stat({ className, label, value, change, direction = "flat", tone, changeLabel, chart, children, ...props }: StatProps) {
  const Icon = ICON[direction];
  const mood: StatTone = tone ?? (direction === "up" ? "positive" : direction === "down" ? "negative" : "neutral");
  return (
    <div data-slot="stat" className={cn("flex min-w-0 flex-col gap-2 rounded-surface border bg-card p-5 text-card-foreground", className)} {...props}>
      <p data-slot="stat-label" className="text-sm text-muted-foreground">
        {label}
      </p>
      <p data-slot="stat-value" className="text-3xl leading-none font-medium tracking-tight tabular-nums">
        {value}
      </p>
      {change !== undefined && change !== null ? (
        <p data-slot="stat-change" data-direction={direction} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", TONE[mood])}>
            <Icon aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
            <span>
              {SIGN[direction]}
              {change}
            </span>
          </span>
          {changeLabel ? <span className="text-muted-foreground">{changeLabel}</span> : null}
        </p>
      ) : null}
      {chart ? (
        <div data-slot="stat-chart" className="mt-auto min-w-0 pt-2">
          {chart}
        </div>
      ) : null}
      {children}
    </div>
  );
}
