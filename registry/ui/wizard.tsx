"use client";
/**
 * @name wizard
 * @category ui
 * @description The shell of a guided task done one step at a time inside a card: a title with "Step 2 of 5", a rail of the steps, the current step, and Back, Skip and a main button named after what the step does.
 * @when A task that is easier one question at a time and has a known order: a booking, a set-up, an application. It keeps where one is (controlled or not), moves focus to each new step's heading, and blocks the main button with a stated reason while a step is not answered. Where a server decides what comes next, control it: give `step`, and `onNext`, `onBack` and `onSkip` in place of the wizard's own moves, with `pending` while the answer is on its way; the step still slides in and its heading still takes focus when `step` changes. For a short form show all the fields at once (field); for the rail alone use steps; for unordered sections use tabs or accordion. What each step contains is yours: the wizard holds no answers.
 * @example
 * const [people, setPeople] = useState(0);
 * <Wizard
 *   steps={[
 *     { id: "dates", label: "Dates" },
 *     { id: "people", label: "People", canContinue: people > 0, blockedReason: "Say how many people are coming." },
 *     { id: "extras", label: "Extras", optional: true },
 *     { id: "review", label: "Review" },
 *   ]}
 *   defaultStep="dates"
 *   onComplete={book}
 * >
 *   <WizardHeader>Book a table</WizardHeader>
 *   <WizardRail />
 *   <WizardStep id="dates" title="Which day?">…</WizardStep>
 *   <WizardStep id="people" title="How many people?">…</WizardStep>
 *   <WizardStep id="extras" title="Anything to add?">…</WizardStep>
 *   <WizardStep id="review" title="Check and confirm">…</WizardStep>
 *   <WizardFooter>
 *     <WizardBack>Back</WizardBack>
 *     <WizardSkip>Skip</WizardSkip>
 *     <WizardNext>{step === "review" ? "Confirm" : "Continue"}</WizardNext>
 *   </WizardFooter>
 * </Wizard>
 *
 * // Driven from outside: the server says which step is next, and the rail's states are the project's
 * <Wizard
 *   steps={flow.steps.map((item) => ({ id: item.id, label: item.label, optional: item.optional, state: item.skipped ? "skipped" : undefined }))}
 *   step={flow.current}
 *   pending={saving}
 *   onNext={(current) => submit(current.id)}
 *   onBack={(current) => goBackFrom(current.id)}
 *   onSkip={(current) => skip(current.id)}
 * >…</Wizard>
 */
import { createContext, use, useEffect, useId, useRef, useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Step, Steps, StepsCount, type StepState, type StepsProps } from "@/components/ui/steps";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

export type WizardStepInfo = {
  /** Identifies the step: the `id` of its WizardStep. */
  id: string;
  /** The step's short name, for the rail. */
  label: string;
  /** The step may be skipped: WizardSkip shows on it. */
  optional?: boolean;
  /** False while the step is not answered well enough to go on. Default true. */
  canContinue?: boolean;
  /** Why it cannot go on yet, in words the person can act on. Shown by the footer and read out. */
  blockedReason?: string;
  /** Overrides the state the rail works out: "assumed" for a step filled in for the person, "blocked" for one that cannot be done. */
  state?: StepState;
  /** Said with the state: what was assumed, or what is in the way. */
  note?: string;
};

