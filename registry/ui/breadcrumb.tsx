/**
 * @name breadcrumb
 * @category ui
 * @description The path from the top of the site to the current page, as links with separators.
 * @when Pages nested three or more levels deep, above the page title. The last item is the current page: a BreadcrumbPage, not a link. For moving between sibling pages use tabs or the navbar. With a router link, pass it through `asChild`.
 * @example
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem><BreadcrumbLink href="/projects">Projects</BreadcrumbLink></BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem><BreadcrumbPage>Atlas</BreadcrumbPage></BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
 */
import { Slot } from "radix-ui";
import { ChevronRight, Ellipsis } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** The landmark. `aria-label` is "Breadcrumb" unless you translate it. */
export function Breadcrumb({ "aria-label": label = "Breadcrumb", ...props }: ComponentProps<"nav">) {
  return <nav data-slot="breadcrumb" aria-label={label} {...props} />;
}

export function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol data-slot="breadcrumb-list" className={cn("flex flex-wrap items-center gap-x-2 text-sm break-words text-muted-foreground", className)} {...props} />
  );
}

export function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
  return <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-2", className)} {...props} />;
}

export function BreadcrumbLink({ className, asChild = false, ...props }: ComponentProps<"a"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        "inline-flex min-h-10 items-center underline-offset-4 transition-colors duration-instant ease-out hover:text-foreground hover:underline motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

/** The current page: text, not a link, marked `aria-current="page"`. */
export function BreadcrumbPage({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="breadcrumb-page" aria-current="page" className={cn("inline-flex min-h-10 items-center font-medium text-foreground", className)} {...props} />;
}

/** Decoration between items, hidden from assistive technology. Pass children to replace the chevron. */
export function BreadcrumbSeparator({ className, children, ...props }: ComponentProps<"li">) {
  return (
    <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn("inline-flex items-center [&_svg]:size-3.5", className)} {...props}>
      {children ?? <ChevronRight strokeWidth={1.5} className="rtl:rotate-180" />}
    </li>
  );
}

/** Stands for the levels left out of a long path. */
export function BreadcrumbEllipsis({ className, label = "More levels", ...props }: ComponentProps<"span"> & { label?: string }) {
  return (
    <span data-slot="breadcrumb-ellipsis" className={cn("inline-flex size-10 items-center justify-center", className)} {...props}>
      <Ellipsis aria-hidden="true" strokeWidth={1.5} className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
