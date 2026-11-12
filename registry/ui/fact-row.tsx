"use client";
/**
 * @name fact-row
 * @category ui
 * @description One thing the system knows or remembers about a person or a record, shown with where it came from and what the person can do about it: correct it in place, say it is no longer true, or have it removed.
 * @when Showing people what is held about them and letting them control it: remembered preferences, profile details filled in by an assistant, imported data, settings inferred from use. Every fact gets a source and at least one action. The words of the actions are the project's (the component names none). For plain label and value pairs nobody can change use a description list; for a form use field.
 * @example
 * <FactList aria-label="What we remember">
 *   <FactRow removed={forgotten} removedMessage="Diet was forgotten" restoredMessage="Diet was restored">
 *     <FactLabel>Diet</FactLabel>
 *     <FactValue>{diet}</FactValue>
 *     <FactSource>
 *       <SourceChip icon={<MessageSquare />}>You said this on 3 May</SourceChip>
 *     </FactSource>
 *     <FactActions aria-label="Diet">
 *       <FactEditTrigger>Edit</FactEditTrigger>
 *       <FactAction onClick={endDiet}>Not true any more</FactAction>
 *       <FactAction onClick={() => setForgotten(true)}>Forget this</FactAction>
 *     </FactActions>
 *     <FactEditor aria-label="Diet" defaultValue={diet} onSave={setDiet} savedMessage="Diet was changed" />
 *     <FactRemoved>
 *       Diet was forgotten. <FactUndo onClick={() => setForgotten(false)}>Undo</FactUndo>
 *     </FactRemoved>
 *   </FactRow>
 * </FactList>
 */
