"use client";
// Showcase: motion and transitions.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Morph, MorphGroup } from "@/components/motion/layout-transition";
import { Magnetic } from "@/components/motion/magnetic";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Presence } from "@/components/motion/presence";
import { Reveal } from "@/components/motion/reveal";
import { ScrollScene, ScrollSceneStep } from "@/components/motion/scroll-scene";
import { Spotlight } from "@/components/motion/spotlight";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { TextReveal } from "@/components/motion/text-reveal";
import { Tilt } from "@/components/motion/tilt";
import { startViewTransition } from "@/components/motion/view-transition";
import { cn } from "@/lib/cn";
import { Demo } from "./demo";

const TABS = ["Design", "Build", "Ship"] as const;

export function Motions() {
  const [shown, setShown] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Design");
  const [order, setOrder] = useState([1, 2, 3, 4]);

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Reveal, stagger, text reveal">
        <div className="grid gap-5">
          <TextReveal as="p" className="text-xl font-medium tracking-tight">
            Words arrive one after another when they come into view.
          </TextReveal>
          <Stagger className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((n) => (
              <StaggerItem key={n} className="flex h-14 items-center justify-center rounded-control bg-muted text-sm text-muted-foreground">
                {n}
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal direction="up">
            <p className="text-sm text-muted-foreground">Content already on screen when the page loads stays put; only what scrolls in is animated.</p>
          </Reveal>
        </div>
      </Demo>

      <Demo title="Number ticker and presence">
        <div className="grid gap-5">
          <p className="text-4xl font-medium tracking-tight">
            <NumberTicker value={128450} />
          </p>
          <div className="flex min-h-10 flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" data-testid="presence" onClick={() => setShown((value) => !value)}>
              {shown ? "Hide" : "Show"}
            </Button>
            <Presence show={shown} preset="slide-up">
              <span className="rounded-control bg-highlight-soft px-3 py-1.5 text-sm">Mounted and unmounted with a transition</span>
            </Presence>
          </div>
        </div>
      </Demo>

      <Demo title="Tilt, spotlight, magnetic">
        <div className="grid gap-4 @sm:grid-cols-2">
          <Tilt glare>
            <div className="flex h-32 items-center justify-center rounded-surface border bg-card text-sm text-muted-foreground">Tilt (move the pointer)</div>
          </Tilt>
          <Spotlight className="flex h-32 items-center justify-center rounded-surface border bg-card text-sm text-muted-foreground">Spotlight</Spotlight>
          <div className="@sm:col-span-2">
            <Magnetic>
              <Button>Magnetic button</Button>
            </Magnetic>
          </div>
        </div>
      </Demo>

      <Demo title="Shared element and view transition">
        <div className="grid gap-5">
          <MorphGroup id="showcase-tabs">
            <div role="tablist" aria-label="Phase" className="flex gap-1">
              {TABS.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={tab === name}
                  onClick={() => setTab(name)}
                  className={cn("relative h-control-sm rounded-control px-3 text-sm", tab === name ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {tab === name ? <Morph layoutId="pill" className="absolute inset-0 rounded-control bg-primary" /> : null}
                  <span className="relative">{name}</span>
                </button>
              ))}
            </div>
          </MorphGroup>
          <div className="flex flex-wrap items-center gap-2">
            {order.map((n) => (
              <span key={n} style={{ viewTransitionName: `tile-${n}` }} className="flex size-12 items-center justify-center rounded-control bg-muted text-sm">
                {n}
              </span>
            ))}
            <Button variant="outline" size="sm" data-testid="shuffle" onClick={() => startViewTransition(() => setOrder((value) => [...value.slice(1), value[0] ?? 1]))}>
              Reorder
            </Button>
          </div>
        </div>
      </Demo>

      <Demo title="Scroll scene" className="@3xl:col-span-2" bodyClassName="p-0">
        <ScrollScene length={2}>
          <div className="relative flex h-full items-center justify-center">
            <ScrollSceneStep from={0} to={0.5} className="absolute px-6 text-center">
              <p className="text-2xl font-medium tracking-tight sm:text-4xl">A section that holds still</p>
              <p className="mt-2 text-muted-foreground">while the story moves with the scroll.</p>
            </ScrollSceneStep>
            <ScrollSceneStep from={0.5} to={1} className="absolute px-6 text-center">
              <p className="text-2xl font-medium tracking-tight sm:text-4xl">Then the next beat</p>
              <p className="mt-2 text-muted-foreground">Under reduced motion it is a plain stack.</p>
            </ScrollSceneStep>
          </div>
        </ScrollScene>
      </Demo>
    </div>
  );
}
