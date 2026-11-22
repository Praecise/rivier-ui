"use client";
/**
 * @name explainer
 * @category motion
 * @description Turns an explainer spec (plain JSON: scenes of a title, any chart, a map, a 3D model, a then-and-now comparison, a quote or a caption) into a film on film-stage: playable, scrubbable, with captions, narration in step, a provenance label on every scene that says how it was made, and frames drawn on request for export.
 * @when An assistant or a project describes a short explanatory film as data and wants it played: a story with numbers, a report as a film, a change on a map. Validate the spec with lib/explainer-spec first; a spec with faults shows them in words instead of a film. For a film drawn by hand use film-stage; for a video file use video-player.
 * @example
 * <Explainer spec={spec} />
 *
 * // Arranged by the project, and exported frame by frame by scripts/export-film.ts
 * <Explainer spec={spec} deterministic exportName="main">
 *   <FilmStageFrame aspect={16 / 9}>
 *     <ExplainerProvenance />
 *     <ExplainerCaptions />
 *   </FilmStageFrame>
 * </Explainer>
 */
import { createContext, use, useEffect, useMemo, useSyncExternalStore, type ComponentProps, type ComponentType, type ReactNode } from "react";
import {
  FilmStage,
  FilmStageAudio,
  FilmStageCaptionsButton,
  FilmStageControls,
  FilmStageControlsRow,
  FilmStageFrame,
  FilmStageMute,
  FilmStageNextScene,
  FilmStagePlay,
  FilmStagePreviousScene,
  FilmStageRate,
  FilmStageScrubber,
  FilmStageSceneStrip,
  FilmStageTime,
  useFilmClock,
  type FilmScene,
  type FilmSceneTime,
  type FilmStageProps,
} from "@/components/motion/film-stage";
import { Captions } from "@/components/ui/captions";
import { CompareSlider, CompareSliderFirst, CompareSliderLabels, CompareSliderSecond } from "@/components/ui/compare-slider";
import { ProvenanceLabel } from "@/components/ui/provenance-label";
import { ModelViewer } from "@/components/three/model-viewer";
import { AreaChart } from "@/components/viz/area-chart";
import { BarChart } from "@/components/viz/bar-chart";
import { BoxPlot } from "@/components/viz/box-plot";
import { BulletChart } from "@/components/viz/bullet-chart";
import { CalendarHeatmap } from "@/components/viz/calendar-heatmap";
import { CandlestickChart } from "@/components/viz/candlestick-chart";
import { ChordDiagram } from "@/components/viz/chord-diagram";
import { Choropleth, choroplethScale } from "@/components/viz/choropleth";
import { CirclePack } from "@/components/viz/circle-pack";
import { DensityChart } from "@/components/viz/density-chart";
import { DonutChart } from "@/components/viz/donut-chart";
import { DotPlot } from "@/components/viz/dot-plot";
import { FanChart } from "@/components/viz/fan-chart";
import { FunnelChart } from "@/components/viz/funnel-chart";
import { GanttChart } from "@/components/viz/gantt-chart";
import { GeoFeatures, GeoMap, type GeoView } from "@/components/viz/geo-map";
import { GeoHexbin } from "@/components/viz/geo-hexbin";
import { GeoMarkers } from "@/components/viz/geo-markers";
import { GeoRoutes } from "@/components/viz/geo-routes";
import { Heatmap } from "@/components/viz/heatmap";
import { Histogram } from "@/components/viz/histogram";
import { LineChart } from "@/components/viz/line-chart";
import { NetworkGraph } from "@/components/viz/network-graph";
import { ParallelCoordinates } from "@/components/viz/parallel-coordinates";
import { RadarChart } from "@/components/viz/radar-chart";
import { SankeyChart } from "@/components/viz/sankey-chart";
import { ScatterChart } from "@/components/viz/scatter-chart";
import { SlopeChart } from "@/components/viz/slope-chart";
import { SmallMultiples } from "@/components/viz/small-multiples";
import { StreamChart } from "@/components/viz/stream-chart";
import { Sunburst } from "@/components/viz/sunburst";
import { Treemap } from "@/components/viz/treemap";
import { WaterfallChart } from "@/components/viz/waterfall-chart";
import { cn } from "@/lib/cn";
import {
  explainerCues,
  explainerTimeline,
  validateExplainer,
  type ExplainerChart,
  type ExplainerFault,
  type ExplainerProvenanceKind,
  type ExplainerScene,
  type ExplainerSpec,
} from "@/lib/explainer-spec";