import { Slot } from "radix-ui";
import { createContext, use, useEffect, useRef, useState, type ComponentProps, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { inputVariants } from "@/components/ui/input";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

type FactContextValue = {
  editing: boolean;
  setEditing: (editing: boolean) => void;
  removed: boolean;
  /** Called as the editor closes, so that the Edit button takes focus back as it returns. */
  askForFocus: () => void;
  /** True once after askForFocus: the Edit button calls it as it mounts. */
  takeFocus: () => boolean;
};

const FactContext = createContext<FactContextValue | null>(null);

function useFact(part: string): FactContextValue {
  const context = use(FactContext);
  if (!context) throw new Error(`<${part}> must be used inside <FactRow>.`);
  return context;
}

/** A list of facts. Name it with `aria-label` or `aria-labelledby`. It is a container, so rows lay themselves out by its width. */
export function FactList({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="fact-list" className={cn("@container flex w-full min-w-0 flex-col divide-y divide-border", className)} {...props} />;
}

export type FactRowProps = ComponentProps<"li"> & {
  /** Whether the value is being edited (controlled). */
  editing?: boolean;
  defaultEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** The fact has been removed: the row becomes its FactRemoved stub (one line, with a way back) instead of vanishing. */
  removed?: boolean;
  /** Said to screen-reader users when the fact becomes removed ("Diet was forgotten"). */
  removedMessage?: string;
  /** Said when a removed fact comes back ("Diet was restored"). */
  restoredMessage?: string;
};

/**
 * One fact. Its parts are placed by name: label, value and source at the start, actions at the end (below
 * them when the list is narrow). While `editing`, FactValue and FactActions give way to FactEditor; while
 * `removed`, everything gives way to FactRemoved. Focus is kept: into the field when editing starts, back
 * to the Edit button when it ends, onto the stub's Undo when the row is removed from under the focus.
 */
export function FactRow({ className, editing, defaultEditing = false, onEditingChange, removed = false, removedMessage, restoredMessage, children, ...props }: FactRowProps) {
  const [isEditing, setEditing] = useControllableState({ value: editing, defaultValue: defaultEditing, onChange: onEditingChange });
  const focusOwed = useRef(false);
  const askForFocus = (): void => {
    focusOwed.current = true;
  };
  const takeFocus = (): boolean => {
    const owed = focusOwed.current;
    focusOwed.current = false;
    return owed;
  };
  const rowRef = useRef<HTMLLIElement>(null);
  const wasRemoved = useRef(removed);

  useEffect(() => {
    if (wasRemoved.current === removed) return;
    wasRemoved.current = removed;
    const message = removed ? removedMessage : restoredMessage;
    if (message) announce(message);
    // The control that had focus has just left the page with its part: give focus to what replaced it.
    if (document.activeElement === document.body || document.activeElement === null) {
      const row = rowRef.current;
      const next = removed
        ? (row?.querySelector<HTMLElement>("[data-slot=fact-undo]") ?? row?.querySelector<HTMLElement>("[data-slot=fact-removed]"))
        : row?.querySelector<HTMLElement>("[data-slot=fact-actions] button, [data-slot=fact-actions] a");
      next?.focus();
    }
  }, [removed, removedMessage, restoredMessage]);

  return (
    <FactContext value={{ editing: isEditing && !removed, setEditing, removed, askForFocus, takeFocus }}>
      <li
        ref={rowRef}
        data-slot="fact-row"
        data-editing={isEditing && !removed ? "" : undefined}
        data-removed={removed ? "" : undefined}
        className={cn(
          "grid min-w-0 grid-cols-1 py-4 text-sm [grid-template-areas:'label''value''source''actions'] data-[removed]:block data-[removed]:py-3 @lg:grid-cols-[minmax(0,1fr)_auto] @lg:gap-x-6 @lg:[grid-template-areas:'label_actions''value_actions''source_actions']",
          className,
        )}
        {...props}
      >
        {children}
      </li>
    </FactContext>
  );
}

/** What the fact is about ("Diet", "Home airport"). */
export function FactLabel({ className, ...props }: ComponentProps<"span">) {
  const { removed } = useFact("FactLabel");
  if (removed) return null;
  return <span data-slot="fact-label" className={cn("text-xs font-medium text-muted-foreground [grid-area:label]", className)} {...props} />;
}

/** The fact itself. It gives way to FactEditor while editing. */
export function FactValue({ className, ...props }: ComponentProps<"span">) {
  const { removed, editing } = useFact("FactValue");
  if (removed || editing) return null;
  return <span data-slot="fact-value" className={cn("mt-0.5 min-w-0 text-base break-words text-foreground [grid-area:value]", className)} {...props} />;
}

/** Where the fact came from: one or more SourceChip. */
export function FactSource({ className, ...props }: ComponentProps<"div">) {
  const { removed } = useFact("FactSource");
  if (removed) return null;
  return <div data-slot="fact-source" className={cn("mt-2 flex min-w-0 flex-wrap items-center gap-1.5 [grid-area:source]", className)} {...props} />;
}

export type SourceChipProps = ComponentProps<"span"> & {
  /** A small icon for the kind of source: a conversation, a form, an import, a guess. Decoration: the words carry the meaning. */
  icon?: ReactNode;
  /** Render the child (a button or a link that opens the source) with the chip's look. */
  asChild?: boolean;
};

/**
 * Says where a fact came from, in the project's words ("You said this on 3 May", "From your booking in
 * June", "Guessed from what you chose"). To let people open the source, pass a button or a link with
 * `asChild`: it gets a hover ground and a touch target of at least 40 px.
 */
export function SourceChip({ icon, asChild = false, className, children, ...props }: SourceChipProps) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="source-chip"
      className={cn(
        "relative inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-control bg-muted px-2 py-0.5 text-start text-xs text-foreground [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        "[a&]:underline [a&]:underline-offset-2 [a&,button&]:cursor-pointer [a&,button&]:transition-[background-color] [a&,button&]:duration-instant [a&,button&]:ease-out [a&,button&]:after:absolute [a&,button&]:after:-inset-x-1 [a&,button&]:after:-inset-y-2 [a&,button&]:hover:bg-accent [a&,button&]:motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="contents">
          {icon}
        </span>
      ) : null}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  );
}

/** The actions on one fact, as a named group: give it an `aria-label` that says which fact ("Diet"). */
export function FactActions({ className, ...props }: ComponentProps<"div">) {
  const { removed, editing } = useFact("FactActions");
  if (removed || editing) return null;
  return (
    <div
      role="group"
      data-slot="fact-actions"
      className={cn("-ms-2.5 mt-2 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 [grid-area:actions] @lg:ms-0 @lg:mt-0 @lg:justify-end @lg:self-center", className)}
      {...props}
    />
  );
}

const actionLook = cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2.5 pointer-coarse:h-control");

export type FactActionProps = ComponentProps<"button"> & {
  /** "destructive" for an action that removes the fact for good. */
  variant?: "default" | "destructive";
};

/** One action. Its words are the project's: "Not true any more", "Forget this". */
export function FactAction({ className, variant = "default", type = "button", ...props }: FactActionProps) {
  return <button type={type} data-slot="fact-action" className={cn(actionLook, variant === "destructive" && "text-destructive", className)} {...props} />;
}

