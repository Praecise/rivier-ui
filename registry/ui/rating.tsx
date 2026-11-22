"use client";
/**
 * @name rating
 * @category ui
 * @description A score of one to five (or any number) shown as stars and chosen like radio buttons: arrow keys move the score, each star named "3 of 5"; or, read-only, a score shown with its number in words.
 * @when Rating a thing on a short scale: a review, feedback after a task. For yes and no use toggle or switch; for a number on a long scale use slider; for showing an average of many ratings use the read-only form with the count beside it.
 * @example
 * <Rating aria-label="Your rating" defaultValue={4} name="rating" />
 * <Rating readOnly value={4.3} aria-label="Average rating" />
 */
import { Star } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

export type RatingProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "dir"> & {
  /** The score, 1 to `max`; 0 for none yet. In read-only form, any number (4.3). */
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** How many stars. Default 5. */
  max?: number;
  /** Shows the score; nothing to choose. */
  readOnly?: boolean;
  disabled?: boolean;
  name?: string;
  /** The name of each star, and of the read-only score: "3 of 5". */
  starLabel?: (value: string, max: string) => string;
  locale?: string;
  size?: "sm" | "md" | "lg";
};

const SIZES = { sm: "size-4", md: "size-6", lg: "size-8" } as const;

export function Rating({ "aria-label": ariaLabel, value,
  defaultValue = 0,
  onValueChange,
  max = 5,
  readOnly = false,
  disabled,
  name,
  starLabel = (v, m) => `${v} of ${m}`,
  locale = "en-US",
  size = "md",
  className,
  ...props
}: RatingProps) {
  const [score, setScore] = useControllableState<number>({ value, defaultValue, onChange: onValueChange });
  const [hover, setHover] = useState<number | null>(null);
  const number = (n: number): string => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  const shown = hover ?? score;
  const star = (index: number) => {
    const fill = Math.max(0, Math.min(1, shown - index));
    return (
      <span aria-hidden="true" className={cn("relative inline-block", SIZES[size])}>
        <Star className={cn("absolute inset-0 size-full text-border-strong")} />
        {fill > 0 ? (
          <span className="absolute inset-y-0 start-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
            <Star className={cn("size-full fill-current text-chart-4", SIZES[size])} />
          </span>
        ) : null}
      </span>
    );
  };
  if (readOnly) {
    return (
      <div
        data-slot="rating"
        role="img"
        aria-label={`${ariaLabel ? `${ariaLabel}: ` : ""}${starLabel(number(score), number(max))}`}
        className={cn("inline-flex items-center gap-0.5", className)}
        {...props}
      >
        {Array.from({ length: max }, (_, i) => (
          <span key={i}>{star(i)}</span>
        ))}
      </div>
    );
  }
  return (
    <RadioGroup.Root
      data-slot="rating"
      value={score > 0 ? String(score) : ""}
      onValueChange={(next) => setScore(Number(next))}
      orientation="horizontal"
      disabled={disabled}
      name={name}
      className={cn("inline-flex items-center gap-0.5", className)}
      onPointerLeave={() => setHover(null)}
      aria-label={ariaLabel}
      {...props}
    >
      {Array.from({ length: max }, (_, i) => (
        <RadioGroup.Item
          key={i}
          value={String(i + 1)}
          aria-label={starLabel(number(i + 1), number(max))}
          onPointerEnter={() => setHover(i + 1)}
          className="flex size-10 items-center justify-center rounded-control disabled:opacity-50"
        >
          {star(i)}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
