"use client";
/**
 * @name consent
 * @category ui
 * @description Asks permission before something is switched on or shared: what is asked for, item by item, each optional one with its own switch that starts off, and two equal buttons to allow or decline. As a sheet (ConsentSheet) or in the page (ConsentPanel).
 * @when Before sharing a person's data with another party, connecting an account, turning on an assistant or a feature that reads their content, or using a device permission. One consent per purpose, in plain words, at the moment it is needed. Nothing is pre-ticked and declining is as easy as allowing. For a yes or no about an action the person just started (delete, leave) use dialog; for a cookie notice use the same parts in a ConsentPanel.
 * @example
 * <ConsentSheet side="bottom" defaultValue={[]} onAccept={(granted) => connect(granted)} onDecline={skip} onDismiss={skip}>
 *   <ConsentTrigger asChild><Button>Connect calendar</Button></ConsentTrigger>
 *   <ConsentContent>
 *     <ConsentHeader>
 *       <ConsentTitle>Let the planner see your calendar?</ConsentTitle>
 *       <ConsentDescription>It is used to avoid times when you are busy. You can stop this in Settings at any time.</ConsentDescription>
 *     </ConsentHeader>
 *     <ConsentScopes>
 *       <ConsentScope value="busy" title="Busy times" description="When you are busy, without what the events are." required requiredLabel="Always needed" />
 *       <ConsentScope value="titles" title="Event names" description="So that suggestions can mention what you have planned." />
 *     </ConsentScopes>
 *     <ConsentDetails summary="How this is stored">Kept for 30 days, never sold, deleted when you disconnect.</ConsentDetails>
 *     <ConsentFooter>
 *       <ConsentDecline>Do not allow</ConsentDecline>
 *       <ConsentAccept>Allow</ConsentAccept>
 *     </ConsentFooter>
 *   </ConsentContent>
 * </ConsentSheet>
 */
import { Collapsible } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { createContext, use, useId, type ComponentProps, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger, type SheetContentProps, type SheetSide } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

type ConsentContextValue = {
  /** The optional scopes that are switched on. */
  granted: string[];
  setGranted: (next: string[]) => void;
  /** True inside ConsentSheet: the title and description are the dialog's, and deciding closes it. */
  sheet: boolean;
  side: SheetSide;
  accept: () => void;
  decline: () => void;
  dismiss: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function useConsent(part: string): ConsentContextValue {
  const context = use(ConsentContext);
  if (!context) throw new Error(`<${part}> must be used inside <ConsentSheet> or <ConsentPanel>.`);
  return context;
}

type ConsentState = {
  /** The optional scopes that are switched on (controlled). */
  value?: string[];
  /** The optional scopes switched on to begin with. Leave it empty: consent that is ticked in advance is not consent. */
  defaultValue?: string[];
  onValueChange?: (granted: string[]) => void;
  /** The person allowed it. `granted` lists the optional scopes they switched on; required scopes are implied. */
  onAccept?: (granted: string[]) => void;
  /** The person declined. Nothing is granted, required scopes included. */
  onDecline?: () => void;
  /** The person left without deciding (Escape, the close button, "not now"). Nothing is granted and nothing is refused: it may be asked again. */
  onDismiss?: () => void;
};

export type ConsentSheetProps = ConsentState & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The edge it comes from. "bottom" (default) suits phones; "end" suits wide screens. The project chooses, for example by a media query. */
  side?: SheetSide;
  children?: ReactNode;
};

/**
 * The consent as a modal sheet: focus is held inside it and returns to what opened it. Allowing or declining
 * closes it; closing it any other way is neither (`onDismiss`).
 */