type WizardContextValue = {
  steps: WizardStepInfo[];
  step: string;
  index: number;
  total: number;
  current: WizardStepInfo | undefined;
  isFirst: boolean;
  isLast: boolean;
  canContinue: boolean;
  /** The steps the person skipped. */
  skipped: ReadonlySet<string>;
  /** +1 after going forward, -1 after going back, 0 before the step has changed. */
  travel: -1 | 0 | 1;
  /** The move is being worked out elsewhere (`pending`): the buttons wait. */
  pending: boolean;
  /** Whether Back has somewhere to go: not on the first step, unless the project handles Back itself. */
  canGoBack: boolean;
  titleId: string;
  reasonId: string;
  countLabel: (current: number, total: number) => string;
  /** True once after the step changes: the step that mounts next asks, and takes focus. */
  takeFocus: () => boolean;
  goTo: (id: string) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

/** The wizard's state and moves, for a step's own controls ("Edit" on a review step, a choice that goes on by itself). */
export function useWizard(): WizardContextValue {
  const context = use(WizardContext);
  if (!context) throw new Error("Wizard parts must be used inside <Wizard>.");
  return context;
}

export type WizardProps = Omit<ComponentProps<"div">, "onChange"> & {
  /** The steps, in order. Pass a new array as answers change: `canContinue` and `blockedReason` are read from it. */
  steps: WizardStepInfo[];
  /**
   * The current step's id, controlled. Whenever it changes, by the wizard's own buttons or because the
   * project set it (a server answered), the new step arrives from the side it lies on in `steps` and its
   * heading takes focus.
   */
  step?: string;
  /** The step to start on when uncontrolled. Default: the first. */
  defaultStep?: string;
  /** Called with the step the wizard's own buttons and rail ask for. */
  onStepChange?: (step: string) => void;
  /** Called when the main button is pressed on the last step. */
  onComplete?: () => void;
  /**
   * Takes over the main button. Given this, a press (on a step that can go on) calls it with the current
   * step and the wizard does not move, nor call `onComplete`: set `step` when it is known what comes next.
   */
  onNext?: (current: WizardStepInfo) => void;
  /** Takes over Back in the same way. With it, Back is available on the first step too (the project may have somewhere to go). */
  onBack?: (current: WizardStepInfo) => void;
  /** Takes over Skip in the same way. The wizard then does not mark the step skipped: say so with the step's `state`. */
  onSkip?: (current: WizardStepInfo) => void;
  /** A move is being worked out (a request is on its way): the buttons and the rail wait, the main button shows it is busy, and the card is `aria-busy`. */
  pending?: boolean;
  /** "Step 2 of 5". Translate it with the interface. */
  countLabel?: (current: number, total: number) => string;
};

/**
 * A card that is a named group (by its WizardHeader). Only the current step is in the page. Moving follows
 * the person's act (a button), and then focus goes to the new step's heading, which is read out with its
 * count: nothing else needs announcing. That holds however the step changes: by the wizard's own buttons,
 * or by the project setting `step` after a server has answered.
 */
export function Wizard({
  className,
  steps,
  step,
  defaultStep,
  onStepChange,
  onComplete,
  onNext,
  onBack,
  onSkip,
  pending = false,
  countLabel = (now, all) => `Step ${now} of ${all}`,
  children,
  ...props
}: WizardProps) {
  const [currentId, setCurrentId] = useControllableState({ value: step, defaultValue: defaultStep ?? steps[0]?.id ?? "", onChange: onStepChange });
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  /** The step last seen, the way it was reached, and how many times the step has changed. */
  const [arrival, setArrival] = useState<{ id: string; travel: -1 | 0 | 1; count: number }>({ id: currentId, travel: 0, count: 0 });
  /** The change of step whose heading has already taken focus. */
  const focused = useRef(0);
  const titleId = useId();
  const reasonId = useId();

  // The step changed, whoever changed it: work out which way it lies, during this render, so the new step
  // mounts already knowing where it came from.
  if (arrival.id !== currentId) {
    const from = steps.findIndex((item) => item.id === arrival.id);
    const to = steps.findIndex((item) => item.id === currentId);
    setArrival({ id: currentId, travel: from !== -1 && to < from ? -1 : 1, count: arrival.count + 1 });
  }
  const travel = arrival.id === currentId ? arrival.travel : 0;

  const index = Math.max(
    0,
    steps.findIndex((item) => item.id === currentId),
  );
  const current = steps[index];
  const canContinue = current?.canContinue !== false;

  const move = (to: number, markSkipped?: boolean): void => {
    const target = steps[to];
    if (!target || !current || to === index) return;
    setSkipped((before) => {
      const after = new Set(before);
      if (markSkipped) after.add(current.id);
      else if (to > index) after.delete(current.id);
      return after;
    });
    setCurrentId(target.id);
  };
  const atLast = index === steps.length - 1;

  const value: WizardContextValue = {
    steps,
    step: current?.id ?? "",
    index,
    total: steps.length,
    current,
    isFirst: index === 0,
    isLast: index === steps.length - 1,
    canContinue,
    skipped,
    travel,
    pending,
    canGoBack: onBack !== undefined || index > 0,
    titleId,
    reasonId,
    countLabel,
    takeFocus: () => {
      const due = focused.current !== arrival.count;
      focused.current = arrival.count;
      return due;
    },
    goTo: (id) => {
      if (!pending) move(steps.findIndex((item) => item.id === id));
    },
    next: () => {
      if (pending || !current) return;
      if (!canContinue) {
        if (current.blockedReason) announce(current.blockedReason, "assertive");
        return;
      }
      if (onNext) onNext(current);
      else if (atLast) onComplete?.();
      else move(index + 1);
    },
    back: () => {
      if (pending || !current) return;
      if (onBack) onBack(current);
      else move(index - 1);
    },
    skip: () => {
      if (pending || !current?.optional) return;
      if (onSkip) onSkip(current);
      else if (atLast) onComplete?.();
      else move(index + 1, true);
    },
  };

  return (
    <WizardContext value={value}>
      <div data-slot="wizard" role="group" aria-labelledby={titleId} aria-busy={pending || undefined} data-pending={pending ? "" : undefined} className={cn("flex w-full min-w-0 flex-col rounded-surface border bg-card text-card-foreground", className)} {...props}>
        {children}
      </div>
    </WizardContext>
  );
}

export type WizardHeaderProps = ComponentProps<"div">;

/** The task's name as a small heading line, with the count at the end. Its children name the whole wizard. */
export function WizardHeader({ className, children, ...props }: WizardHeaderProps) {
  const { titleId, index, total, countLabel } = useWizard();
  return (
    <div data-slot="wizard-header" className={cn("flex items-baseline justify-between gap-3 px-5 pt-5", className)} {...props}>
      <p id={titleId} data-slot="wizard-title" className="min-w-0 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {children}
      </p>
      <StepsCount current={index + 1} total={total} label={countLabel} className="shrink-0" />
    </div>
  );
}

export type WizardRailProps = Omit<StepsProps, "children"> & {
  /** Lets the person go back to a step already passed by pressing it on the rail. Default false. */
  navigable?: boolean;
};

/** The rail: one mark per real step, in the state the wizard works out (done, current, not started, skipped) or the step states itself. */
export function WizardRail({ className, navigable = false, "aria-label": ariaLabel = "Steps", ...props }: WizardRailProps) {
  const { steps, index, skipped, goTo, pending } = useWizard();
  return (
    <Steps data-slot="wizard-rail" aria-label={ariaLabel} className={cn("px-5 pt-3", className)} {...props}>
      {steps.map((item, position) => {
        const state: StepState = position === index ? "current" : (item.state ?? (skipped.has(item.id) ? "skipped" : position < index ? "done" : "upcoming"));
        return (
          <Step key={item.id} state={state} note={item.note} onClick={navigable && !pending && position < index ? () => goTo(item.id) : undefined}>
            {item.label}
          </Step>
        );
      })}
    </Steps>
  );
}

export type WizardStepProps = Omit<ComponentProps<"section">, "title" | "id"> & {
  /** The id of this step in the wizard's `steps`. */
  id: string;
  /** The step's heading: the question it asks. */
  title: ReactNode;
  /** The heading's level in the page. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5;
};

/**
 * One step's content. It is rendered only while it is the current step. When the person arrives, its
 * heading takes focus (it is not in the Tab order) and is read as "Step 3 of 5: …"; the content fades in
 * and moves 12px from the side it came from (the other side in right-to-left pages), or simply appears
 * under reduced motion. The card's height changes at once: only transform and opacity are animated.
 */
export function WizardStep({ className, id, title, headingLevel = 3, children, ...props }: WizardStepProps) {
  const { step, index, total, travel, countLabel, takeFocus } = useWizard();
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const active = step === id;

  useEffect(() => {
    if (active && takeFocus()) heading.current?.focus();
    // Only a change of step moves focus: takeFocus is a new function on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;
  const Heading = `h${headingLevel}` as const;
  return (
    <section
      data-slot="wizard-step"
      data-travel={travel === 0 ? undefined : travel === 1 ? "forward" : "back"}
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col gap-4 p-5 ease-out animation-duration-(--duration-base) motion-reduce:animate-none!",
        // Forward arrives from the end side, back from the start side. The sides are spelled out with rtl:
        // because the build turns tw-animate's own logical slides into a test of the page's language, not its direction.
        "data-[travel=forward]:animate-in data-[travel=forward]:fade-in-0 data-[travel=forward]:slide-in-from-right-3 rtl:data-[travel=forward]:slide-in-from-left-3",
        "data-[travel=back]:animate-in data-[travel=back]:fade-in-0 data-[travel=back]:slide-in-from-left-3 rtl:data-[travel=back]:slide-in-from-right-3",
        className,
      )}
      {...props}
    >
      <Heading ref={heading} id={headingId} tabIndex={-1} data-slot="wizard-step-title" className="rounded-control text-lg leading-tight font-medium">
        <span className="sr-only">{countLabel(index + 1, total)}: </span>
        {title}
      </Heading>
      {children}
    </section>
  );
}

export type WizardFooterProps = ComponentProps<"div">;

/** The buttons, with the reason the step cannot go on yet (when it has one) above them. Back sits at the start, the main button at the end. */
export function WizardFooter({ className, children, ...props }: WizardFooterProps) {
  const { canContinue, current, reasonId } = useWizard();
  return (
    <div data-slot="wizard-footer" className={cn("mt-auto flex flex-col gap-3 border-t p-5", className)} {...props}>
      {!canContinue && current?.blockedReason ? (
        <p id={reasonId} data-slot="wizard-reason" className="text-sm text-muted-foreground">
          {current.blockedReason}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const pressed = (event: MouseEvent<HTMLButtonElement>, handler: ButtonProps["onClick"], act: () => void): void => {
  handler?.(event);
  if (!event.defaultPrevented) act();
};

/** Goes to the step before. Disabled on the first step (unless the project handles Back itself with `onBack`), and while a move is `pending`. */
export function WizardBack({ onClick, variant = "ghost", ...props }: ButtonProps) {
  const { back, canGoBack, pending } = useWizard();
  return <Button data-slot="wizard-back" variant={variant} disabled={!canGoBack || pending} onClick={(event) => pressed(event, onClick, back)} {...props} />;
}

/** Passes over the current step and marks it skipped on the rail. Rendered only on a step that is `optional`. */
export function WizardSkip({ onClick, variant = "ghost", ...props }: ButtonProps) {
  const { skip, current, pending } = useWizard();
  if (!current?.optional) return null;
  return <Button data-slot="wizard-skip" variant={variant} disabled={pending} onClick={(event) => pressed(event, onClick, skip)} {...props} />;
}

/**
 * The main button: goes on, or completes on the last step. Its children are the step's verb ("Show what
 * fits", "Review", "Confirm"). While the step cannot go on it stays focusable and says it is unavailable
 * (`aria-disabled`) with the reason as its description; pressing it then reads the reason out instead of moving.
 * While a move is `pending` it keeps focus too, says it is busy, and a press does nothing.
 */
export function WizardNext({ onClick, className, ...props }: ButtonProps) {
  const { next, canContinue, current, reasonId, pending } = useWizard();
  return (
    <Button
      data-slot="wizard-next"
      aria-disabled={canContinue && !pending ? undefined : true}
      aria-busy={pending || undefined}
      aria-describedby={!canContinue && current?.blockedReason ? reasonId : undefined}
      className={cn("ms-auto aria-disabled:opacity-50", className)}
      onClick={(event) => pressed(event, onClick, next)}
      {...props}
    />
  );
}
