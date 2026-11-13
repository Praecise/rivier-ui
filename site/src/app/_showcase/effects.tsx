"use client";
// Showcase: motion effects, a background pattern, and data and notes in 3D. The numbers are invented.

import { ChartBar, Clapperboard, Map, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Pattern } from "@/components/layout/pattern";
import { AnimatedBeam } from "@/components/motion/animated-beam";
import { Confetti, type ConfettiHandle } from "@/components/motion/confetti";
import { Orbit } from "@/components/motion/orbit";
import { WordRotate } from "@/components/motion/word-rotate";
import { ModelAnnotations, ModelAnnotationTracker, useAnnotationStore } from "@/components/three/model-annotations";
import { ModelStage } from "@/components/three/model-stage";
import { PointCloud, PointCloudTable } from "@/components/three/point-cloud";
import { Scene } from "@/components/three/scene";
import { Button } from "@/components/ui/button";
import { ScatterChart } from "@/components/viz/scatter-chart";
import { Demo } from "./demo";

const SAMPLES = Array.from({ length: 90 }, (_, i) => ({
  width: Math.round((Math.sin(i * 1.7) + 1.2 + (i % 3)) * 10) / 10,
  height: Math.round((Math.cos(i * 0.9) + 1.5 + (i % 3) * 0.6) * 10) / 10,
  depth: Math.round((Math.sin(i * 0.37) * 2 + 2.5) * 10) / 10,
  kind: ["Clay", "Stone", "Glass"][i % 3] ?? "Clay",
}));

const tile = "flex size-12 items-center justify-center rounded-surface border bg-card [&_svg]:size-5";

export function Effects() {
  const box = useRef<HTMLDivElement>(null);
  const from = useRef<HTMLDivElement>(null);
  const to = useRef<HTMLDivElement>(null);
  const confetti = useRef<ConfettiHandle>(null);
  const [cheered, setCheered] = useState(0);
  const store = useAnnotationStore();
  return (
    <div className="grid gap-6 @3xl:grid-cols-2">
      <Demo title="Word rotate and pattern">
        <div className="relative isolate overflow-hidden rounded-surface border p-8">
          <Pattern variant="grid" />
          <p className="text-2xl font-medium">
            Maps for <WordRotate words={["teams", "schools", "newsrooms"]} interval={900} />
          </p>
        </div>
      </Demo>
      <Demo title="Animated beam">
        <div ref={box} className="relative isolate flex items-center justify-between rounded-surface border p-6">
          <div ref={from} className={tile}>
            <Map aria-hidden="true" />
          </div>
          <div ref={to} className={tile}>
            <Clapperboard aria-hidden="true" />
          </div>
          <AnimatedBeam containerRef={box} fromRef={from} toRef={to} curvature={30} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">A map becomes a film.</p>
      </Demo>
      <Demo title="Orbit">
        <Orbit
          className="mx-auto max-w-64"
          center={<span className="rounded-full border bg-card p-3 text-sm font-medium">Rivier</span>}
          items={[<span key="m" className={tile}><Map aria-hidden="true" /></span>, <span key="c" className={tile}><ChartBar aria-hidden="true" /></span>, <span key="f" className={tile}><Clapperboard aria-hidden="true" /></span>, <span key="s" className={tile}><Sparkles aria-hidden="true" /></span>]}
          itemLabels={["Maps", "Charts", "Films", "Motion"]}
        />
      </Demo>
      <Demo title="Confetti">
        <Confetti handleRef={confetti} />
        <Button
          onClick={(event) => {
            confetti.current?.fire({ x: event.clientX, y: event.clientY });
            setCheered((n) => n + 1);
          }}
        >
          Publish the report
        </Button>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="cheered">
          {cheered ? "Published." : "Not yet published."}
        </p>
      </Demo>
      <Demo title="Point cloud">
        <Scene label="Ninety finds by width, height and depth" aspect={4 / 3} fallback={<ScatterChart label="Finds by width and height" data={SAMPLES} x="width" y="height" group="kind" />}>
          <ModelStage>
            <PointCloud data={SAMPLES} x="width" y="height" z="depth" group="kind" />
          </ModelStage>
        </Scene>
        <PointCloudTable caption="Ninety finds" data={SAMPLES} x="width" y="height" z="depth" group="kind" />
      </Demo>
      <Demo title="Model annotations">
        <div className="relative">
          <Scene label="A box with three marked corners" aspect={4 / 3}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[3, 4, 5]} />
            <mesh>
              <boxGeometry args={[1.6, 1.2, 1.2]} />
              <meshStandardMaterial color="gray" />
            </mesh>
            <ModelAnnotationTracker
              store={store}
              points={[
                { id: "lid", position: [0, 0.6, 0] },
                { id: "side", position: [0.8, 0, 0] },
                { id: "front", position: [0, 0, 0.6] },
              ]}
            />
          </Scene>
          <ModelAnnotations
            store={store}
            annotations={[
              { id: "lid", label: "Lid", note: "Hinged at the back." },
              { id: "side", label: "Side", note: "A handle was here." },
              { id: "front", label: "Front", note: "The maker's mark." },
            ]}
          />
        </div>
      </Demo>
    </div>
  );
}
