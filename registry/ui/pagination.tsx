/**
 * @name pagination
 * @category ui
 * @description Links to the previous, next and numbered pages of a long list, with the look of buttons.
 * @when A list or table split over pages that people may want to jump within or link to. Each page is a real link, so it works without JavaScript; with a router link, pass it through `asChild`. On the first or last page give PaginationPrevious or PaginationNext `aria-disabled="true"` and no `href`. For a feed with no natural page numbers use a "Load more" button.
 * @example
 * <Pagination>
 *   <PaginationContent>
 *     <PaginationItem><PaginationPrevious href="?page=1" /></PaginationItem>
 *     <PaginationItem><PaginationLink href="?page=1">1</PaginationLink></PaginationItem>
 *     <PaginationItem><PaginationLink href="?page=2" isActive>2</PaginationLink></PaginationItem>
 *     <PaginationItem><PaginationEllipsis /></PaginationItem>
 *     <PaginationItem><PaginationLink href="?page=9">9</PaginationLink></PaginationItem>
 *     <PaginationItem><PaginationNext href="?page=3" /></PaginationItem>
 *   </PaginationContent>
 * </Pagination>
 */
import { Slot } from "radix-ui";
import type { VariantProps } from "class-variance-authority";
import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import type { ComponentProps } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** The landmark. `aria-label` is "Pagination" unless you translate it. */
export function Pagination({ className, "aria-label": label = "Pagination", ...props }: ComponentProps<"nav">) {
  return <nav data-slot="pagination" aria-label={label} className={cn("mx-auto flex w-full justify-center", className)} {...props} />;
}

export function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="pagination-content" className={cn("flex flex-wrap items-center justify-center gap-1", className)} {...props} />;
}

export function PaginationItem(props: ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

export type PaginationLinkProps = ComponentProps<"a"> &
  Pick<VariantProps<typeof buttonVariants>, "size"> & {
    /** The page being shown: outlined, and marked `aria-current="page"`. */
    isActive?: boolean;
    /** Render the child element (a router link, for example) with the link's look. */
    asChild?: boolean;
  };

export function PaginationLink({ className, isActive = false, size = "icon", asChild = false, ...props }: PaginationLinkProps) {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      data-slot="pagination-link"
      data-active={isActive || undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: isActive ? "outline" : "ghost", size }),
        "tabular-nums aria-disabled:pointer-events-none aria-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

type PaginationStepProps = Omit<PaginationLinkProps, "size" | "isActive" | "children"> & {
  /** The visible text, shown from `sm` up. It is also the accessible name unless `aria-label` is set. */
  label?: string;
};

/** Icon-only on phones, so it always carries an `aria-label`. */
export function PaginationPrevious({ className, label = "Previous", "aria-label": ariaLabel, ...props }: PaginationStepProps) {
  return (
    <PaginationLink data-slot="pagination-previous" aria-label={ariaLabel ?? `${label} page`} size="md" className={cn("gap-1 px-2.5", className)} {...props}>
      <ChevronLeft aria-hidden="true" strokeWidth={1.5} className="rtl:rotate-180" />
      <span className="hidden sm:inline">{label}</span>
    </PaginationLink>
  );
}

/** Icon-only on phones, so it always carries an `aria-label`. */
export function PaginationNext({ className, label = "Next", "aria-label": ariaLabel, ...props }: PaginationStepProps) {
  return (
    <PaginationLink data-slot="pagination-next" aria-label={ariaLabel ?? `${label} page`} size="md" className={cn("gap-1 px-2.5", className)} {...props}>
      <span className="hidden sm:inline">{label}</span>
      <ChevronRight aria-hidden="true" strokeWidth={1.5} className="rtl:rotate-180" />
    </PaginationLink>
  );
}

/** Stands for the pages left out between two numbers. */
export function PaginationEllipsis({ className, label = "More pages", ...props }: ComponentProps<"span"> & { label?: string }) {
  return (
    <span data-slot="pagination-ellipsis" className={cn("inline-flex size-(--control-h) items-center justify-center text-muted-foreground", className)} {...props}>
      <Ellipsis aria-hidden="true" strokeWidth={1.5} className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
