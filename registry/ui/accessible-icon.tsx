/**
 * @name accessible-icon
 * @category ui
 * @description Gives an icon that stands alone a name for screen readers, and hides the drawing itself from them.
 * @when An icon that carries meaning with no words beside it and is not itself a control: a status mark in a table cell, a warning beside a figure. An icon-only button or link takes `aria-label` on the control instead; an icon beside its own words is decoration and takes `aria-hidden`; for other words that only a screen reader needs use visually-hidden.
 * @example
 * <AccessibleIcon label="Verified"><BadgeCheck strokeWidth={1.5} className="size-4" /></AccessibleIcon>
 */
import { AccessibleIcon as AccessibleIconPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

/** `label` is what is read out. The one child is the icon. */
export function AccessibleIcon(props: ComponentProps<typeof AccessibleIconPrimitive.Root>) {
  return <AccessibleIconPrimitive.Root {...props} />;
}