/** A chart scene's props are plain data from the spec; each chart checks its own at run time. */
type AnyChart = ComponentType<Record<string, unknown>>;

const CHARTS: Record<ExplainerChart, AnyChart> = {
  "line-chart": LineChart as unknown as AnyChart,
  "area-chart": AreaChart as unknown as AnyChart,
  "bar-chart": BarChart as unknown as AnyChart,
  "donut-chart": DonutChart as unknown as AnyChart,
  heatmap: Heatmap as unknown as AnyChart,
  "scatter-chart": ScatterChart as unknown as AnyChart,
  histogram: Histogram as unknown as AnyChart,
  "box-plot": BoxPlot as unknown as AnyChart,
  "fan-chart": FanChart as unknown as AnyChart,
  "small-multiples": SmallMultiples as unknown as AnyChart,
  treemap: Treemap as unknown as AnyChart,
  sunburst: Sunburst as unknown as AnyChart,
  "circle-pack": CirclePack as unknown as AnyChart,
  "sankey-chart": SankeyChart as unknown as AnyChart,
  "network-graph": NetworkGraph as unknown as AnyChart,
  "calendar-heatmap": CalendarHeatmap as unknown as AnyChart,
  "gantt-chart": GanttChart as unknown as AnyChart,
  "density-chart": DensityChart as unknown as AnyChart,
  "radar-chart": RadarChart as unknown as AnyChart,
  "waterfall-chart": WaterfallChart as unknown as AnyChart,
  "funnel-chart": FunnelChart as unknown as AnyChart,
  "bullet-chart": BulletChart as unknown as AnyChart,
  "candlestick-chart": CandlestickChart as unknown as AnyChart,
  "chord-diagram": ChordDiagram as unknown as AnyChart,
  "parallel-coordinates": ParallelCoordinates as unknown as AnyChart,
  "dot-plot": DotPlot as unknown as AnyChart,
  "stream-chart": StreamChart as unknown as AnyChart,
  "slope-chart": SlopeChart as unknown as AnyChart,
};

/** Every word the explainer adds. Pass `labels` to translate. */
export type ExplainerLabels = {
  /** The statement of each kind of provenance. */
  provenance: Record<ExplainerProvenanceKind, string>;
  /** Said after the statement in the label's button. */
  details: string;
  /** The heading over a spec's faults. */
  faults: string;
};

const LABELS: ExplainerLabels = {
  provenance: { measured: "Measured", reconstructed: "Reconstruction", generated: "Made by a model", invented: "Invented for illustration" },
  details: "how this was made",
  faults: "This explainer cannot be played:",
};

/** What a picture renderer is given: a framework's image component can stand in for the plain element. */
export type ExplainerPictureProps = { src: string; alt: string; className: string };

type ExplainerContextValue = { spec: ExplainerSpec; labels: ExplainerLabels; renderPicture?: ((picture: ExplainerPictureProps) => ReactNode) | undefined };
const ExplainerContext = createContext<ExplainerContextValue | null>(null);

function useExplainer(part: string): ExplainerContextValue {
  const context = use(ExplainerContext);
  if (!context) throw new Error(`${part} must be inside an Explainer.`);
  return context;
}

export type ExplainerProps = Omit<FilmStageProps, "scenes" | "children" | "labels"> & {
  /** The film as plain data. Checked with validateExplainer; a spec with faults shows them instead. */
  spec: ExplainerSpec;
  /** Words for provenance and faults; the stage's own words go in `stageLabels`. */
  labels?: Partial<Omit<ExplainerLabels, "provenance">> & { provenance?: Partial<ExplainerLabels["provenance"]> };
  stageLabels?: FilmStageProps["labels"];
  /** Draws a picture of a caption or comparison scene: pass the framework's image component. */
  renderPicture?: (picture: ExplainerPictureProps) => ReactNode;
  /** Called with the spec's faults whenever they change (an empty list when it is sound). */
  onFaults?: (faults: ExplainerFault[]) => void;
  /** The parts, arranged by the project. Left out: a frame with the provenance and captions, the controls and the scene strip. */
  children?: ReactNode;
};

