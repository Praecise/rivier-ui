"use client";
// Showcase: the frame of a component page. It carries the theme switches, sets the reading direction from
// the address (?dir=rtl), and marks the page ready for the browser checks once it has hydrated.

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { DirectionProvider, type Direction } from "@/components/ui/direction-provider";
import { Group } from "./demo";
import { SiteHeader } from "./site-header";
import { ThemePanel } from "./theme-panel";

const subscribe = (): (() => void) => () => {};

export function Lab({ id, title, description, dir, children }: { id: string; title: string; description: string; dir: Direction; children: ReactNode }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  // <html> carries the direction too, so that portalled content (menus, dialogs) follows it.
  useEffect(() => {
    const before = document.documentElement.dir;
    document.documentElement.dir = dir;
    return () => {
      document.documentElement.dir = before;
    };
  }, [dir]);

  return (
    <DirectionProvider dir={dir}>
      <SiteHeader />
      <main className="isolate overflow-x-clip" data-lab-ready={hydrated ? "" : undefined}>
        <section aria-label="Theme" className="mx-auto w-full max-w-page px-(--gutter) pt-8">
          <ThemePanel />
        </section>
        <Group id={id} title={title} description={description}>
          {children}
        </Group>
      </main>
    </DirectionProvider>
  );
}
