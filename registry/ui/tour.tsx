"use client";
/**
 * @name tour
 * @category ui
 * @description A guided walk through an interface: a card beside each element in turn, with the element ringed, its step number ("2 of 5"), Back, Next and Skip, focus moved into the card, the element scrolled into view, and Escape to end at any point.
 * @when Showing a new or changed interface once, on request or the first time: where things are, a new feature. Keep it to a few steps and let people leave at once; never block the page. For one hint use tooltip or popover; for a task done in steps use wizard.
 * @example
 * <Tour
 *   open={touring}
 *   onOpenChange={setTouring}
 *   steps={[
 *     { target: "#search", title: "Search", body: "Find any file by its name or its words." },
 *     { target: "#share", title: "Share", body: "Send a link to the people you work with." },
 *   ]}
 * />
 */
import { X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { buttonVariants } from "@/components/ui/button";

export type TourStep = {
  /** A CSS selector for the element the step is about: "#search", "[data-tour=share]". */
  target: string;
  title: string;
  body: ReactNode;
};

export type TourLabels = { back: string; next: string; done: string; skip: string; close: string; progress: (step: number, count: number) => string };

const LABELS: TourLabels = { back: "Back", next: "Next", done: "Done", skip: "Skip the tour", close: "End the tour", progress: (step, count) => `${step} of ${count}` };

export type TourProps = Omit<ComponentProps<"div">, "children"> & {
  steps: readonly TourStep[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The step shown, from 0. Controlled with `onStepChange`. */
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /** Called when the last step's button is pressed (not when the tour is skipped). */
  onComplete?: () => void;
  labels?: Partial<TourLabels>;
};

type Box = { top: number; left: number; width: number; height: number };

export function Tour({ steps, open: openProp, defaultOpen = false, onOpenChange, step: stepProp, defaultStep = 0, onStepChange, onComplete, labels: given, className, ...props }: TourProps) {
  const labels = { ...LABELS, ...given };
  const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [index, setIndex] = useControllableState<number>({ value: stepProp, defaultValue: defaultStep, onChange: onStepChange });
  const [box, setBox] = useState<Box | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();
  const current = steps[Math.max(0, Math.min(steps.length - 1, index))];

  // Follow the target as the page scrolls and resizes; measured in a frame, never during render.
  useLayoutEffect(() => {
    if (!open || !current) return;
    let frame = 0;
    const measure = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = document.querySelector(current.target);
        const rect = element?.getBoundingClientRect();
        setBox(rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null);
      });
    };
    document.querySelector(current.target)?.scrollIntoView({ block: "center", behavior: "instant" });
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, current]);

  // Focus goes into the card at each step, and back to where it was when the tour ends.
  useEffect(() => {
    if (!open) return;
    opener.current ??= document.activeElement;
    card.current?.focus();
  }, [open, index]);
  const end = (): void => {
    setOpen(false);
    const back = opener.current as HTMLElement | null;
    opener.current = null;
    requestAnimationFrame(() => back?.focus?.());
  };

  if (!open || !current || typeof document === "undefined") return null;
  const last = index >= steps.length - 1;
  const gap = 12;
  const width = Math.min(320, window.innerWidth - 16);
  // Below the target when there is room, else above; kept inside the window.
  const below = !box || box.top + box.height + 200 < window.innerHeight;
  const top = box ? (below ? box.top + box.height + gap : Math.max(8, box.top - gap)) : window.innerHeight / 2;
  const left = box ? Math.max(8, Math.min(window.innerWidth - width - 8, box.left + box.width / 2 - width / 2)) : (window.innerWidth - width) / 2;

  return createPortal(
    <>
      {box ? (
        <div
          data-slot="tour-ring"
          aria-hidden="true"
          className="pointer-events-none fixed z-[60] rounded-surface outline-2 outline-offset-4 outline-ring"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        />
      ) : null}
      <div
        ref={card}
        data-slot="tour"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            end();
          }
        }}
        className={cn("fixed z-[61] flex flex-col gap-3 rounded-surface border bg-popover p-4 text-sm text-popover-foreground outline-none animate-in fade-in-0 motion-reduce:animate-none", className)}
        style={{ top, left, width, transform: below ? undefined : "translateY(-100%)" }}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs tabular-nums text-muted-foreground">{labels.progress(index + 1, steps.length)}</span>
            <h2 id={titleId} className="text-base font-medium">
              {current.title}
            </h2>
          </div>
          <button type="button" aria-label={labels.close} onClick={end} className="-me-2 -mt-2 flex size-9 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-accent">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="text-muted-foreground">{current.body}</div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!last ? (
            <button type="button" onClick={end} className={buttonVariants({ variant: "link", size: "sm" })}>
              {labels.skip}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {index > 0 ? (
              <button type="button" onClick={() => setIndex(index - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                {labels.back}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (last) {
                  onComplete?.();
                  end();
                } else setIndex(index + 1);
              }}
              className={buttonVariants({ size: "sm" })}
            >
              {last ? labels.done : labels.next}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
