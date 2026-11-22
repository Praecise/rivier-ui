import type { Metadata } from "next";
import { SiteHeader } from "../_showcase/site-header";
import { Catalogue } from "../_site/catalogue";
import { Main } from "../_site/parts";
import { CATEGORIES, items } from "../_site/registry";
import { SiteFooter } from "../_site/shell";

export const metadata: Metadata = {
  title: "Components: Rivier UI",
  description: "Every component and helper in Rivier UI, with its example, its source and a working demonstration.",
  alternates: { canonical: "/components" },
};

export default function Page() {
  const all = items();
  const groups = CATEGORIES.map((category) => ({
    ...category,
    items: all.filter((entry) => entry.category === category.id).map(({ name, description }) => ({ name, description })),
  }));
  return (
    <>
      <SiteHeader />
      <Main>
        <div className="@container mx-auto w-full max-w-page px-(--gutter) py-10 lg:py-14">
          <header className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Components</p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">Every component, in one place.</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {all.length} items. Each has what it is for, when to use it, an example that works, its whole source, and a demonstration you can try.
            </p>
          </header>
          <Catalogue groups={groups} />
        </div>
      </Main>
      <SiteFooter />
    </>
  );
}
