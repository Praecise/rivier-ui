// Showcase: a titled frame around one demonstration, and the heading of a group.

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Demo({ title, children, className, bodyClassName }: { title: string; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section data-demo={title} className={cn("flex min-w-0 flex-col rounded-surface border bg-card", className)}>
      <h3 className="border-b px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className={cn("min-w-0 flex-1 p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Group({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="@container mx-auto w-full max-w-page px-(--gutter) py-14">
      <header className="mb-8 max-w-2xl">
        <h2 id={`${id}-title`} className="text-2xl font-medium tracking-tight sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

/** The reading direction a component page was asked for: /choices?dir=rtl. */
export function dirFrom(searchParams: { dir?: string | string[] | undefined }): "ltr" | "rtl" {
  return searchParams.dir === "rtl" ? "rtl" : "ltr";
}
