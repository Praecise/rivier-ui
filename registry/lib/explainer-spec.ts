/**
 * @name explainer-spec
 * @category lib
 * @description The plain-data description of an explainer film (scenes of a title, a chart, a map, a 3D model, a then-and-now comparison, a quote or a caption, each with a length, a transition, captions, a narration cue and a provenance label) and a validator that lists every fault in words.
 * @when An assistant or a project writes a film as JSON and hands it to motion/explainer. Run validateExplainer first and show its faults: each says where the fault is and how to mend it. For a film drawn by hand from React, use film-stage directly.
 * @example
 * const spec: ExplainerSpec = {
 *   title: "How the river rose",
 *   lang: "en",
 *   scenes: [
 *     { id: "intro", kind: "title", duration: 4, title: "How the river rose", subtitle: "Spring 2026" },
 *     {
 *       id: "levels", kind: "chart", duration: 8, chart: "line-chart",
 *       props: { label: "Water level by day", data: [{ day: 1, level: 2.1 }, { day: 2, level: 2.9 }], x: "day", series: [{ key: "level", label: "Level (m)" }] },
 *       captions: [{ start: 0.5, end: 4, text: "The level rose for four days." }],
 *       provenance: { kind: "measured", note: "Gauge readings" },
 *     },
 *   ],
 * };
 * const faults = validateExplainer(spec); // [] when it is sound
 */

/** What a scene shows, by how it was made. Each is said in words on the scene, never left to guess. */
export type ExplainerProvenanceKind = "measured" | "reconstructed" | "generated" | "invented";

export const EXPLAINER_PROVENANCE_KINDS: readonly ExplainerProvenanceKind[] = ["measured", "reconstructed", "generated", "invented"];

export type ExplainerProvenance = {
  kind: ExplainerProvenanceKind;
  /** A few words more: "Gauge readings, hourly", "Drawn from the 1890 survey". */
  note?: string;
  /** Where it came from, one line each. Shown in the label's popover. */
  sources?: readonly string[];
};

/** A line of captions, in seconds from the start of its scene. */
export type ExplainerCaption = { start: number; end: number; text: string };

/** A sound for the scene: a narrated line, in seconds from the start of the scene. */
export type ExplainerNarration = {
  src: string;
  /** When it starts within the scene. Default 0. */
  start?: number;
  /** How long it plays. Default: to its end. */
  duration?: number;
  /** 0 to 1. Default 1. */
  volume?: number;
};

export type ExplainerTransition = "cut" | "crossfade";

/** What every scene has. */
export type ExplainerSceneBase = {
  /** Unique within the film: letters, digits and dashes. */
  id: string;
  /** Its length in seconds, above 0. */
  duration: number;
  /** Its name in the scene strip and the time bar. Default: the scene's title or kind. */
  label?: string;
  /** How it arrives. Default: the film's `transition`. */
  transition?: ExplainerTransition;
  captions?: readonly ExplainerCaption[];
  narration?: ExplainerNarration;
  /** How what it shows was made. Charts, maps, models and comparisons should always say. */
  provenance?: ExplainerProvenance;
};

/** The charts a chart scene can draw, by their registry names. */
export const EXPLAINER_CHARTS = [
  "line-chart",
  "area-chart",
  "bar-chart",
  "donut-chart",
  "heatmap",
  "scatter-chart",
  "histogram",
  "box-plot",
  "fan-chart",
  "small-multiples",
  "treemap",
  "sunburst",
  "circle-pack",
  "sankey-chart",
  "network-graph",
  "calendar-heatmap",
  "gantt-chart",
  "density-chart",
  "radar-chart",
  "waterfall-chart",
  "funnel-chart",
  "bullet-chart",
  "candlestick-chart",
  "chord-diagram",
  "parallel-coordinates",
  "dot-plot",
  "stream-chart",
  "slope-chart",
] as const;
export type ExplainerChart = (typeof EXPLAINER_CHARTS)[number];

