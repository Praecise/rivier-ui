import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PAGES } from "./_showcase/pages";
import { SiteHeader } from "./_showcase/site-header";
import { ThemePanel } from "./_showcase/theme-panel";
import { Code } from "./_site/code";
import { Collage } from "./_site/collage";
import { Main } from "./_site/parts";
import { CATEGORIES, SITE, item, items } from "./_site/registry";
import { SiteFooter } from "./_site/shell";

const section = "mx-auto w-full max-w-page px-(--gutter) py-14 lg:py-20";
const eyebrow = "font-mono text-xs uppercase tracking-wider text-muted-foreground";
const heading = "mt-3 max-w-2xl text-3xl font-medium tracking-tight sm:text-4xl";
const lead = "mt-4 max-w-2xl text-lg text-muted-foreground";

const REASONS = [
  ["Copied in, not installed.", "A command puts the source in your project. You can read it and change it, and nothing breaks on an upgrade you did not ask for."],
  ["One theme, three switches.", "Light or dark, square to round, any highlight colour. Three attributes reach every component, charts and 3D included."],
  ["Written to be read by an assistant.", "Every file says what it is, when to use it and when not to, with an example that works. llms.txt and the registry are generated from that."],
  ["Past the flat page.", "Bento layouts, motion and page transitions, 3D scenes and charts are in the same library, on the same theme."],
  ["Checked in a real browser.", "Each keyboard pattern is pressed key by key at desktop and phone widths, left-to-right and right-to-left, with an accessibility scan."],
  ["In any language.", "No words are fixed in a component, layout follows the reading direction, and type follows the script."],
] as const;

export default function Page() {
  const all = items();
  const header = /\/\*\*[\s\S]*?\*\//.exec(item("dialog")?.source ?? "")?.[0] ?? "";
  return (
    <>
      <SiteHeader />
      <Main>
        <section className="mx-auto grid w-full max-w-page items-center gap-10 px-(--gutter) py-12 lg:grid-cols-[1fr_1fr] lg:py-20">
          <div className="min-w-0">
            <Badge variant="soft">Prelaunch</Badge>
            <h1 className="mt-5 text-4xl font-medium leading-tight tracking-tight sm:text-6xl">Components you own, themed from one place.</h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Rivier UI is a component library for AI-native development. Copy the source into your project, restyle all of it with three attributes, and give your
              assistant a library it can read.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="/docs/installation">
                  Get started
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} className="rtl:-scale-x-100" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/components">See the {all.length} components</a>
              </Button>
            </div>
            <Code code="npx shadcn@latest add @rivier-ui/button @rivier-ui/dialog" language="sh" copyLabel="Copy the command" className="mt-8 max-w-xl" />
            <p className="text-sm text-muted-foreground">
              With the registry named once in your project. <a href="/docs/installation" className="underline underline-offset-4 hover:opacity-70">How to set it up</a>
            </p>
          </div>
          <Collage />
        </section>

        <section id="theme" aria-labelledby="theme-title" className={section}>
          <p className={eyebrow}>Theme</p>
          <h2 id="theme-title" className={heading}>
            Change the look of this page.
          </h2>
          <p className={lead}>These switches set three attributes. Everything on the site follows, and your product does the same.</p>
          <div className="mt-8">
            <ThemePanel />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            <a href="/docs/theming" className="underline underline-offset-4 hover:opacity-70">
              How theming works
            </a>
          </p>
        </section>

        <section aria-labelledby="why-title" className={`${section} @container`}>
          <p className={eyebrow}>Why</p>
          <h2 id="why-title" className={heading}>
            Built for products that an assistant helps write.
          </h2>
          <ul className="mt-10 grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {REASONS.map(([title, text]) => (
              <li key={title} className="rounded-surface border bg-card p-6">
                <h3 className="font-medium">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="inside-title" className={`${section} @container`}>
          <p className={eyebrow}>What is in it</p>
          <h2 id="inside-title" className={heading}>
            {all.length} items, one look.
          </h2>
          <p className={lead}>Controls and surfaces, layout, motion, 3D and charts. Each one with its example, its source and a demonstration you can try.</p>
          <ul className="mt-10 grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {CATEGORIES.map((category) => (
              <li key={category.id} className="flex">
                <a
                  href={`/components#${category.id}`}
                  className="flex w-full flex-col gap-2 rounded-surface border bg-card p-6 transition-colors duration-instant ease-out hover:bg-accent motion-reduce:transition-none"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{category.title}</span>
                    <span className="font-mono text-sm text-muted-foreground">{all.filter((entry) => entry.category === category.id).length}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{category.description}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="assistants-title" className={`${section} grid gap-10 lg:grid-cols-2`}>
          <div className="min-w-0">
            <p className={eyebrow}>For assistants</p>
            <h2 id="assistants-title" className={heading}>
              A library an assistant can read.
            </h2>
            <p className={lead}>
              Every file opens with what the component is, when to reach for it, what to use instead, and an example that works. One file, llms.txt, holds all of
              them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <a href="/llms.txt">Open llms.txt</a>
              </Button>
              <Button asChild variant="ghost">
                <a href="/docs/assistants">How an assistant uses it</a>
              </Button>
            </div>
          </div>
          <Code code={header} title="registry/ui/dialog.tsx" copyLabel="Copy the header" className="my-0 [&_pre]:max-h-96 [&_pre]:overflow-y-auto" />
        </section>

        <section aria-labelledby="checked-title" className={`${section} @container`}>
          <p className={eyebrow}>Showcase</p>
          <h2 id="checked-title" className={heading}>
            See every component working.
          </h2>
          <p className={lead}>These pages are the ones the browser checks drive. Add ?dir=rtl to any of them to read it right-to-left.</p>
          <ul className="mt-10 grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
            <li className="flex">
              <a href="/showcase" className="flex w-full flex-col gap-1 rounded-surface border bg-highlight-soft p-5 transition-opacity duration-instant ease-out hover:opacity-85 motion-reduce:transition-none">
                <span className="font-medium">Everything on one page</span>
                <span className="text-sm text-muted-foreground">Controls, overlays, display, layout, motion, 3D and charts, with the theme switches.</span>
              </a>
            </li>
            {PAGES.map((page) => (
              <li key={page.href} className="flex">
                <a href={page.href} className="flex w-full flex-col gap-1 rounded-surface border bg-card p-5 transition-colors duration-instant ease-out hover:bg-accent motion-reduce:transition-none">
                  <span className="font-medium">{page.title}</span>
                  <span className="text-sm text-muted-foreground">{page.description}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="start-title" className="mx-auto w-full max-w-page px-(--gutter) pb-20">
          <div data-theme="dark" className="rounded-surface border bg-background p-8 text-foreground sm:p-12">
            <h2 id="start-title" className="max-w-xl text-2xl font-medium tracking-tight sm:text-3xl">
              Start with one component.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">Name the registry at {SITE.replace("https://", "")} once, add a button, and change it as you like. It is your code from then on.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href="/docs/installation">Install it</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/docs">Read the introduction</a>
              </Button>
            </div>
          </div>
        </section>
      </Main>
      <SiteFooter />
    </>
  );
}
