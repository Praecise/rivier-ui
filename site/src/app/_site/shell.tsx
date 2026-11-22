// Site: the frames pages are set in. The footer, a page of documentation with its sidebar, and the pieces of
// such a page: its heading, the list of what is on it, and the links to the pages before and after.

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { SiteHeader } from "../_showcase/site-header";
import { cn } from "@/lib/cn";
import { Main, Sidebar, type SidebarGroup } from "./parts";

const FOOTER = [
  {
    title: "Library",
    links: [
      ["Introduction", "/docs"],
      ["Installation", "/docs/installation"],
      ["Components", "/components"],
      ["Showcase", "/showcase"],
    ],
  },
  {
    title: "Reference",
    links: [
      ["Theming", "/docs/theming"],
      ["Accessibility", "/docs/accessibility"],
      ["Conventions", "/docs/conventions"],
      ["Changelog", "/docs/changelog"],
    ],
  },
  {
    title: "For assistants",
    links: [
      ["llms.txt", "/llms.txt"],
      ["registry.json", "/registry.json"],
      ["How an assistant uses it", "/docs/assistants"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-page gap-10 px-(--gutter) py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-medium tracking-tight">Rivier UI</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Components you copy in and own, themed from one place. Apache 2.0.</p>
          <p className="mt-4 text-sm">
            <a href="https://rivier.ai" className="underline underline-offset-4 hover:opacity-70">
              rivier.ai
            </a>
          </p>
        </div>
        {FOOTER.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{column.title}</p>
            <ul className="mt-3 flex flex-col gap-1">
              {column.links.map(([title, href]) => (
                <li key={href}>
                  <a href={href} className="inline-flex min-h-8 items-center text-sm text-muted-foreground hover:text-foreground pointer-coarse:min-h-10">
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}

/** What a page of text looks like: headings, paragraphs, lists, links and tables, from the theme. */
// A demonstration set inside a page of text keeps its own look: the rules for text stop at its frame.
export const prose =
  "min-w-0 text-base leading-relaxed [&_strong]:font-medium [&_a:not([data-slot=live-frame]_*)]:underline [&_a:not([data-slot=live-frame]_*)]:underline-offset-4 [&_h2:not([data-slot=live-frame]_*)]:mt-12 [&_h2:not([data-slot=live-frame]_*)]:scroll-mt-24 [&_h2:not([data-slot=live-frame]_*)]:text-xl [&_h2:not([data-slot=live-frame]_*)]:font-medium [&_h2:not([data-slot=live-frame]_*)]:tracking-tight [&_h3:not([data-slot=live-frame]_*)]:mt-8 [&_h3:not([data-slot=live-frame]_*)]:font-medium [&_li:not([data-slot=live-frame]_*)]:mt-2 [&_p:not([data-slot=live-frame]_*)]:mt-4 [&_ul:not([data-slot=live-frame]_*)]:mt-4 [&_ul:not([data-slot=live-frame]_*)]:list-disc [&_ul:not([data-slot=live-frame]_*)]:ps-5 [&_ul:not([data-slot=live-frame]_*)]:marker:text-muted-foreground [&_a:not([data-slot=live-frame]_*):hover]:opacity-70";

export type OnPage = { id: string; title: string };

/** A page with the section's sidebar: documentation, or one component. */
export function DocPage({
  nav,
  navLabel,
  eyebrow,
  title,
  lead,
  actions,
  onPage = [],
  previous,
  next,
  children,
}: {
  nav: SidebarGroup[];
  navLabel: string;
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  /** Buttons under the heading. */
  actions?: ReactNode;
  onPage?: OnPage[];
  previous?: { href: string; title: string };
  next?: { href: string; title: string };
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <Main>
        <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-(--gutter) py-8 lg:flex-row lg:gap-10 lg:py-12">
          <Sidebar groups={nav} label={navLabel} />
          <article className="min-w-0 flex-1">
            <header className="max-w-3xl">
              {eyebrow ? <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{eyebrow}</p> : null}
              <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
              {lead ? <p className="mt-4 text-lg text-muted-foreground">{lead}</p> : null}
              {actions ? <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div> : null}
            </header>
            <div className={cn(prose, "mt-2 max-w-3xl")}>{children}</div>
            {previous || next ? (
              <nav aria-label="More pages" className="mt-14 grid max-w-3xl gap-3 sm:grid-cols-2">
                {previous ? (
                  <a href={previous.href} className="flex flex-col gap-1 rounded-surface border p-4 transition-colors duration-instant ease-out hover:bg-accent motion-reduce:transition-none">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowLeft aria-hidden="true" strokeWidth={1.5} className="size-4 rtl:-scale-x-100" />
                      Before
                    </span>
                    <span className="font-medium">{previous.title}</span>
                  </a>
                ) : (
                  <span />
                )}
                {next ? (
                  <a href={next.href} className="flex flex-col items-end gap-1 rounded-surface border p-4 text-end transition-colors duration-instant ease-out hover:bg-accent motion-reduce:transition-none">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      Next
                      <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4 rtl:-scale-x-100" />
                    </span>
                    <span className="font-medium">{next.title}</span>
                  </a>
                ) : null}
              </nav>
            ) : null}
          </article>
          {onPage.length > 1 ? (
            <nav aria-label="On this page" className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] w-48 shrink-0 overflow-y-auto xl:block">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">On this page</p>
              <ul className="mt-3 flex flex-col gap-1 border-s">
                {onPage.map((entry) => (
                  <li key={entry.id}>
                    <a href={`#${entry.id}`} className="-ms-px flex min-h-8 items-center border-s border-transparent ps-3 text-sm text-muted-foreground hover:border-border-strong hover:text-foreground">
                      {entry.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </Main>
      <SiteFooter />
    </>
  );
}

/** A second-level heading with an address of its own. */
export function H2({ id, children }: { id: string; children: ReactNode }) {
  return <h2 id={id}>{children}</h2>;
}