/** The props each chart cannot do without, beyond `label`. */
const CHART_NEEDS: Record<ExplainerChart, readonly string[]> = {
  "line-chart": ["data", "x", "series"],
  "area-chart": ["data", "x", "series"],
  "bar-chart": ["data", "x", "series"],
  "donut-chart": ["data"],
  heatmap: ["data", "x", "y", "value"],
  "scatter-chart": ["data", "x", "y"],
  histogram: ["data", "value"],
  "box-plot": ["data", "group", "value"],
  "fan-chart": ["data", "x", "median", "intervals"],
  "small-multiples": ["data", "facet", "x", "y"],
  treemap: ["data"],
  sunburst: ["data"],
  "circle-pack": ["data"],
  "sankey-chart": ["nodes", "links"],
  "network-graph": ["nodes", "links"],
  "calendar-heatmap": ["data", "day", "value"],
  "gantt-chart": ["tasks"],
  "density-chart": ["data", "x", "y"],
  "radar-chart": ["data", "axis", "series"],
  "waterfall-chart": ["data", "x", "value"],
  "funnel-chart": ["data", "x", "value"],
  "bullet-chart": ["items"],
  "candlestick-chart": ["data", "x"],
  "chord-diagram": ["names", "matrix"],
  "parallel-coordinates": ["data", "dimensions"],
  "dot-plot": ["data", "y", "series"],
  "stream-chart": ["data", "x", "series"],
  "slope-chart": ["data", "name", "from", "to", "fromLabel", "toLabel"],
};

/** A map's view, as geo-map's: `k` the zoom (1 fitted), `x` and `y` a shift in pixels. */
export type ExplainerMapView = { k: number; x: number; y: number };

/** A GeoJSON FeatureCollection, as plain data. */
export type ExplainerGeoJson = { type: "FeatureCollection"; features: readonly { type: "Feature"; id?: string | number; properties?: Record<string, unknown> | null; geometry: unknown }[] };

export type ExplainerMapLayer =
  | {
      type: "choropleth";
      /** The layer's name: "Rainfall by district". */
      label: string;
      /** The feature property holding each region's number, and the one holding its name. */
      valueProperty: string;
      nameProperty: string;
      /** Class edges, low to high. Left out, one hue from low to high. */
      thresholds?: readonly number[];
      valueLabel?: string;
    }
  | { type: "markers"; label: string; points: readonly { id: string; name: string; lon: number; lat: number; value?: number; group?: string }[]; variant?: "point" | "bubble"; valueLabel?: string }
  | {
      type: "routes";
      label: string;
      routes: readonly { id: string; name: string; from: [number, number]; to: [number, number]; value?: number }[];
      variant?: "great-circle" | "arc";
      valueLabel?: string;
    }
  | { type: "hexbin"; label: string; points: readonly { lon: number; lat: number; weight?: number }[]; valueLabel?: string };

export const EXPLAINER_PROJECTIONS = ["equal-earth", "natural-earth", "mercator", "equirectangular", "orthographic", "conic-equal-area", "azimuthal-equal-area", "transverse-mercator"] as const;

export type ExplainerPicture = { src: string; alt: string };

export type ExplainerScene = ExplainerSceneBase &
  (
    | { kind: "title"; title: string; subtitle?: string }
    | { kind: "chart"; chart: ExplainerChart; props: Record<string, unknown>; title?: string }
    | {
        kind: "map";
        geojson: ExplainerGeoJson;
        projection?: (typeof EXPLAINER_PROJECTIONS)[number];
        /** Turns the globe before projecting: [longitude, latitude]. */
        rotate?: [number, number];
        layers?: readonly ExplainerMapLayer[];
        /** The view at the start and at the end: the map moves between them over the scene. */
        camera?: { from?: ExplainerMapView; to?: ExplainerMapView };
        /** The map's name for screen readers. */
        label: string;
        title?: string;
      }
    | {
        kind: "model";
        /** A glTF, GLB or Gaussian splat file. */
        src: string;
        alt: string;
        poster?: string;
        /** How far the model turns over the scene, in degrees. Default 60. */
        turn?: number;
        title?: string;
      }
    | {
        kind: "compare";
        before: ExplainerPicture & { label: string };
        after: ExplainerPicture & { label: string };
        /** The divider's position at the start and the end of the scene, 0 to 100. Default [100, 0]. */
        sweep?: [number, number];
        /** What is compared, for screen readers. */
        label: string;
      }
    | { kind: "quote"; text: string; attribution?: string }
    | { kind: "caption"; text: string; picture?: ExplainerPicture }
  );

export type ExplainerKind = ExplainerScene["kind"];
export const EXPLAINER_KINDS: readonly ExplainerKind[] = ["title", "chart", "map", "model", "compare", "quote", "caption"];

/** A sound under the whole film, from its start. */
export type ExplainerBed = { src: string; volume?: number };

