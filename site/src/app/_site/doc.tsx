// Site: one page of the documentation. Its title, its lead and its neighbours come from the list of pages.

import type { ReactNode } from "react";
import { DOCS, docsNav } from "./registry";
import { DocPage, type OnPage } from "./shell";

export function Doc({ href, onPage, children }: { href: (typeof DOCS)[number]["href"]; onPage?: OnPage[]; children: ReactNode }) {
  const index = DOCS.findIndex((page) => page.href === href);
  const page = DOCS[index];
  if (!page) throw new Error(`No documentation page at ${href}`);
  return (
    <DocPage nav={docsNav()} navLabel="Documentation" eyebrow="Documentation" title={page.title} lead={page.description} onPage={onPage} previous={DOCS[index - 1]} next={DOCS[index + 1] ?? { href: "/components", title: "Components" }}>
      {children}
    </DocPage>
  );
}

export const docMetadata = (href: (typeof DOCS)[number]["href"]): { title: string; description: string; alternates: { canonical: string } } => {
  const page = DOCS.find((entry) => entry.href === href);
  return { title: `${page?.title ?? "Documentation"}: Rivier UI`, description: page?.description ?? "", alternates: { canonical: href } };
};
