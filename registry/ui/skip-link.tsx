/**
 * @name skip-link
 * @category ui
 * @description A link at the very start of the page, hidden until it has keyboard focus, that jumps past the header and navigation to the main content (WCAG 2.4.1).
 * @when Every page with a header or navigation before its content: put it first inside `<body>`, and give the main content the id it points to. Several can go in a row (to the content, to the search).
 * @example
 * <SkipLink href="#main">Skip to content</SkipLink>
 * …
 * <main id="main" tabIndex={-1}>…</main>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function SkipLink({ className, ...props }: ComponentProps<"a">) {
  return (
    <a
      data-slot="skip-link"
      className={cn(
        "fixed start-2 top-2 z-[100] -translate-y-[200%] rounded-control border bg-background px-4 py-2 text-sm font-medium text-foreground transition-transform duration-instant ease-out focus:translate-y-0 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}
