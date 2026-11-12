/**
 * @name container
 * @category layout
 * @description Centres content at the page width with the page gutter on both sides. Four sizes: narrow, page, wide, full.
 * @when Around the content of every page band so edges line up down the page. "narrow" for reading text, "wide" for galleries and dashboards, "full" to keep only the gutter. Section already wraps its children in one.
 * @example
 * <Container>
 *   <h1>Pricing</h1>
 * </Container>
 * <Container size="narrow" asChild>
 *   <article>Long-form text…</article>
 * </Container>
 */
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const containerVariants = cva("mx-auto w-full px-(--gutter)", {
  variants: {
    size: {
      narrow: "max-w-3xl",
      page: "max-w-page",
      wide: "max-w-[96rem]",
      full: "max-w-none",
    },
  },
  defaultVariants: { size: "page" },
});

export type ContainerProps = ComponentProps<"div"> &
  VariantProps<typeof containerVariants> & {
    /** Render the child element (main, article, header) with the container's width and gutter. */
    asChild?: boolean;
  };

export function Container({ className, size, asChild = false, ...props }: ContainerProps) {
  const Comp = asChild ? Slot.Root : "div";
  return <Comp data-slot="container" className={cn(containerVariants({ size }), className)} {...props} />;
}