export function ConsentSheet({ open, defaultOpen = false, onOpenChange, side = "bottom", value, defaultValue = [], onValueChange, onAccept, onDecline, onDismiss, children }: ConsentSheetProps) {
  const [isOpen, setOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const [granted, setGranted] = useControllableState({ value, defaultValue, onChange: onValueChange });
  return (
    <ConsentContext
      value={{
        granted,
        setGranted,
        sheet: true,
        side,
        accept: () => {
          onAccept?.(granted);
          setOpen(false);
        },
        decline: () => {
          onDecline?.();
          setOpen(false);
        },
        dismiss: () => {
          onDismiss?.();
          setOpen(false);
        },
      }}
    >
      <Sheet
        open={isOpen}
        onOpenChange={(next) => {
          // Radix closes it only for Escape, the veil and the close button: none of them is a decision.
          if (!next) onDismiss?.();
          setOpen(next);
        }}
      >
        {children}
      </Sheet>
    </ConsentContext>
  );
}

/** The control that opens a ConsentSheet. Focus returns to it. */
export function ConsentTrigger(props: ComponentProps<typeof SheetTrigger>) {
  return <SheetTrigger data-slot="consent-trigger" {...props} />;
}

/** The sheet's panel. It takes the side set on ConsentSheet. */
export function ConsentContent({ className, side, ...props }: SheetContentProps) {
  const context = useConsent("ConsentContent");
  const from = side ?? context.side;
  return (
    <SheetContent
      data-slot="consent-content"
      side={from}
      className={cn((from === "bottom" || from === "top") && "mx-auto w-full max-w-xl sm:rounded-t-surface sm:border-x", className)}
      {...props}
    />
  );
}

export type ConsentPanelProps = Omit<ComponentProps<"section">, "defaultValue"> & ConsentState;

/** The consent in the page, not over it: in a settings screen, a set-up step, a conversation. Name it with `aria-labelledby` pointing at its ConsentTitle, or `aria-label`. */
export function ConsentPanel({ className, value, defaultValue = [], onValueChange, onAccept, onDecline, onDismiss, children, ...props }: ConsentPanelProps) {
  const [granted, setGranted] = useControllableState({ value, defaultValue, onChange: onValueChange });
  return (
    <ConsentContext
      value={{
        granted,
        setGranted,
        sheet: false,
        side: "bottom",
        accept: () => onAccept?.(granted),
        decline: () => onDecline?.(),
        dismiss: () => onDismiss?.(),
      }}
    >
      <section data-slot="consent-panel" className={cn("flex w-full min-w-0 flex-col rounded-surface border bg-card text-card-foreground", className)} {...props}>
        {children}
      </section>
    </ConsentContext>
  );
}

/** Leaves room at the end for the sheet's close button. */
export function ConsentHeader({ className, ...props }: ComponentProps<"div">) {
  const { sheet } = useConsent("ConsentHeader");
  return <div data-slot="consent-header" className={cn("flex flex-col gap-1.5 p-5 text-start", sheet && "pe-14", className)} {...props} />;
}

/** The question, as a question: "Let the planner see your calendar?". In a sheet it names the dialog. */
export function ConsentTitle({ className, ...props }: ComponentProps<"h2">) {
  const { sheet } = useConsent("ConsentTitle");
  const look = cn("text-base leading-tight font-medium", className);
  return sheet ? <SheetTitle data-slot="consent-title" className={look} {...props} /> : <h2 data-slot="consent-title" className={look} {...props} />;
}

/** Who gets what, what for, and how to stop it, in a sentence or two. In a sheet it describes the dialog. */
export function ConsentDescription({ className, ...props }: ComponentProps<"p">) {
  const { sheet } = useConsent("ConsentDescription");
  const look = cn("text-sm text-muted-foreground", className);
  return sheet ? <SheetDescription data-slot="consent-description" className={look} {...props} /> : <p data-slot="consent-description" className={look} {...props} />;
}

/** The list of what is asked for. */
export function ConsentScopes({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="consent-scopes" className={cn("mx-5 flex flex-col divide-y divide-border border-y", className)} {...props} />;
}

export type ConsentScopeProps = Omit<ComponentProps<"li">, "title"> & {
  /** The scope's identifier, as it appears in `value` and in `onAccept`. */
  value: string;
  /** What is asked for, in two or three words. */
  title: ReactNode;
  /** What is shared and why, plainly. */
  description?: ReactNode;
  /** The consent cannot be given without this one: it has no switch, and shows `requiredLabel` instead. */
  required?: boolean;
  /** The words for a required scope ("Always needed"). Translate them with the interface. */
  requiredLabel?: ReactNode;
  disabled?: boolean;
};

/**
 * One thing being asked for. An optional scope has a switch, off unless the person turns it on; its title
 * is the switch's label, so pressing the words works too. A required scope says so in words.
 */
export function ConsentScope({ value, title, description, required = false, requiredLabel = "Required", disabled = false, className, children, ...props }: ConsentScopeProps) {
  const { granted, setGranted } = useConsent("ConsentScope");
  const id = useId();
  const on = granted.includes(value);
  return (
    <li data-slot="consent-scope" data-required={required ? "" : undefined} data-state={required || on ? "on" : "off"} className={cn("flex min-w-0 items-start gap-4 py-3.5", className)} {...props}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {required ? (
          <span id={`${id}-title`} className="text-sm font-medium">
            {title}
          </span>
        ) : (
          <label id={`${id}-title`} htmlFor={`${id}-switch`} className="text-sm font-medium">
            {title}
          </label>
        )}
        {description ? (
          <span id={`${id}-description`} className="text-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
        {children}
      </div>
      {required ? (
        <span data-slot="consent-scope-required" className="mt-0.5 shrink-0 text-xs font-medium text-muted-foreground">
          {requiredLabel}
        </span>
      ) : (
        <Switch
          id={`${id}-switch`}
          className="mt-0.5"
          checked={on}
          disabled={disabled}
          aria-describedby={description ? `${id}-description` : undefined}
          onCheckedChange={(checked) => setGranted(checked ? [...granted.filter((scope) => scope !== value), value] : granted.filter((scope) => scope !== value))}
        />
      )}
    </li>
  );
}

export type ConsentDetailsProps = Omit<ComponentProps<typeof Collapsible.Root>, "title"> & {
  /** The words of the button that shows the longer text ("How this is stored"). */
  summary: ReactNode;
};

/** The longer text (retention, the other party's terms, legal wording), closed until asked for. */
export function ConsentDetails({ summary, className, children, ...props }: ConsentDetailsProps) {
  return (
    <Collapsible.Root data-slot="consent-details" className={cn("group/details mx-5 min-w-0 text-sm", className)} {...props}>
      <Collapsible.Trigger className="flex min-h-10 w-full items-center justify-between gap-3 rounded-control py-2 text-start font-medium text-foreground underline-offset-4 hover:underline">
        {summary}
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-base ease-out group-data-[state=open]/details:rotate-180 motion-reduce:transition-none"
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="pb-3 text-muted-foreground">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}

/**
 * Holds ConsentDecline and ConsentAccept side by side at equal width, and an optional ConsentNotNow under
 * them. Decline comes first in reading order; neither is styled as the easy way out.
 */
export function ConsentFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="consent-footer" className={cn("mt-auto grid grid-cols-2 gap-2 p-5", className)} {...props} />;
}

type ConsentButtonProps = Omit<ButtonProps, "asChild">;

/** Allows what is asked for, with the optional scopes as they are switched. Same look and size as ConsentDecline by default. */
export function ConsentAccept({ onClick, variant = "outline", className, ...props }: ConsentButtonProps) {
  const { accept } = useConsent("ConsentAccept");
  return (
    <Button
      data-slot="consent-accept"
      variant={variant}
      className={cn("h-auto min-h-(--control-h) w-full min-w-0 py-2 whitespace-normal", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) accept();
      }}
      {...props}
    />
  );
}

/** Declines all of it. Same look and size as ConsentAccept by default: do not make it fainter. */
export function ConsentDecline({ onClick, variant = "outline", className, ...props }: ConsentButtonProps) {
  const { decline } = useConsent("ConsentDecline");
  return (
    <Button
      data-slot="consent-decline"
      variant={variant}
      className={cn("h-auto min-h-(--control-h) w-full min-w-0 py-2 whitespace-normal", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) decline();
      }}
      {...props}
    />
  );
}

/** Puts the question off without answering it (`onDismiss`). Spans the footer under the two decisions. */
export function ConsentNotNow({ onClick, variant = "ghost", className, ...props }: ConsentButtonProps) {
  const { dismiss } = useConsent("ConsentNotNow");
  return (
    <Button
      data-slot="consent-not-now"
      variant={variant}
      className={cn("col-span-2 w-full", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) dismiss();
      }}
      {...props}
    />
  );
}
