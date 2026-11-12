"use client";
// Showcase: model-viewer.
//
// The files are written by scripts/make-test-assets.ts into site/public/models: a faceted vase as glTF, and
// the same vase as Gaussian splats in three formats. Nothing is fetched from another site.

import { useRef, useState } from "react";
import { ModelViewer, type ModelBounds, type ModelView, type ModelViewerHandle } from "@/components/three/model-viewer";
import { CompareSlider, CompareSliderFirst, CompareSliderHandle, CompareSliderLabels, CompareSliderSecond } from "@/components/ui/compare-slider";
import { Demo } from "./demo";

/** A flat outline of the vase, as the still shown before the model has drawn. */
const POSTER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path d="M176 262h48l22-34 8-52-14-48-22-28-6-22 10-16h-44l10 16-6 22-22 28-14 48 8 52z" fill="#888" fill-opacity="0.3" stroke="#888" stroke-width="2"/></svg>`,
)}`;

const SPLATS = [
  { file: "/models/vase.spz", name: ".spz" },
  { file: "/models/vase.ply", name: ".ply" },
  { file: "/models/vase.splat", name: ".splat" },
] as const;

/** The whole vase's bounding sphere, given to both viewers of the comparison so the broken one keeps its size and place. */
const WHOLE: ModelBounds = { center: [0, 0, 0], radius: 1.265 };

const START: ModelView = { azimuth: 0, polar: 15, zoom: 1 };

export function Models() {
  const handle = useRef<ModelViewerHandle>(null);
  const splatHandle = useRef<ModelViewerHandle>(null);
  const [splatStill, setSplatStill] = useState<string | null>(null);
  const [seen, setSeen] = useState<ModelView | null>(null);
  const [loads, setLoads] = useState(0);
  const [measured, setMeasured] = useState("");
  const [still, setStill] = useState<string | null>(null);
  const [splat, setSplat] = useState<string>(SPLATS[0].file);
  const [splatLoads, setSplatLoads] = useState<string[]>([]);
  const [shared, setShared] = useState<ModelView>(START);
  const [failure, setFailure] = useState("");

  return (
    <div className="grid gap-6 @3xl:grid-cols-2">
      <Demo title="Model viewer">
        <ModelViewer
          src="/models/vase.glb"
          alt="A clay vase with a painted belt"
          poster={POSTER}
          handleRef={handle}
          onViewChange={setSeen}
          onLoad={({ bounds }) => {
            setLoads((count) => count + 1);
            setMeasured(`${bounds.center.map((value) => value.toFixed(2)).join(" ")} / ${bounds.radius.toFixed(2)}`);
          }}
          ar={{ usdz: "/models/vase.usdz", title: "A clay vase" }}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <button type="button" data-testid="take-still" onClick={() => setStill(handle.current?.snapshot() ?? null)} className="inline-flex h-control items-center rounded-control border border-border-strong px-3 font-medium hover:bg-accent">
            Take a still
          </button>
          <button type="button" data-testid="reset-handle" onClick={() => handle.current?.reset()} className="inline-flex h-control items-center rounded-control border border-border-strong px-3 font-medium hover:bg-accent">
            Reset from outside
          </button>
          <span className="text-muted-foreground">
            Loaded <span data-testid="model-loads">{loads}</span> time(s), fitted to <span data-testid="model-bounds">{measured}</span>. View:{" "}
            <span data-testid="model-view">{seen ? `${Math.round(seen.azimuth)} ${Math.round(seen.polar)} ${seen.zoom.toFixed(2)}` : "untouched"}</span>
          </span>
        </div>
        {still ? <img data-testid="still" src={still} alt="A still taken from the viewer" className="mt-4 w-40 rounded-control border" /> : null}
      </Demo>

      <Demo title="Gaussian splats">
        <div role="group" aria-label="File format" className="mb-4 flex flex-wrap gap-2">
          {SPLATS.map((option) => (
            <button
              key={option.file}
              type="button"
              aria-pressed={splat === option.file}
              onClick={() => setSplat(option.file)}
              className="inline-flex h-control items-center rounded-control border border-border-strong px-3 font-mono text-sm aria-pressed:border-primary aria-pressed:bg-highlight-soft aria-pressed:font-medium"
            >
              {option.name}
            </button>
          ))}
        </div>
        <ModelViewer src={splat} alt="The same vase, as Gaussian splats" autoRotate handleRef={splatHandle} onLoad={() => setSplatLoads((list) => [...list, splat])} />
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <button type="button" data-testid="take-splat-still" onClick={() => setSplatStill(splatHandle.current?.snapshot() ?? null)} className="inline-flex h-control items-center rounded-control border border-border-strong px-3 font-medium hover:bg-accent">
            Take a still
          </button>
          <span className="text-muted-foreground">
            Drawn by Spark, which is fetched only for splats. Loaded: <span data-testid="splat-loads">{splatLoads.join(" ") || "nothing yet"}</span>
          </span>
        </div>
        {splatStill ? <img data-testid="splat-still" src={splatStill} alt="A still taken from the splat viewer" className="mt-4 w-40 rounded-control border" /> : null}
      </Demo>

      <Demo title="Two viewers, one camera" className="@3xl:col-span-2">
        <CompareSlider aspect="16 / 10" labels={{ first: "As made", second: "As found" }} aria-label="The vase as it was made and as it was found" className="mx-auto max-w-3xl rounded-surface border bg-muted">
          <CompareSliderFirst>
            <ModelViewer src="/models/vase.glb" alt="The vase as it was made" view={shared} onViewChange={setShared} bounds={WHOLE} aspect="auto" className="rounded-none border-0">
              {null}
            </ModelViewer>
          </CompareSliderFirst>
          <CompareSliderSecond>
            <ModelViewer src="/models/vase-broken.glb" alt="The vase as it was found, its neck broken off" view={shared} onViewChange={setShared} bounds={WHOLE} aspect="auto" className="rounded-none border-0">
              {null}
            </ModelViewer>
          </CompareSliderSecond>
          <CompareSliderLabels />
          <CompareSliderHandle />
        </CompareSlider>
        <div role="group" aria-label="Shared view" className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
          {(
            [
              ["Turn both left", (view: ModelView): ModelView => ({ ...view, azimuth: view.azimuth - 15 })],
              ["Turn both right", (view: ModelView): ModelView => ({ ...view, azimuth: view.azimuth + 15 })],
              ["Reset both", (): ModelView => START],
            ] as const
          ).map(([name, change]) => (
            <button key={name} type="button" onClick={() => setShared(change)} className="inline-flex h-control items-center rounded-control border border-border-strong px-3 font-medium hover:bg-accent">
              {name}
            </button>
          ))}
          <span className="text-muted-foreground">
            Shared view: <span data-testid="shared-view">{`${Math.round(shared.azimuth)} ${Math.round(shared.polar)} ${shared.zoom.toFixed(2)}`}</span>
          </span>
        </div>
      </Demo>

      <Demo title="When it cannot be shown">
        <ModelViewer src="/models/not-a-model.glb" alt="A model whose file cannot be read" poster={POSTER} onError={() => setFailure("the project was told")} />
        <p className="mt-4 text-sm text-muted-foreground">
          The poster stays and a sentence says why. <span data-testid="model-failure">{failure}</span>
        </p>
      </Demo>
    </div>
  );
}