export type ExplainerSpec = {
  /** The film's name: the stage is named by it. */
  title: string;
  /** The language of the captions and words (BCP 47): "en", "nb", "ar". Default "en". */
  lang?: string;
  /** Width / height of the frame. Default 16 / 9. */
  aspect?: number;
  /** How scenes arrive unless they say otherwise. Default "crossfade". */
  transition?: ExplainerTransition;
  scenes: readonly ExplainerScene[];
  bed?: ExplainerBed;
};

/** One fault: where it is (a path into the spec) and what is wrong, in words that say how to mend it. */
export type ExplainerFault = { path: string; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const list = (items: readonly string[]): string => items.map((item) => `"${item}"`).join(", ");

/** The longest scene the validator accepts, in seconds: a longer one is nearly always a unit mistake (milliseconds). */
export const EXPLAINER_MAX_SCENE = 600;

/**
 * Checks a spec, which may have come from anywhere (JSON written by an assistant), and returns every fault
 * found, in order. An empty list means the explainer component can play it. Unknown keys are allowed.
 */
export function validateExplainer(input: unknown): ExplainerFault[] {
  const faults: ExplainerFault[] = [];
  const fault = (path: string, message: string): void => {
    faults.push({ path, message });
  };
  if (!isRecord(input)) {
    fault("", "The spec must be an object with a title and a list of scenes.");
    return faults;
  }
  if (!isText(input["title"])) fault("title", "Give the film a title: a string of words, used as its name.");
  if (input["lang"] !== undefined && (!isText(input["lang"]) || !/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(input["lang"])))
    fault("lang", 'lang must be a language tag such as "en", "nb" or "pt-BR".');
  if (input["aspect"] !== undefined && (!isNumber(input["aspect"]) || input["aspect"] <= 0.2 || input["aspect"] > 5))
    fault("aspect", "aspect must be width divided by height, a number such as 1.78 (16 / 9) or 1 (square).");
  if (input["transition"] !== undefined && input["transition"] !== "cut" && input["transition"] !== "crossfade") fault("transition", 'transition must be "cut" or "crossfade".');
  const bed = input["bed"];
  if (bed !== undefined && (!isRecord(bed) || !isText(bed["src"]))) fault("bed", "bed must be an object with src, the address of a sound file.");
  const scenes = input["scenes"];
  if (!Array.isArray(scenes) || scenes.length === 0) {
    fault("scenes", "scenes must be a list with at least one scene.");
    return faults;
  }
  const seen = new Set<string>();
  scenes.forEach((scene: unknown, index) => {
    const at = `scenes[${index}]`;
    const name = `Scene ${index + 1}`;
    if (!isRecord(scene)) {
      fault(at, `${name} must be an object.`);
      return;
    }
    const id = scene["id"];
    const named = isText(id) ? `${name} ("${id}")` : name;
    if (!isText(id) || !/^[a-zA-Z0-9][\w-]*$/.test(id)) fault(`${at}.id`, `${name} needs an id: letters, digits and dashes, such as "intro".`);
    else if (seen.has(id)) fault(`${at}.id`, `${named} has the same id as an earlier scene; ids must be unique.`);
    else seen.add(id);
    const duration = scene["duration"];
    const length = isNumber(duration) ? duration : 0;
    if (!isNumber(duration) || duration <= 0) fault(`${at}.duration`, `${named} needs a duration: a number of seconds above 0.`);
    else if (duration > EXPLAINER_MAX_SCENE) fault(`${at}.duration`, `${named} lasts ${duration} seconds. Durations are in seconds, not milliseconds; keep a scene under ${EXPLAINER_MAX_SCENE}.`);
    if (scene["transition"] !== undefined && scene["transition"] !== "cut" && scene["transition"] !== "crossfade") fault(`${at}.transition`, `${named}: transition must be "cut" or "crossfade".`);
    if (scene["label"] !== undefined && !isText(scene["label"])) fault(`${at}.label`, `${named}: label must be a few words.`);

    const captions = scene["captions"];
    if (captions !== undefined) {
      if (!Array.isArray(captions)) fault(`${at}.captions`, `${named}: captions must be a list of { start, end, text }.`);
      else
        captions.forEach((cue: unknown, c) => {
          const cueAt = `${at}.captions[${c}]`;
          if (!isRecord(cue) || !isText(cue["text"]) || !isNumber(cue["start"]) || !isNumber(cue["end"])) {
            fault(cueAt, `${named}, caption ${c + 1}: give start and end in seconds and the text.`);
            return;
          }
          if (cue["start"] < 0 || cue["end"] <= cue["start"]) fault(cueAt, `${named}, caption ${c + 1}: end must come after start, and start must not be below 0.`);
          else if (length > 0 && cue["start"] >= length)
            fault(cueAt, `${named}, caption ${c + 1} starts at ${cue["start"]} s, after the scene ends at ${length} s. Caption times are counted from the start of their scene.`);
        });
    }
    const narration = scene["narration"];
    if (narration !== undefined) {
      if (!isRecord(narration) || !isText(narration["src"])) fault(`${at}.narration`, `${named}: narration needs src, the address of the sound file.`);
      else {
        const start = narration["start"];
        if (start !== undefined && (!isNumber(start) || start < 0 || (length > 0 && start >= length)))
          fault(`${at}.narration.start`, `${named}: narration start must be a number of seconds within the scene (0 to ${length}).`);
        const volume = narration["volume"];
        if (volume !== undefined && (!isNumber(volume) || volume < 0 || volume > 1)) fault(`${at}.narration.volume`, `${named}: narration volume must be between 0 and 1.`);
      }
    }
    const provenance = scene["provenance"];
    const kind = scene["kind"];
    if (provenance !== undefined) {
      if (!isRecord(provenance) || !EXPLAINER_PROVENANCE_KINDS.includes(provenance["kind"] as ExplainerProvenanceKind))
        fault(`${at}.provenance`, `${named}: provenance.kind must be one of ${list(EXPLAINER_PROVENANCE_KINDS)}.`);
      else if (provenance["sources"] !== undefined && (!Array.isArray(provenance["sources"]) || !provenance["sources"].every(isText)))
        fault(`${at}.provenance.sources`, `${named}: sources must be a list of lines of text.`);
    } else if (kind === "chart" || kind === "map" || kind === "model" || kind === "compare") {
      fault(`${at}.provenance`, `${named} shows a ${kind} but does not say how it was made: add provenance with kind ${list(EXPLAINER_PROVENANCE_KINDS)}.`);
    }

    switch (kind) {
      case "title":
        if (!isText(scene["title"])) fault(`${at}.title`, `${named} is a title scene: give it a title.`);
        break;
      case "quote":
        if (!isText(scene["text"])) fault(`${at}.text`, `${named} is a quote: give the words as text.`);
        break;
      case "caption": {
        if (!isText(scene["text"])) fault(`${at}.text`, `${named} is a caption: give the words as text.`);
        const picture = scene["picture"];
        if (picture !== undefined && (!isRecord(picture) || !isText(picture["src"]) || typeof picture["alt"] !== "string"))
          fault(`${at}.picture`, `${named}: picture needs src and alt (alt may be "" for a picture that only decorates).`);
        break;
      }
      case "chart": {
        const chart = scene["chart"];
        if (!EXPLAINER_CHARTS.includes(chart as ExplainerChart)) {
          fault(`${at}.chart`, `${named}: chart must be one of ${list(EXPLAINER_CHARTS)}.`);
          break;
        }
        const props = scene["props"];
        if (!isRecord(props)) {
          fault(`${at}.props`, `${named}: props must be an object with the chart's data and keys.`);
          break;
        }
        if (!isText(props["label"]) && !isText(props["title"]) && !isText(scene["title"])) fault(`${at}.props.label`, `${named}: give the chart a label, what it shows in words, for screen readers.`);
        for (const need of CHART_NEEDS[chart as ExplainerChart]) {
          if (props[need] === undefined || props[need] === null) fault(`${at}.props.${need}`, `${named}: a ${String(chart)} needs ${need}.`);
        }
        if (props["data"] !== undefined && chart !== "treemap" && chart !== "sunburst" && chart !== "circle-pack" && !Array.isArray(props["data"]))
          fault(`${at}.props.data`, `${named}: data must be a list of rows.`);
        break;
      }
      case "map": {
        if (!isText(scene["label"])) fault(`${at}.label`, `${named} is a map: give it a label, what it shows, for screen readers.`);
        const geojson = scene["geojson"];
        if (!isRecord(geojson) || geojson["type"] !== "FeatureCollection" || !Array.isArray(geojson["features"]))
          fault(`${at}.geojson`, `${named}: geojson must be a GeoJSON FeatureCollection with a features list.`);
        if (scene["projection"] !== undefined && !EXPLAINER_PROJECTIONS.includes(scene["projection"] as (typeof EXPLAINER_PROJECTIONS)[number]))
          fault(`${at}.projection`, `${named}: projection must be one of ${list(EXPLAINER_PROJECTIONS)}.`);
        const camera = scene["camera"];
        if (camera !== undefined) {
          const views = isRecord(camera) ? [camera["from"], camera["to"]] : [null];
          if (!views.every((view) => view === undefined || (isRecord(view) && isNumber(view["k"]) && view["k"] >= 1 && isNumber(view["x"]) && isNumber(view["y"]))))
            fault(`${at}.camera`, `${named}: camera.from and camera.to must be views { k, x, y } with k (the zoom) 1 or more.`);
        }
        const layers = scene["layers"];
        if (layers !== undefined && !Array.isArray(layers)) fault(`${at}.layers`, `${named}: layers must be a list.`);
        else
          (layers ?? []).forEach((layer: unknown, l: number) => {
            const layerAt = `${at}.layers[${l}]`;
            if (!isRecord(layer) || !["choropleth", "markers", "routes", "hexbin"].includes(String(layer["type"]))) {
              fault(layerAt, `${named}, layer ${l + 1}: type must be "choropleth", "markers", "routes" or "hexbin".`);
              return;
            }
            if (!isText(layer["label"])) fault(`${layerAt}.label`, `${named}, layer ${l + 1}: give it a label for screen readers.`);
            if (layer["type"] === "choropleth" && (!isText(layer["valueProperty"]) || !isText(layer["nameProperty"])))
              fault(layerAt, `${named}, layer ${l + 1}: a choropleth needs valueProperty and nameProperty, the feature properties holding each region's number and name.`);
            if ((layer["type"] === "markers" || layer["type"] === "hexbin") && !Array.isArray(layer["points"]))
              fault(`${layerAt}.points`, `${named}, layer ${l + 1}: points must be a list of { lon, lat }.`);
            if (layer["type"] === "routes" && !Array.isArray(layer["routes"])) fault(`${layerAt}.routes`, `${named}, layer ${l + 1}: routes must be a list of { id, name, from, to }.`);
          });
        break;
      }
      case "model":
        if (!isText(scene["src"])) fault(`${at}.src`, `${named} is a model: give src, the address of a .glb, .gltf or splat file.`);
        if (!isText(scene["alt"])) fault(`${at}.alt`, `${named}: give alt, what the model shows in words.`);
        if (scene["turn"] !== undefined && !isNumber(scene["turn"])) fault(`${at}.turn`, `${named}: turn must be a number of degrees.`);
        break;
      case "compare": {
        if (!isText(scene["label"])) fault(`${at}.label`, `${named} is a comparison: give it a label, what is compared.`);
        for (const side of ["before", "after"] as const) {
          const picture = scene[side];
          if (!isRecord(picture) || !isText(picture["src"]) || !isText(picture["alt"]) || !isText(picture["label"]))
            fault(`${at}.${side}`, `${named}: ${side} needs src, alt (what it shows) and label (its name, such as a year).`);
        }
        const sweep = scene["sweep"];
        if (sweep !== undefined && (!Array.isArray(sweep) || sweep.length !== 2 || !sweep.every((value) => isNumber(value) && value >= 0 && value <= 100)))
          fault(`${at}.sweep`, `${named}: sweep must be two numbers from 0 to 100, the divider at the start and at the end.`);
        break;
      }
      default:
        fault(`${at}.kind`, `${named}: kind must be one of ${list(EXPLAINER_KINDS)}.`);
    }
  });
  return faults;
}

/** Where each scene starts and ends in the film, in seconds, and the film's length. */
export function explainerTimeline(spec: Pick<ExplainerSpec, "scenes">): { scenes: { id: string; start: number; end: number }[]; duration: number } {
  let at = 0;
  const scenes = spec.scenes.map((scene) => {
    const start = at;
    at += Math.max(0, scene.duration);
    return { id: scene.id, start, end: at };
  });
  return { scenes, duration: at };
}

/** Every scene's captions on the film's clock: what captions and a transcript take. */
export function explainerCues(spec: Pick<ExplainerSpec, "scenes">): { start: number; end: number; text: string }[] {
  const { scenes } = explainerTimeline(spec);
  return spec.scenes.flatMap((scene, index) => {
    const start = scenes[index]?.start ?? 0;
    return (scene.captions ?? []).map((cue) => ({ start: start + cue.start, end: start + Math.min(cue.end, scene.duration), text: cue.text }));
  });
}
