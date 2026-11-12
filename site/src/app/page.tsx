import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Charts, Three } from "./_showcase/visuals";
import { Controls } from "./_showcase/controls";
import { Group } from "./_showcase/demo";
import { Display } from "./_showcase/display";
import { Hero } from "./_showcase/hero";
import { Layouts } from "./_showcase/layouts";
import { Motions } from "./_showcase/motions";
import { Overlays } from "./_showcase/overlays";
import { PAGES } from "./_showcase/pages";
import { SiteHeader } from "./_showcase/site-header";
import { ThemePanel } from "./_showcase/theme-panel";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="isolate overflow-x-clip">
        <Hero />

        <section id="theme" aria-label="Theme" className="mx-auto w-full max-w-page px-(--gutter) pb-6">
          <ThemePanel />
          <p className="mt-3 text-sm text-muted-foreground">
            These switches set three attributes on the page. Everything below, charts and 3D included, follows.
          </p>
        </section>

        <Group id="controls" title="Controls" description="Buttons and form controls. Behaviour and accessibility come from Radix.">
          <Controls />
        </Group>
        <Group id="overlays" title="Overlays and navigation" description="Dialogs, sheets, menus, a command palette, tabs. Flat: an edge and a veil, no shadows.">
          <Overlays />
        </Group>
        <Group id="display" title="Display" description="Cards, stats, tables, badges, alerts, loading and empty states.">
          <Display />
        </Group>
        <Group id="layout" title="Layout" description="A bento grid that follows its container, and the pieces a page is laid out with.">
          <Layouts />
        </Group>
        <Group id="motion" title="Motion and transitions" description="Transform and opacity only, from the theme's durations, and off when the visitor asks for less motion.">
          <Motions />
        </Group>
        <Group id="three" title="3D" description="Scenes that take their colours from the theme, pause off screen, and fall back to a still.">
          <Three />
        </Group>
        <Group id="charts" title="Charts" description="SVG charts in the theme's series colours, each with a text alternative. All figures are examples.">
          <Charts />
        </Group>

        <Group id="more" title="More, by task" description="Each of these pages shows a group of components and is driven by the browser checks: keyboard, screen reader names, right-to-left and phone width.">
          <ul className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {PAGES.map((page) => (
              <li key={page.href} className="flex">
                <a href={page.href} className="flex w-full flex-col gap-1 rounded-surface border bg-card p-5 transition-colors duration-instant ease-out hover:bg-accent motion-reduce:transition-none">
                  <span className="font-medium">{page.title}</span>
                  <span className="text-sm text-muted-foreground">{page.description}</span>
                </a>
              </li>
            ))}
          </ul>
        </Group>

        <section className="mx-auto w-full max-w-page px-(--gutter) py-16">
          <div data-theme="dark" data-accent="violet" className="rounded-surface border bg-background p-8 text-foreground sm:p-12">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">A theme inside a theme</p>
            <p className="mt-3 max-w-xl text-2xl font-medium tracking-tight">
              This block carries its own mode and highlight colour, whatever the page is set to.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="soft">Soft</Button>
            </div>
          </div>
        </section>
      </main>
      <Toaster />
    </>
  );
}
