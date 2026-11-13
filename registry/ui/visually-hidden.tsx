/**
 * @name visually-hidden
 * @category ui
 * @description Text that screen readers read and sighted people do not see, such as the name of an icon-only control or a heading that the layout makes obvious; with `focusable`, it appears while it has keyboard focus.
 * @when Words that only assistive technology needs. For a link past repeated content use skip-link; for an icon button's name prefer `aria-label` on the button.
 * @example
 * <button type="button"><Bell aria-hidden="true" /><VisuallyHidden>Notifications</VisuallyHidden></button>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type VisuallyHiddenProps = ComponentProps<"span"> & {
  /** Shown while it, or a control inside it, has keyboard focus. */
  focusable?: boolean;
};

export function VisuallyHidden({ className, focusable = false, ...props }: VisuallyHiddenProps) {
  return <span data-slot="visually-hidden" className={cn("sr-only", focusable && "focus-within:not-sr-only focus:not-sr-only", className)} {...props} />;
}