export function Explainer({ spec, labels: given, stageLabels, renderPicture, onFaults, children, className, ...props }: ExplainerProps) {
  const labels: ExplainerLabels = { ...LABELS, ...given, provenance: { ...LABELS.provenance, ...given?.provenance } };
  const faults = useMemo(() => validateExplainer(spec), [spec]);
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, () => false);
  useEffect(() => {
    onFaults?.(faults);
  }, [faults, onFaults]);
  const scenes = useMemo<FilmScene[]>(
    () =>
      faults.length > 0
        ? []
        : spec.scenes.map((scene) => ({
            id: scene.id,
            duration: scene.duration,
            label: scene.label ?? sceneName(scene),
            transition: scene.transition ?? spec.transition ?? "crossfade",
            render: (local: FilmSceneTime) => <ExplainerSceneView scene={scene} local={local} still={reduced} />,
          })),
    [spec, faults, reduced],
  );
  if (faults.length > 0) {
    return (
      <div data-slot="explainer-faults" role="alert" className={cn("rounded-surface border border-destructive p-4 text-sm", className)}>
        <p className="font-medium">{labels.faults}</p>
        <ul className="mt-2 list-disc space-y-1 ps-5">
          {faults.map((item, index) => (
            <li key={index}>
              {item.path ? <code className="font-mono text-xs text-muted-foreground">{item.path}</code> : null} {item.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <ExplainerContext value={{ spec, labels, renderPicture }}>
      <FilmStage data-slot="explainer" data-film-export={props.exportName} scenes={scenes} aria-label={spec.title} lang={spec.lang ?? "en"} labels={stageLabels} className={className} {...props}>
        {children ?? (
          <>
            <FilmStageFrame aspect={spec.aspect ?? 16 / 9}>
              <ExplainerProvenance />
              <ExplainerCaptions />
            </FilmStageFrame>
            <ExplainerAudio />
            <FilmStageControls>
              <FilmStageScrubber />
              <FilmStageControlsRow>
                <FilmStagePreviousScene />
                <FilmStagePlay />
                <FilmStageNextScene />
                <FilmStageMute />
                <FilmStageTime />
                <FilmStageCaptionsButton className="ms-auto" />
                <FilmStageRate />
              </FilmStageControlsRow>
            </FilmStageControls>
            <FilmStageSceneStrip />
          </>
        )}
      </FilmStage>
    </ExplainerContext>
  );
}

/** The narration of every scene, each from its own start: for a project that arranges the parts itself. */
export function ExplainerAudio() {
  const { spec } = useExplainer("ExplainerAudio");
  const timeline = explainerTimeline(spec);
  return (
    <>
      {spec.bed ? <FilmStageAudio src={spec.bed.src} volume={spec.bed.volume ?? 0.3} /> : null}
      {spec.scenes.map((scene, index) =>
        scene.narration ? (
          <FilmStageAudio
            key={scene.id}
            src={scene.narration.src}
            start={(timeline.scenes[index]?.start ?? 0) + (scene.narration.start ?? 0)}
            duration={scene.narration.duration}
            volume={scene.narration.volume}
          />
        ) : null,
      )}
    </>
  );
}

/** The captions of every scene, on the stage's clock, over the bottom of the frame. */
export function ExplainerCaptions(props: Omit<ComponentProps<typeof Captions>, "cues" | "lang">) {
  const { spec } = useExplainer("ExplainerCaptions");
  const cues = useMemo(() => explainerCues(spec), [spec]);
  return <Captions cues={cues} lang={spec.lang ?? "en"} {...props} />;
}

/** The provenance of the scene on stage, over a top corner of the frame, with its note and sources in a popover. */
export function ExplainerProvenance({ position = "top-start", ...props }: Omit<ComponentProps<typeof ProvenanceLabel>, "children" | "details">) {
  const { spec, labels } = useExplainer("ExplainerProvenance");
  const { sceneIndex } = useFilmClock();
  const provenance = spec.scenes[sceneIndex]?.provenance;
  if (!provenance) return null;
  const statement = provenance.note ? `${labels.provenance[provenance.kind]}: ${provenance.note}` : labels.provenance[provenance.kind];
  const details =
    provenance.sources && provenance.sources.length > 0 ? (
      <ul className="list-disc space-y-1 ps-4">
        {provenance.sources.map((source, index) => (
          <li key={index}>{source}</li>
        ))}
      </ul>
    ) : undefined;
  return (
    <ProvenanceLabel data-provenance={provenance.kind} position={position} details={details} detailsLabel={labels.details} {...props}>
      {statement}
    </ProvenanceLabel>
  );
}

function sceneName(scene: ExplainerScene): string {
  switch (scene.kind) {
    case "title":
      return scene.title;
    case "chart":
      return scene.title ?? (typeof scene.props["label"] === "string" ? scene.props["label"] : scene.chart);
    case "map":
      return scene.title ?? scene.label;
    case "model":
      return scene.title ?? scene.alt;
    case "compare":
      return scene.label;
    case "quote":
      return scene.attribution ?? scene.text.slice(0, 40);
    case "caption":
      return scene.text.slice(0, 40);
  }
}

/** Whether the person asks for less motion, followed as it changes. */
const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (change: () => void): (() => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};
const readReduced = (): boolean => window.matchMedia(REDUCED).matches;

/** Eases a fraction in and out, so a camera or a divider starts and stops gently. */
const smooth = (t: number): number => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/** How far a scene's entrance has got, from its own time: drawn the same at any moment, final under reduced motion. */
function entrance(local: FilmSceneTime, still: boolean): { opacity: number; transform: string } {
  if (still) return { opacity: 1, transform: "none" };
  const t = smooth(local.time / 0.6);
  return { opacity: t, transform: `translateY(${((1 - t) * 12).toFixed(2)}px)` };
}

function ExplainerSceneView({ scene, local, still }: { scene: ExplainerScene; local: FilmSceneTime; still: boolean }) {
  const { spec, renderPicture } = useExplainer("Explainer");
  const enter = entrance(local, still);
  const picture = (src: string, alt: string, className: string): ReactNode =>
    renderPicture ? (
      renderPicture({ src, alt, className })
    ) : (
      // eslint-disable-next-line @next/next/no-img-element -- The library is not tied to one framework: the default is the plain element, and `renderPicture` takes the framework's image component.
      <img src={src} alt={alt} className={className} draggable={false} />
    );
  const heading = (text: string | undefined): ReactNode =>
    text ? (
      <h3 className="text-lg font-medium @2xl:text-2xl" style={enter}>
        {text}
      </h3>
    ) : null;

  switch (scene.kind) {
    case "title":
      return (
        <div data-slot="explainer-title" className="flex h-full flex-col items-center justify-center gap-3 bg-background p-[6cqi] text-center" style={enter}>
          <h2 className="text-2xl font-medium @xl:text-4xl @4xl:text-6xl">{scene.title}</h2>
          {scene.subtitle ? <p className="text-base text-muted-foreground @xl:text-xl">{scene.subtitle}</p> : null}
        </div>
      );
    case "quote":
      return (
        <figure data-slot="explainer-quote" className="m-0 flex h-full flex-col justify-center gap-4 bg-background p-[8cqi]" style={enter}>
          <blockquote className="text-xl @xl:text-3xl @4xl:text-4xl" dir="auto">
            “{scene.text}”
          </blockquote>
          {scene.attribution ? <figcaption className="text-sm text-muted-foreground @xl:text-base">{scene.attribution}</figcaption> : null}
        </figure>
      );
    case "caption":
      return (
        <div data-slot="explainer-caption" className="relative flex h-full items-end bg-background">
          {scene.picture ? picture(scene.picture.src, scene.picture.alt, "absolute inset-0 size-full object-cover") : null}
          <p className="relative m-[4cqi] max-w-[70cqi] rounded-surface border bg-background px-4 py-3 text-base @xl:text-xl" style={enter} dir="auto">
            {scene.text}
          </p>
        </div>
      );
    case "chart": {
      const Chart = CHARTS[scene.chart];
      const props = { ...scene.props, label: typeof scene.props["label"] === "string" ? scene.props["label"] : (scene.title ?? scene.chart) };
      // The chart is wider than the frame so that it fits under the title.
      const aspect = (spec.aspect ?? 16 / 9) * (scene.title ? 1.3 : 1.12);
      return (
        <div data-slot="explainer-chart" className="flex h-full flex-col gap-2 bg-background px-[4cqi] pb-[3cqi] pt-[7cqi]">
          {heading(scene.title)}
          <div className="min-h-0 flex-1 overflow-hidden" style={{ opacity: enter.opacity }}>
            <Chart aspect={aspect} {...props} />
          </div>
        </div>
      );
    }
    case "map": {
      const from: GeoView = scene.camera?.from ?? { k: 1, x: 0, y: 0 };
      const to: GeoView = scene.camera?.to ?? from;
      const t = still ? 1 : smooth(local.progress);
      const view: GeoView = { k: from.k + (to.k - from.k) * t, x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      const geojson = scene.geojson as unknown as ComponentProps<typeof GeoFeatures>["data"];
      return (
        <div data-slot="explainer-map" className="flex h-full flex-col bg-background">
          {scene.title ? <div className="px-[4cqi] pt-[6cqi]">{heading(scene.title)}</div> : null}
          <GeoMap
            label={scene.label}
            fit={geojson}
            projection={scene.projection ?? "equal-earth"}
            rotate={scene.rotate}
            view={view}
            minZoom={1}
            maxZoom={64}
            wheel="never"
            showControls={false}
            className="min-h-0 flex-1 rounded-none border-0"
            style={{ aspectRatio: "auto" }}
            locale={spec.lang}
          >
            <GeoFeatures data={geojson} />
            {(scene.layers ?? []).map((layer, index) => {
              if (layer.type === "choropleth") {
                const features: readonly { properties?: Record<string, unknown> | null }[] = scene.geojson.features ?? [];
                const values = features.map((feature) => {
                  const value = feature.properties?.[layer.valueProperty];
                  return typeof value === "number" ? value : null;
                });
                return (
                  <Choropleth
                    key={index}
                    label={layer.label}
                    data={geojson as ComponentProps<typeof Choropleth>["data"]}
                    value={(feature) => {
                      const value = feature.properties?.[layer.valueProperty];
                      return typeof value === "number" ? value : null;
                    }}
                    name={(feature) => String(feature.properties?.[layer.nameProperty] ?? "")}
                    scale={choroplethScale(values, layer.thresholds ? { thresholds: layer.thresholds } : {})}
                    valueLabel={layer.valueLabel}
                  />
                );
              }
              if (layer.type === "markers") return <GeoMarkers key={index} label={layer.label} points={layer.points} variant={layer.variant} valueLabel={layer.valueLabel} />;
              if (layer.type === "routes") return <GeoRoutes key={index} label={layer.label} routes={layer.routes} variant={layer.variant} valueLabel={layer.valueLabel} />;
              return <GeoHexbin key={index} label={layer.label} points={layer.points} valueLabel={layer.valueLabel} />;
            })}
          </GeoMap>
        </div>
      );
    }
    case "model":
      return (
        <div data-slot="explainer-model" className="flex h-full flex-col bg-background">
          {scene.title ? <div className="px-[4cqi] pt-[6cqi]">{heading(scene.title)}</div> : null}
          <ModelViewer
            src={scene.src}
            alt={scene.alt}
            poster={scene.poster}
            view={{ azimuth: (still ? 1 : local.progress) * (scene.turn ?? 60), polar: 15, zoom: 1 }}
            className="min-h-0 flex-1 rounded-none border-0"
            aspect="auto"
          />
        </div>
      );
    case "compare": {
      const [start, end] = scene.sweep ?? [100, 0];
      const split = still ? end : start + (end - start) * smooth(local.progress);
      return (
        <CompareSlider data-slot="explainer-compare" value={split} labels={{ first: scene.before.label, second: scene.after.label }} aria-label={scene.label} className="h-full rounded-none border-0">
          <CompareSliderFirst>{picture(scene.before.src, scene.before.alt, "size-full object-cover")}</CompareSliderFirst>
          <CompareSliderSecond>{picture(scene.after.src, scene.after.alt, "size-full object-cover")}</CompareSliderSecond>
          <CompareSliderLabels side="bottom" />
        </CompareSlider>
      );
    }
  }
}
