"use client";
// Showcase: the opening section.

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Orb } from "@/components/three/orb";
import { Scene } from "@/components/three/scene";

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-page items-center gap-10 px-(--gutter) py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
      <div>
        <Badge variant="soft">Prelaunch</Badge>
        <h1 className="mt-5 text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl">Rivier UI</h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          A component library for AI-native development. Components you copy in and own, themed from one place:
          light or dark, square to round, any highlight colour. Controls, bento layouts, motion, 3D and charts.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href="#theme">Change the theme</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#controls">See the components</a>
          </Button>
        </div>
        <p className="mt-6 font-mono text-sm text-muted-foreground">rivier-ui add button dialog bento-grid</p>
      </div>
      <Scene aspect={1} className="mx-auto w-full max-w-md" label="A slowly morphing sphere in the highlight colour">
        <Orb />
      </Scene>
    </section>
  );
}