/** The action that starts editing. It takes focus back when editing ends. */
export function FactEditTrigger({ className, onClick, type = "button", ...props }: ComponentProps<"button">) {
  const { setEditing, takeFocus } = useFact("FactEditTrigger");
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (takeFocus()) ref.current?.focus();
    // Once, as the button mounts: that is when editing has just ended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <button
      ref={ref}
      type={type}
      data-slot="fact-edit-trigger"
      className={cn(actionLook, className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setEditing(true);
      }}
      {...props}
    />
  );
}

export type FactEditorProps = Omit<ComponentProps<"form">, "onSubmit" | "defaultValue"> & {
  /** What the field starts with: the fact's current value. */
  defaultValue?: string;
  /** Called with the new value when it is saved. Not called when nothing changed or the field is empty. */
  onSave?: (value: string) => void;
  onCancel?: () => void;
  /** Said to screen-reader users after saving ("Diet was changed"). */
  savedMessage?: string;
  saveLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** Props for the field: `placeholder`, `maxLength`, `inputMode`, `autoComplete`. */
  inputProps?: Omit<ComponentProps<"input">, "value" | "defaultValue" | "onChange">;
};

/**
 * The value as a field, shown only while the row is editing. Enter saves, Escape cancels. Name the field
 * with `aria-label` or `aria-labelledby` (they go to the input). An empty value cannot be saved: removing a
 * fact is a different action, with its own button.
 */
export function FactEditor({
  className,
  defaultValue = "",
  onSave,
  onCancel,
  savedMessage,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  inputProps,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: FactEditorProps) {
  const { editing } = useFact("FactEditor");
  if (!editing) return null;
  return (
    <FactEditorForm
      className={className}
      defaultValue={defaultValue}
      onSave={onSave}
      onCancel={onCancel}
      savedMessage={savedMessage}
      saveLabel={saveLabel}
      cancelLabel={cancelLabel}
      inputProps={inputProps}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      {...props}
    />
  );
}

/** Mounted afresh each time editing starts, so the field always starts from the current value. */
function FactEditorForm({ className, defaultValue = "", onSave, onCancel, savedMessage, saveLabel, cancelLabel, inputProps, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...props }: FactEditorProps) {
  const { setEditing, askForFocus } = useFact("FactEditor");
  const [draft, setDraft] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const close = (): void => {
    askForFocus();
    setEditing(false);
  };
  const cancel = (): void => {
    onCancel?.();
    close();
  };
  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const value = draft.trim();
    if (value === "") return;
    if (value !== defaultValue) {
      onSave?.(value);
      if (savedMessage) announce(savedMessage);
    }
    close();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>): void => {
    if (event.key !== "Escape") return;
    // Escape belongs to the editor: it must not also close a sheet or dialog the list sits in.
    event.preventDefault();
    event.stopPropagation();
    cancel();
  };

  return (
    <form data-slot="fact-editor" noValidate onSubmit={save} onKeyDown={onKeyDown} className={cn("col-span-full mt-1.5 flex min-w-0 flex-wrap items-center gap-2 [grid-area:value]", className)} {...props}>
      <input
        ref={inputRef}
        type="text"
        data-slot="fact-editor-input"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        autoComplete="off"
        {...inputProps}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className={cn(inputVariants({ size: "md" }), "min-w-0 flex-1 basis-48", inputProps?.className)}
      />
      <div className="flex shrink-0 items-center gap-2">
        <button type="submit" data-slot="fact-editor-save" disabled={draft.trim() === ""} className={buttonVariants({ variant: "solid", size: "md" })}>
          {saveLabel}
        </button>
        <button type="button" data-slot="fact-editor-cancel" onClick={cancel} className={buttonVariants({ variant: "ghost", size: "md" })}>
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}

/**
 * What is left of a removed fact: one line that says what happened, with a way back (FactUndo). Shown only
 * while the row is `removed`. Drop the row from the list for good once the removal can no longer be undone.
 */
export function FactRemoved({ className, ...props }: ComponentProps<"p">) {
  const { removed } = useFact("FactRemoved");
  if (!removed) return null;
  return <p data-slot="fact-removed" tabIndex={-1} className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground", className)} {...props} />;
}

/** Brings a removed fact back. Its word is the project's ("Undo"). */
export function FactUndo({ className, type = "button", ...props }: ComponentProps<"button">) {
  return <button type={type} data-slot="fact-undo" className={cn(actionLook, "text-foreground underline underline-offset-4", className)} {...props} />;
}
