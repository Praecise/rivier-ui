"use client";
/**
 * @name form
 * @category ui
 * @description A form that checks itself with the browser's own rules (required, type, length, range, pattern) and the project's, shows each field's message in words under it, and after a failed submit lists every fault at the top as links to the fields, said once.
 * @when Any form with rules: sign-up, checkout, settings. The rules live on the controls (`required`, `type="email"`, `min`) or in a `match` function; a server's answer goes in `serverInvalid` with its message. For a single field with no rules, field is enough; for a guided form over several steps use wizard.
 * @example
 * <Form onSubmit={(event) => { event.preventDefault(); save(new FormData(event.currentTarget)); }}>
 *   <FormErrorSummary title="There is a problem" />
 *   <FormField name="email">
 *     <FormLabel>Email</FormLabel>
 *     <FormControl asChild><Input type="email" required /></FormControl>
 *     <FormMessage match="valueMissing">Enter your email address.</FormMessage>
 *     <FormMessage match="typeMismatch">Enter an email address like name@example.com.</FormMessage>
 *   </FormField>
 *   <FormSubmit asChild><Button>Create account</Button></FormSubmit>
 * </Form>
 */
import { Form as FormPrimitive } from "radix-ui";
import { createContext, use, useRef, useState, type ComponentProps } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";

type Fault = { id: string; label: string; message: string };
type FormContextValue = { faults: readonly Fault[] };
const FormContext = createContext<FormContextValue | null>(null);

export type FormProps = ComponentProps<typeof FormPrimitive.Root> & {
  /** Said after a failed submit: "2 problems". */
  faultCount?: (count: number) => string;
};

/** The form. On a failed submit it gathers every field that is not valid for FormErrorSummary and says how many. */
export function Form({ className, onInvalidCapture, onSubmit, faultCount = (count) => `${count} ${count === 1 ? "problem" : "problems"} to fix`, children, ...props }: FormProps) {
  const [faults, setFaults] = useState<readonly Fault[]>([]);
  const pending = useRef(false);
  const gather = (form: HTMLFormElement): void => {
    const controls = [...form.elements].filter((element): element is HTMLInputElement => "validity" in element && !(element as HTMLInputElement).validity.valid);
    const found = controls.map((control) => {
      const label = control.labels?.[0]?.textContent?.trim() || control.getAttribute("aria-label") || control.name;
      // The field's own visible messages, when the project wrote them; else the browser's.
      const field = control.closest("[data-slot=form-field]");
      const written = field ? [...field.querySelectorAll("[data-slot=form-message]")].map((node) => node.textContent?.trim()).filter(Boolean).join(" ") : "";
      return { id: control.id, label, message: written || control.validationMessage };
    });
    setFaults(found);
    if (found.length > 0) announce(faultCount(found.length), "assertive");
  };
  return (
    <FormContext value={{ faults }}>
      <FormPrimitive.Root
        data-slot="form"
        className={cn("flex flex-col gap-5", className)}
        onInvalidCapture={(event) => {
          onInvalidCapture?.(event);
          // One gathering for all the fields that report in this submit.
          if (pending.current) return;
          pending.current = true;
          const form = event.currentTarget;
          // Two frames: the fields first show their own messages, which the summary repeats.
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              pending.current = false;
              gather(form);
            }),
          );
        }}
        onSubmit={(event) => {
          setFaults([]);
          onSubmit?.(event);
        }}
        {...props}
      >
        {children}
      </FormPrimitive.Root>
    </FormContext>
  );
}

export type FormErrorSummaryProps = Omit<ComponentProps<"div">, "title"> & {
  /** The heading: "There is a problem". */
  title: string;
};

/** After a failed submit: every fault as a link that takes focus to its field. Nothing is drawn while all is well. */
export function FormErrorSummary({ title, className, ...props }: FormErrorSummaryProps) {
  const context = use(FormContext);
  if (!context || context.faults.length === 0) return null;
  return (
    <div data-slot="form-error-summary" role="alert" className={cn("rounded-surface border-2 border-destructive p-4", className)} {...props}>
      <p className="font-medium">{title}</p>
      <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-sm">
        {context.faults.map((fault) => (
          <li key={fault.id || fault.label}>
            <a
              href={fault.id ? `#${fault.id}` : undefined}
              className="text-destructive underline underline-offset-4"
              onClick={(event) => {
                const target = fault.id ? document.getElementById(fault.id) : null;
                if (!target) return;
                event.preventDefault();
                // At once: a smooth scroll still running would move the page under the person's next click.
                target.focus({ preventScroll: true });
                target.scrollIntoView({ block: "center", behavior: "instant" });
              }}
            >
              {fault.label}: {fault.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One field: its label, control, description and messages share the name. */
export function FormField({ className, ...props }: ComponentProps<typeof FormPrimitive.Field>) {
  return <FormPrimitive.Field data-slot="form-field" className={cn("group/field flex flex-col gap-1.5", className)} {...props} />;
}

export function FormLabel({ className, ...props }: ComponentProps<typeof FormPrimitive.Label>) {
  return <FormPrimitive.Label data-slot="form-label" className={cn("text-sm font-medium data-[invalid]:text-destructive", className)} {...props} />;
}

/** The control. With `asChild`, any input of the library: Input, Textarea, a select of the project's. */
export function FormControl({ className, ...props }: ComponentProps<typeof FormPrimitive.Control>) {
  return <FormPrimitive.Control data-slot="form-control" className={cn("data-[invalid]:border-destructive", className)} {...props} />;
}

/** A line under the control that helps before anything goes wrong. */
export function FormDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="form-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/** Shown when the field breaks the rule in `match` (a browser rule, or a function of the value). The control is described by it. */
export function FormMessage({ className, ...props }: ComponentProps<typeof FormPrimitive.Message>) {
  return <FormPrimitive.Message data-slot="form-message" className={cn("flex items-start gap-1 text-sm text-destructive before:content-['!'] before:font-bold", className)} {...props} />;
}

/**
 * The submit button. A field is checked when it is left, so its message can appear just as the button is
 * pressed and move it down: the press then ends off the button and the browser sends no click. A press that
 * ends where the button was when it began still submits.
 */
export function FormSubmit({ onPointerDown, ...props }: ComponentProps<typeof FormPrimitive.Submit>) {
  return (
    <FormPrimitive.Submit
      data-slot="form-submit"
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.button !== 0) return;
        const button = event.currentTarget as HTMLButtonElement;
        const before = button.getBoundingClientRect();
        const finish = (up: PointerEvent): void => {
          const inside = up.clientX >= before.left && up.clientX <= before.right && up.clientY >= before.top && up.clientY <= before.bottom;
          // Only when the release missed the button: a release on it is an ordinary click.
          if (inside && !button.contains(up.target as Node) && !button.disabled) button.form?.requestSubmit(button);
        };
        window.addEventListener("pointerup", finish, { once: true });
      }}
      {...props}
    />
  );
}
