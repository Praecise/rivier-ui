"use client";
/**
 * @name field
 * @category ui
 * @description Lays out a label, a control, a description and an error message, and connects them (htmlFor, id, aria-describedby, aria-invalid) without hand-written ids.
 * @when Every control in a form. Put the control inside FieldControl; render FieldError only when there is a message and the field turns invalid by itself. Use orientation="horizontal" for a checkbox or switch beside its label, and FieldControl group for a radio group, toggle group or slider.
 * @example
 * <Field>
 *   <FieldLabel>Email</FieldLabel>
 *   <FieldControl><Input type="email" /></FieldControl>
 *   <FieldDescription>We only use it to reply.</FieldDescription>
 *   <FieldError>{error}</FieldError>
 * </Field>
 * <Field orientation="horizontal">
 *   <FieldControl><Switch /></FieldControl>
 *   <FieldLabel>Weekly summary</FieldLabel>
 * </Field>
 * <Field>
 *   <FieldLabel>Plan</FieldLabel>
 *   <FieldControl group>
 *     <RadioGroup defaultValue="pro">
 *       <Label><RadioGroupItem value="free" /> Free</Label>
 *       <Label><RadioGroupItem value="pro" /> Pro</Label>
 *     </RadioGroup>
 *   </FieldControl>
 * </Field>
 */
import { Slot } from "radix-ui";
import { createContext, use, useEffect, useId, useMemo, useState, type ComponentProps, type Dispatch, type SetStateAction } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

type FieldContextValue = {
  /** The control's id; the label points at it. */
  id: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
  /** True when `invalid` is set on the field, or a FieldError with a message is rendered. */
  invalid: boolean;
  hasDescription: boolean;
  hasError: boolean;
  setHasDescription: Dispatch<SetStateAction<boolean>>;
  setHasError: Dispatch<SetStateAction<boolean>>;
};

const FieldContext = createContext<FieldContextValue | null>(null);

/** The ids and state of the surrounding field, for wiring a control that FieldControl cannot wrap. */
export function useField(): FieldContextValue {
  const field = use(FieldContext);
  if (!field) throw new Error("Field parts (FieldLabel, FieldControl, FieldDescription, FieldError) must be inside <Field>.");
  return field;
}

export type FieldProps = Omit<ComponentProps<"div">, "id"> & {
  /** The id given to the control. Generated when left out. */
  id?: string;
  /** Force the invalid state. Left out, the field is invalid while a FieldError with a message is rendered. */
  invalid?: boolean;
  /** "vertical": label above the control. "horizontal": a small control (checkbox, switch) beside its label. */
  orientation?: "vertical" | "horizontal";
};

export function Field({ className, id: idProp, invalid: invalidProp, orientation = "vertical", ...props }: FieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [hasDescription, setHasDescription] = useState(false);
  const [hasError, setHasError] = useState(false);
  const invalid = invalidProp ?? hasError;
  const value = useMemo<FieldContextValue>(
    () => ({
      id,
      labelId: `${id}-label`,
      descriptionId: `${id}-description`,
      errorId: `${id}-error`,
      invalid,
      hasDescription,
      hasError,
      setHasDescription,
      setHasError,
    }),
    [id, invalid, hasDescription, hasError],
  );
  return (
    <FieldContext value={value}>
      <div
        data-slot="field"
        data-orientation={orientation}
        data-invalid={invalid || undefined}
        className={cn(
          "group/field min-w-0",
          orientation === "vertical" ? "flex flex-col gap-2" : "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1",
          className,
        )}
        {...props}
      />
    </FieldContext>
  );
}

export function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  const { id, labelId } = useField();
  return <Label data-slot="field-label" id={labelId} htmlFor={id} className={className} {...props} />;
}

export type FieldControlProps = ComponentProps<typeof Slot.Root> & {
  /**
   * For a control that is a group rather than one focusable element (radio group, toggle group, slider):
   * names it with aria-labelledby, since a label's htmlFor cannot point at a group.
   */
  group?: boolean;
};

/** Passes the field's id, aria-describedby and aria-invalid to its one child: the control. Renders no element. */
export function FieldControl({ group = false, ...props }: FieldControlProps) {
  const { id, labelId, descriptionId, errorId, invalid, hasDescription, hasError } = useField();
  const describedBy = [hasDescription ? descriptionId : null, hasError ? errorId : null].filter(Boolean).join(" ");
  return (
    <Slot.Root
      id={id}
      aria-labelledby={group ? labelId : undefined}
      aria-describedby={describedBy || undefined}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  const { descriptionId, setHasDescription } = useField();
  useEffect(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);
  return (
    <p
      data-slot="field-description"
      id={descriptionId}
      className={cn("text-sm text-muted-foreground group-data-[orientation=horizontal]/field:col-start-2", className)}
      {...props}
    />
  );
}

/** Renders nothing without a message, so it can stay in the markup: `<FieldError>{errors.email}</FieldError>`. */
export function FieldError({ className, children, ...props }: ComponentProps<"p">) {
  const { errorId, setHasError } = useField();
  const present = children !== null && children !== undefined && children !== false && children !== "";
  useEffect(() => {
    if (!present) return;
    setHasError(true);
    return () => setHasError(false);
  }, [present, setHasError]);
  if (!present) return null;
  return (
    <p
      data-slot="field-error"
      id={errorId}
      role="alert"
      className={cn("text-sm text-destructive group-data-[orientation=horizontal]/field:col-start-2", className)}
      {...props}
    >
      {children}
    </p>
  );
}
