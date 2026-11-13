"use client";
/**
 * @name model-viewer
 * @category three
 * @description Shows one 3D model that a person can turn, zoom and reset: a glTF or GLB file, or Gaussian splats (.spz, .ply, .splat, .ksplat, .sog), with a poster and progress while it loads and a still fallback where 3D cannot run.
 * @when A file to look at from every side: an object, a product, a scanned place. It is a whole viewer, not a part of scene: for your own meshes inside a react-three-fiber canvas use scene with model-stage. Nothing heavy is in this file: three.js is fetched when the viewer comes near the screen, its glTF loader only for glTF, and Spark (`@sparkjsdev/spark`, installed with this item) only when the file is splats. glTF that carries splats in an extension is not read (Spark has no glTF loader); Draco, Meshopt and KTX2 compression need their decoders set in `configureLoader`. Plain wheel and vertical swipes scroll the page: zoom is pinch, Ctrl with the wheel, the keys or the buttons. To compare two models, give two viewers the same `view` and `bounds` inside compare-slider, with `children={null}` and buttons of your own that change the shared view.
 * @example
 * <ModelViewer src="/models/vase.glb" alt="A clay vase with a painted belt" poster="/models/vase.jpg" />
 *
 * // Splats, turning by itself (never under reduced motion), with a hand-off to AR on phones
 * <ModelViewer
 *   src="/models/courtyard.spz"
 *   alt="The courtyard, scanned in 2026"
 *   autoRotate
 *   rotation={[180, 0, 0]}
 *   ar={{ usdz: "/models/courtyard.usdz", glb: "https://example.com/models/courtyard.glb" }}
 * />
 *
 * // Two viewers, one camera
 * const [view, setView] = useState<ModelView>({ azimuth: 0, polar: 15, zoom: 1 });
 * const frame = { center: [0, 4, 0], radius: 9 } as const; // one sphere for both, so they keep their sizes and line up
 * <ModelViewer src="/models/then.glb" alt="As built" view={view} onViewChange={setView} bounds={frame} />
 * <ModelViewer src="/models/now.glb" alt="Today" view={view} onViewChange={setView} bounds={frame} />
 */
import { ArrowLeft, ArrowRight, Box, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import {
  createContext,
  use,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import type { Object3D } from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Progress } from "@/components/ui/progress";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

/** Where the model is seen from. Plain numbers, so two viewers can share one. */
export type ModelView = {
  /** How far the model is turned to the right, in degrees (-180 to 180). 0 is its front. */
  azimuth: number;
  /** How far above its middle it is seen from, in degrees. 0 is level; 90 looks straight down. */
  polar: number;
  /** 1 fits the whole model in the frame; 2 is twice as close. */
  zoom: number;
};

/** A sphere in the file's own units (after `rotation`): what the viewer fits to its frame. */
export type ModelBounds = { center: readonly [number, number, number]; radius: number };

export type ModelKind = "gltf" | "splat";
export type ModelViewerStatus = "idle" | "loading" | "ready" | "error" | "unsupported";

export type ModelViewerLabels = {
  /** What kind of thing the viewer is, said after its name ("3D model"). */
  roledescription: string;
  /** How to use it from the keyboard, read after its name. */
  instructions: string;
  /** The name of the group of buttons. */
  controls: string;
  turnLeft: string;
  turnRight: string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  stopTurning: string;
  startTurning: string;
  /** The name of the progress bar. */
  loading: string;
  /** Shown when the file cannot be fetched or read. */
  failed: string;
  /** Shown when the browser has no WebGL 2. */
  unsupported: string;
  /** The button that opens the model in the phone's AR viewer. */
  ar: string;
  /** What is announced after a key or a button changes the view. Return "" to say nothing. */
  view: (view: ModelView, locale: string | undefined) => string;
};

const describeView = (view: ModelView, locale: string | undefined): string => {
  const degrees = new Intl.NumberFormat(locale, { style: "unit", unit: "degree", unitDisplay: "long", maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const turn = view.azimuth === 0 ? "Front" : `Turned ${degrees.format(Math.abs(view.azimuth))} to the ${view.azimuth > 0 ? "right" : "left"}`;
  const height = view.polar === 0 ? "level" : `from ${degrees.format(Math.abs(view.polar))} ${view.polar > 0 ? "above" : "below"}`;
  return `${turn}, ${height}, zoom ${percent.format(view.zoom)}`;
};

const DEFAULT_LABELS: ModelViewerLabels = {
  roledescription: "3D model",
  instructions: "Arrow keys turn the model, plus and minus zoom, Home resets the view.",
  controls: "View",
  turnLeft: "Turn left",
  turnRight: "Turn right",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  reset: "Reset the view",
  stopTurning: "Stop turning",
  startTurning: "Start turning",
  loading: "Loading the 3D model",
  failed: "The 3D model could not be loaded.",
  unsupported: "This browser cannot show 3D here.",
  ar: "View in your space",
  view: describeView,
};

/** What the phone's own AR viewer is given. Each is used only on the platform that reads it. */
export type ModelViewerAr = {
  /** A USDZ file, for AR Quick Look on iPhone and iPad. */
  usdz?: string;
  /** A GLB file at an absolute https address, for Scene Viewer on Android. Left out, `src` is used when it is glTF. */
  glb?: string;
  /** The name Scene Viewer shows. */
  title?: string;
};

export type ModelViewerHandle = {
  /** Back to the starting view. */
  reset: () => void;
  /** Draws a frame and returns it as a PNG data address (for a poster), or null before the model is ready. */
  snapshot: () => string | null;
};

const SPLAT_FILE = /\.(spz|ply|splat|ksplat|sog)(?:[?#]|$)/i;

/** What a file is, from its name: splats for .spz, .ply, .splat, .ksplat and .sog, glTF for everything else. */
export function modelKindOf(src: string): ModelKind {
  return SPLAT_FILE.test(src) ? "splat" : "gltf";
}

const DEFAULT_VIEW: ModelView = { azimuth: 0, polar: 15, zoom: 1 };
const TURN_STEP = 15;
const TILT_STEP = 10;
const ZOOM_STEP = 1.25;
/** The camera's vertical field of view, in degrees. */
const FIELD = 35;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
/** Any angle as the same direction between -180 (not included) and 180. */
const wrap = (degrees: number): number => {
  const turned = (((degrees + 180) % 360) + 360) % 360;
  return turned === 0 ? 180 : turned - 180;
};

// ---- What the browser can do, read without an effect so nothing is set during one.

const never = (): (() => void) => () => {};
let webgl2: boolean | undefined;

function hasWebGL2(): boolean {
  if (webgl2 !== undefined) return webgl2;
  try {
    const context = document.createElement("canvas").getContext("webgl2");
    webgl2 = context !== null;
    // Give the probe's context back at once: browsers allow only a few.
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2 = false;
  }
  return webgl2;
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const subscribeTab = (onChange: () => void): (() => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

type ArPlatform = "quicklook" | "sceneviewer" | "none";
let arPlatform: ArPlatform | undefined;

/** AR Quick Look is announced by the browser itself (`rel="ar"`); Scene Viewer is an Android app reached by an intent address. */
function readArPlatform(): ArPlatform {
  if (arPlatform !== undefined) return arPlatform;
  if (document.createElement("a").relList.supports("ar")) arPlatform = "quicklook";
  else if (/android/i.test(navigator.userAgent)) arPlatform = "sceneviewer";
  else arPlatform = "none";
  return arPlatform;
}

// ---- The engine: plain three.js, made after the heavy code has been fetched. Nothing here runs on the server.

type Engine = {
  /** The sphere that was fitted to the frame. */
  bounds: ModelBounds;
  setView: (view: ModelView) => void;
  /** Stops drawing while the viewer is off screen or the tab is hidden. */
  setActive: (active: boolean) => void;
  snapshot: () => string;
  dispose: () => void;
};

type EngineOptions = {
  host: HTMLElement;
  src: string;
  kind: ModelKind;
  rotation: readonly [number, number, number];
  bounds: ModelBounds | undefined;
  view: ModelView;
  active: boolean;
  onProgress: (fraction: number | null) => void;
  onLost: () => void;
  configureLoader: ((loader: GLTFLoader) => void) | undefined;
  /** Set when the viewer went away while the engine was still loading. */
  signal: { cancelled: boolean };
};

const fraction = (event: ProgressEvent): number | null => (event.lengthComputable && event.total > 0 ? Math.min(1, event.loaded / event.total) : null);

async function createEngine({ host, src, kind, rotation, bounds: given, view, active, onProgress, onLost, configureLoader, signal }: EngineOptions): Promise<Engine> {
  const THREE = await import("three");
  const cleanup: (() => void)[] = [];
  const dispose = (): void => {
    for (const step of cleanup.splice(0).reverse()) step();
  };
  const alive = (): void => {
    if (signal.cancelled) throw new Error("The viewer was removed while its model was loading.");
  };

  try {
    alive();
    // Its own canvas, made here: a canvas keeps one context for life, so a viewer that is set up twice
    // (a file change, a development re-mount) must not be handed a context that was already given back.
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    // Splats gain nothing from multisampling and draw much slower with it.
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: kind === "gltf", powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    host.append(canvas);
    cleanup.push(() => {
      canvas.removeEventListener("webglcontextlost", onLost);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    });
    canvas.addEventListener("webglcontextlost", onLost);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FIELD, 1, 0.05, 100);
    /** Scales and centres the model; the group inside it carries the `rotation` the project asked for. */
    const fit = new THREE.Group();
    const turned = new THREE.Group();
    turned.rotation.set(...(rotation.map((degrees) => (degrees * Math.PI) / 180) as [number, number, number]));
    fit.add(turned);
    scene.add(fit);

    let frame = 0;
    let running = active;
    let gone = false;
    const draw = (): void => {
      frame = 0;
      if (!gone && running) renderer.render(scene, camera);
    };
    const invalidate = (): void => {
      if (frame === 0 && running && !gone) frame = requestAnimationFrame(draw);
    };
    cleanup.push(() => {
      gone = true;
      cancelAnimationFrame(frame);
    });

    const bounds = new THREE.Box3();
    if (kind === "gltf") {
      const [{ GLTFLoader: Loader }, { RoomEnvironment }] = await Promise.all([import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/environments/RoomEnvironment.js")]);
      alive();
      const loader = new Loader();
      configureLoader?.(loader);
      const model = await new Promise<Object3D>((resolve, reject) => {
        loader.load(
          src,
          (gltf) => resolve(gltf.scene),
          (event) => onProgress(fraction(event)),
          (error) => reject(error instanceof Error ? error : new Error(`Could not load ${src}`)),
        );
      });
      cleanup.push(() => {
        model.traverse((node) => {
          const mesh = node as Partial<{ geometry: { dispose: () => void }; material: unknown }>;
          mesh.geometry?.dispose();
          for (const material of Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []) {
            for (const value of Object.values(material as Record<string, unknown>)) {
              if (value instanceof THREE.Texture) value.dispose();
            }
            (material as { dispose: () => void }).dispose();
          }
        });
      });
      alive();
      // An even, neutral room to be lit by: materials look as their author meant without any lights to place.
      const room = new RoomEnvironment();
      const prefilter = new THREE.PMREMGenerator(renderer);
      const light = prefilter.fromScene(room, 0.04);
      scene.environment = light.texture;
      renderer.toneMapping = THREE.NeutralToneMapping;
      room.dispose();
      prefilter.dispose();
      cleanup.push(() => light.dispose());
      turned.add(model);
      turned.updateMatrixWorld(true);
      bounds.setFromObject(turned);
    } else {
      const { SparkRenderer, SplatMesh } = await import("@sparkjsdev/spark");
      alive();
      // Spark sorts the splats off the main thread and says when a new order is ready to be drawn.
      const spark = new SparkRenderer({ renderer, onDirty: invalidate });
      scene.add(spark);
      const splats = new SplatMesh({ url: src, onProgress: (event) => onProgress(fraction(event)) });
      cleanup.push(() => {
        splats.dispose();
        spark.dispose();
      });
      await splats.initialized;
      alive();
      turned.add(splats);
      turned.updateMatrixWorld(true);
      bounds.copy(splats.getBoundingBox()).applyMatrix4(turned.matrixWorld);
    }
    if (bounds.isEmpty()) throw new Error(`${src} holds nothing to show.`);

    // Fit: the model's bounding sphere (or the one the project gave) becomes a sphere of radius 1 at the centre of the scene.
    const sphere = given ? new THREE.Sphere(new THREE.Vector3(...given.center), given.radius) : bounds.getBoundingSphere(new THREE.Sphere());
    const scale = sphere.radius > 0 ? 1 / sphere.radius : 1;
    fit.scale.setScalar(scale);
    fit.position.copy(sphere.center).multiplyScalar(-scale);

    let current = view;
    const place = (): void => {
      // The distance at which that sphere just fits the narrower of the frame's two angles of view.
      const vertical = (FIELD * Math.PI) / 180;
      const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
      const distance = (1.05 / Math.sin(Math.min(vertical, horizontal) / 2)) / current.zoom;
      // Turning the model to the right is the camera going round it to the left.
      const around = (-current.azimuth * Math.PI) / 180;
      const above = (current.polar * Math.PI) / 180;
      camera.position.set(Math.sin(around) * Math.cos(above) * distance, Math.sin(above) * distance, Math.cos(around) * Math.cos(above) * distance);
      camera.lookAt(0, 0, 0);
      invalidate();
    };
    const resize = (): void => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      place();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    cleanup.push(() => observer.disconnect());
    resize();
    // The first frame is drawn before the viewer says it is ready, so the poster is never swapped for nothing.
    renderer.render(scene, camera);

    return {
      bounds: { center: [sphere.center.x, sphere.center.y, sphere.center.z], radius: sphere.radius },
      setView(next) {
        current = next;
        place();
      },
      setActive(next) {
        running = next;
        if (next) invalidate();
      },
      snapshot() {
        renderer.render(scene, camera);
        return canvas.toDataURL("image/png");
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

// ---- The component.

type ModelViewerContextValue = {
  status: ModelViewerStatus;
  /** 0 to 1 while loading, or null when the amount is not known. */
  progress: number | null;
  view: ModelView;
  labels: ModelViewerLabels;
  /** Changes the view by a step, announces it, and stops the turning. */
  act: (change: (view: ModelView) => ModelView) => void;
  reset: () => void;
  autoRotate: boolean;
  turning: boolean;
  setTurning: (turning: boolean) => void;
  src: string;
  kind: ModelKind;
  ar: ModelViewerAr | undefined;
  poster: ReactNode;
};

const ModelViewerContext = createContext<ModelViewerContextValue | null>(null);

function useModelViewer(part: string): ModelViewerContextValue {
  const context = use(ModelViewerContext);
  if (!context) throw new Error(`<${part}> must be used inside <ModelViewer>.`);
  return context;
}

export type ModelViewerProps = Omit<ComponentProps<"div">, "children" | "onLoad" | "onError"> & {
  /** The address of the file. */
  src: string;
  /** What the file holds. Left out, it is read from the file's name. */
  format?: ModelKind;
  /** What the model is, in words: its name for assistive technology, and what stands for it where 3D cannot run. */
  alt: string;
  /** A still shown until the model has drawn, and instead of it when it cannot: an address, or an element that fills the frame. */
  poster?: string | ReactNode;
  /** The view: controlled. Give two viewers the same one to share a camera. */
  view?: ModelView;
  /** The starting view when uncontrolled, and where Home and the reset button return to. */
  defaultView?: ModelView;
  onViewChange?: (view: ModelView) => void;
  /** Turn by itself until the person touches it. Never under reduced motion; a button stops and starts it. */
  autoRotate?: boolean;
  /** Degrees per second when turning by itself. */
  rotateSpeed?: number;
  /** Turns the model before it is fitted, in degrees about x, y and z: splats trained with y pointing down need [180, 0, 0]. */
  rotation?: readonly [number, number, number];
  /** The sphere that is fitted to the frame, in the file's own units. Left out, it is the model's own. Give two viewers the same one so that two files of the same thing keep their sizes and line up (`onLoad` reports each file's own). */
  bounds?: ModelBounds;
  /** The lowest and highest the model can be seen from, in degrees. */
  polarRange?: readonly [number, number];
  /** The furthest and nearest zoom. */
  zoomRange?: readonly [number, number];
  /** Width / height, as a number (4 / 3) or a CSS ratio ("16 / 9"). "auto" fills the parent's height. */
  aspect?: number | string;
  /** Offer the phone's own AR viewer, where there is one: AR Quick Look (needs `usdz`) or Scene Viewer. */
  ar?: ModelViewerAr;
  /** Shown instead of the message when the model failed or 3D cannot run: a link to the file, a longer description. */
  fallback?: ReactNode;
  /** Sets up the glTF loader before it is used: decoders for Draco, Meshopt or KTX2, a path, headers. */
  configureLoader?: (loader: GLTFLoader) => void;
  /** Called once the model has drawn, with the sphere that was fitted to the frame. */
  onLoad?: (model: { bounds: ModelBounds }) => void;
  onError?: (error: unknown) => void;
  /** How far outside the viewport loading starts (an IntersectionObserver margin). */
  margin?: string;
  /** The language tag numbers are formatted for in announcements. */
  locale?: string;
  labels?: Partial<ModelViewerLabels>;
  /** `reset()` and `snapshot()`. */
  handleRef?: Ref<ModelViewerHandle>;
  /** What sits over the frame. Default: ModelViewerControls, and ModelViewerAr when `ar` is given. Pass null for none. */
  children?: ReactNode;
};

/**
 * The frame holds its shape from the first paint (`aspect`), shows the poster, and fetches the 3D code and
 * the file only when it comes near the screen. Once the model has drawn, the surface is one Tab stop: Left
 * and Right turn the model (the same way in every language: it is a picture of an object, not a line of
 * text), Up and Down raise and lower the viewpoint, plus and minus zoom, Home resets. Each key press is
 * announced. A drag turns it; a vertical swipe scrolls the page; pinch, or Ctrl with the wheel, zooms. The
 * buttons do all of it without dragging. Drawing stops while the viewer is off screen or the tab is hidden.
 */
export function ModelViewer({
  className,
  style,
  src,
  format,
  alt,
  poster,
  view: viewProp,
  defaultView = DEFAULT_VIEW,
  onViewChange,
  autoRotate = false,
  rotateSpeed = 20,
  rotation,
  bounds,
  polarRange,
  zoomRange,
  aspect = "4 / 3",
  ar,
  fallback,
  configureLoader,
  onLoad,
  onError,
  margin = "200px",
  locale,
  labels: labelsProp,
  handleRef,
  children,
  ...props
}: ModelViewerProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const kind = format ?? modelKindOf(src);
  const [minPolar, maxPolar] = polarRange ?? [-60, 85];
  const [minZoom, maxZoom] = zoomRange ?? [0.5, 4];
  const [rx, ry, rz] = rotation ?? [0, 0, 0];
  const instructions = useId();

  const supported = useSyncExternalStore(never, hasWebGL2, () => true);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  const tabVisible = useSyncExternalStore(
    subscribeTab,
    () => document.visibilityState !== "hidden",
    () => true,
  );

  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  const [seen, setSeen] = useState(false);
  const [turning, setTurning] = useState(true);
  /** What the engine last said about a file. Compared by key, so a new file is "loading" at once. */
  const [loaded, setLoaded] = useState<{ key: string; state: "ready" | "error" } | null>(null);
  const [amount, setAmount] = useState<{ key: string; value: number | null } | null>(null);
  const [view, setViewState] = useControllableState<ModelView>({ value: viewProp, defaultValue: defaultView, onChange: onViewChange });

  const [bx, by, bz] = bounds?.center ?? [0, 0, 0];
  const radius = bounds?.radius ?? 0;
  const key = `${kind}\n${src}\n${rx},${ry},${rz}\n${bx},${by},${bz},${radius}`;
  const status: ModelViewerStatus = !supported ? "unsupported" : !seen ? "idle" : loaded?.key === key ? loaded.state : "loading";
  const ready = status === "ready";
  const progress = status === "loading" && amount?.key === key ? amount.value : null;
  const drawing = near && tabVisible;
  const spinning = autoRotate && turning && !reduced && ready && drawing;

  const limit = (next: ModelView): ModelView => ({ azimuth: wrap(next.azimuth), polar: clamp(next.polar, minPolar, maxPolar), zoom: clamp(next.zoom, minZoom, maxZoom) });
  const setView = (next: ModelView): void => {
    const limited = limit(next);
    if (limited.azimuth === view.azimuth && limited.polar === view.polar && limited.zoom === view.zoom) return;
    setViewState(limited);
  };
  const act = (change: (current: ModelView) => ModelView): void => {
    const next = limit(change(view));
    setTurning(false);
    setView(next);
    const message = labels.view(next, locale);
    if (message) announce(message);
  };
  const reset = (): void => act(() => defaultView);

  const engine = useRef<Engine | null>(null);
  /** What effects and frames read: the newest props and state, without being set up again for each change. */
  const latest = useRef({ view, setView, drawing, configureLoader, onLoad, onError });
  useEffect(() => {
    latest.current = { view, setView, drawing, configureLoader, onLoad, onError };
  });

  useImperativeHandle(handleRef, () => ({ reset: () => latest.current.setView(defaultView), snapshot: () => engine.current?.snapshot() ?? null }), [defaultView]);

  useEffect(() => {
    if (!root) return;
    // Without IntersectionObserver the viewer cannot know where it is, so it counts as in view.
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => {
        setNear(true);
        setSeen(true);
      });
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const inside = entries.some((entry) => entry.isIntersecting);
        setNear(inside);
        if (inside) setSeen(true);
      },
      { rootMargin: margin },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [root, margin]);

  useEffect(() => {
    if (!host || !seen || !supported) return;
    const signal = { cancelled: false };
    let made: Engine | null = null;
    createEngine({
      host,
      src,
      kind,
      rotation: [rx, ry, rz],
      bounds: radius > 0 ? { center: [bx, by, bz], radius } : undefined,
      view: latest.current.view,
      active: latest.current.drawing,
      onProgress: (value) => setAmount({ key, value }),
      onLost: () => setLoaded({ key, state: "error" }),
      configureLoader: (loader) => latest.current.configureLoader?.(loader),
      signal,
    }).then(
      (next) => {
        if (signal.cancelled) {
          next.dispose();
          return;
        }
        made = next;
        engine.current = next;
        next.setView(latest.current.view);
        next.setActive(latest.current.drawing);
        setLoaded({ key, state: "ready" });
        latest.current.onLoad?.({ bounds: next.bounds });
      },
      (error: unknown) => {
        if (signal.cancelled) return;
        setLoaded({ key, state: "error" });
        latest.current.onError?.(error);
      },
    );
    return () => {
      signal.cancelled = true;
      if (engine.current === made) engine.current = null;
      made?.dispose();
    };
  }, [host, seen, supported, src, kind, rx, ry, rz, bx, by, bz, radius, key]);

  useEffect(() => {
    if (ready) engine.current?.setView(view);
  }, [view, ready]);

  useEffect(() => {
    if (ready) engine.current?.setActive(drawing);
  }, [drawing, ready]);

  useEffect(() => {
    if (!spinning) return;
    let frame = 0;
    let before = performance.now();
    const tick = (now: number): void => {
      const seconds = Math.min(0.1, (now - before) / 1000);
      before = now;
      const current = latest.current;
      current.setView({ ...current.view, azimuth: current.view.azimuth + rotateSpeed * seconds });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spinning, rotateSpeed]);

  // Ctrl with the wheel (which is also what a trackpad pinch sends) zooms; a plain wheel scrolls the page.
  // Registered by hand: React's wheel listener is passive and could not stop the browser's own zoom.
  useEffect(() => {
    if (!host || !ready) return;
    const wheel = (event: WheelEvent): void => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const current = latest.current;
      current.setView({ ...current.view, zoom: current.view.zoom * Math.exp(-event.deltaY * 0.01) });
    };
    host.addEventListener("wheel", wheel, { passive: false });
    return () => host.removeEventListener("wheel", wheel);
  }, [host, ready]);

  /** The fingers or the mouse button now down on the surface, and where the drag or the pinch began. */
  const pointers = useRef<{ at: Map<number, { x: number; y: number }>; from: { x: number; y: number; spread: number; view: ModelView } | null }>({ at: new Map(), from: null });
  /** Starts measuring again from where the pointers are now: a second finger came down, or one was lifted. */
  const mark = (): void => {
    const [first, second] = [...pointers.current.at.values()];
    pointers.current.from = first ? { x: first.x, y: first.y, spread: second ? Math.hypot(first.x - second.x, first.y - second.y) : 0, view: latest.current.view } : null;
  };
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (!ready || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.at.set(event.pointerId, { x: event.clientX, y: event.clientY });
    mark();
    setTurning(false);
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const state = pointers.current;
    if (!state.at.has(event.pointerId) || !state.from) return;
    state.at.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [first, second] = [...state.at.values()];
    if (!first) return;
    // Measured from where the gesture began, so no movement is lost between two renders.
    const from = state.from;
    if (second) {
      const spread = Math.hypot(first.x - second.x, first.y - second.y);
      if (from.spread > 0 && spread > 0) setView({ ...from.view, zoom: from.view.zoom * (spread / from.spread) });
      return;
    }
    // The surface follows the hand: dragging right turns the model right, dragging down shows it from above.
    setView({ ...from.view, azimuth: from.view.azimuth + (first.x - from.x) * 0.4, polar: from.view.polar + (first.y - from.y) * 0.3 });
  };
  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    pointers.current.at.delete(event.pointerId);
    mark();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!ready || event.altKey || event.ctrlKey || event.metaKey) return;
    const changes: Record<string, ((current: ModelView) => ModelView) | undefined> = {
      ArrowRight: (current) => ({ ...current, azimuth: current.azimuth + TURN_STEP }),
      ArrowLeft: (current) => ({ ...current, azimuth: current.azimuth - TURN_STEP }),
      ArrowUp: (current) => ({ ...current, polar: current.polar + TILT_STEP }),
      ArrowDown: (current) => ({ ...current, polar: current.polar - TILT_STEP }),
      "+": (current) => ({ ...current, zoom: current.zoom * ZOOM_STEP }),
      "=": (current) => ({ ...current, zoom: current.zoom * ZOOM_STEP }),
      "-": (current) => ({ ...current, zoom: current.zoom / ZOOM_STEP }),
      _: (current) => ({ ...current, zoom: current.zoom / ZOOM_STEP }),
      Home: () => defaultView,
    };
    const change = changes[event.key];
    if (!change) return;
    event.preventDefault();
    act(change);
  };

  const round = (value: number): string => String(Math.round(value * 100) / 100);

  return (
    <ModelViewerContext
      value={{
        status,
        progress,
        view,
        labels,
        act,
        reset,
        autoRotate: autoRotate && !reduced,
        turning,
        setTurning,
        src,
        kind,
        ar,
        // eslint-disable-next-line @next/next/no-img-element -- The library is not tied to one framework: a poster given as an address is a plain element, and `poster` also takes an element (the framework's image component).
        poster: typeof poster === "string" ? <img src={poster} alt="" draggable={false} className="size-full object-contain" /> : poster,
      }}
    >
      <div
        ref={setRoot}
        data-slot="model-viewer"
        data-state={status}
        data-kind={kind}
        data-azimuth={round(view.azimuth)}
        data-polar={round(view.polar)}
        data-zoom={round(view.zoom)}
        data-turning={spinning ? "" : undefined}
        className={cn("relative isolate w-full overflow-hidden rounded-surface border bg-muted", aspect === "auto" && "h-full", className)}
        style={aspect === "auto" ? style : { aspectRatio: String(aspect), ...style }}
        {...props}
      >
        <div
          ref={setHost}
          data-slot="model-viewer-surface"
          // Ready, it is a widget with its own keys; before that (and where 3D cannot run) it is a picture with a name.
          role={ready ? "application" : "img"}
          aria-roledescription={ready ? labels.roledescription : undefined}
          aria-label={alt}
          aria-describedby={ready ? instructions : undefined}
          tabIndex={ready ? 0 : undefined}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className={cn(
            "absolute inset-0 touch-pan-y transition-opacity duration-slow ease-out select-none motion-reduce:transition-none",
            ready ? "cursor-grab active:cursor-grabbing" : "opacity-0",
          )}
        />
        <p id={instructions} hidden>
          {labels.instructions}
        </p>
        <ModelViewerPoster />
        <ModelViewerStatusLine fallback={fallback} />
        {children === undefined ? (
          <>
            <ModelViewerControls />
            {ar ? <ModelViewerArButton /> : null}
          </>
        ) : (
          children
        )}
      </div>
    </ModelViewerContext>
  );
}

/** The still: over the frame until the model has drawn, and for good when it cannot. It lets the pointer through. */
function ModelViewerPoster() {
  const { status, poster } = useModelViewer("ModelViewerPoster");
  if (!poster) return null;
  return (
    <div
      data-slot="model-viewer-poster"
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 transition-opacity duration-slow ease-out motion-reduce:transition-none", status === "ready" && "opacity-0")}
    >
      {poster}
    </div>
  );
}

/** Progress while the file loads; a sentence on a solid ground when it failed or 3D cannot run. */
function ModelViewerStatusLine({ fallback }: { fallback: ReactNode }) {
  const { status, progress, labels } = useModelViewer("ModelViewerStatusLine");
  if (status === "loading") {
    return (
      <div data-slot="model-viewer-progress" className="pointer-events-none absolute inset-x-3 bottom-3">
        <Progress size="sm" value={progress === null ? null : Math.round(progress * 100)} aria-label={labels.loading} className="border border-border-strong bg-background" />
      </div>
    );
  }
  if (status !== "error" && status !== "unsupported") return null;
  return (
    <div data-slot="model-viewer-message" className="absolute inset-x-3 bottom-3 rounded-control border border-border-strong bg-background px-3 py-2 text-sm text-foreground">
      {fallback ?? <p>{status === "error" ? labels.failed : labels.unsupported}</p>}
    </div>
  );
}

const actionClass =
  "inline-flex size-(--control-h) shrink-0 items-center justify-center rounded-control border border-border-strong bg-background text-foreground transition-colors duration-instant ease-out hover:bg-accent disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none [&_svg]:size-4";

export type ModelViewerControlsProps = ComponentProps<"div">;

/**
 * The buttons, along the bottom of the frame: everything a drag or a pinch does, without one. Shown once
 * the model is ready. Default: turn left, turn right, zoom out, zoom in, reset, and stop or start when the
 * viewer turns by itself. Pass ModelViewerAction children to choose your own.
 */
export function ModelViewerControls({ className, children, ...props }: ModelViewerControlsProps) {
  const { status, labels, autoRotate } = useModelViewer("ModelViewerControls");
  if (status !== "ready") return null;
  return (
    <div
      data-slot="model-viewer-controls"
      role="group"
      aria-label={labels.controls}
      // Buttons that turn left and right keep their sides in every language, as the model does.
      dir="ltr"
      className={cn("absolute inset-x-2 bottom-2 flex flex-wrap items-center justify-center gap-1", className)}
      {...props}
    >
      {children ?? (
        <>
          <ModelViewerAction action="turn-left" />
          <ModelViewerAction action="turn-right" />
          <ModelViewerAction action="zoom-out" />
          <ModelViewerAction action="zoom-in" />
          <ModelViewerAction action="reset" />
          {autoRotate ? <ModelViewerAction action="turning" /> : null}
        </>
      )}
    </div>
  );
}

export type ModelViewerActionProps = Omit<ComponentProps<"button">, "type"> & {
  action: "turn-left" | "turn-right" | "zoom-in" | "zoom-out" | "reset" | "turning";
};

/** One button of the viewer. Its name comes from the viewer's `labels`; children replace its icon. */
export function ModelViewerAction({ className, action, children, onClick, ...props }: ModelViewerActionProps) {
  const { labels, act, reset, turning, setTurning, status } = useModelViewer("ModelViewerAction");
  const actions = {
    "turn-left": { label: labels.turnLeft, icon: <ArrowLeft />, run: () => act((view) => ({ ...view, azimuth: view.azimuth - TURN_STEP })) },
    "turn-right": { label: labels.turnRight, icon: <ArrowRight />, run: () => act((view) => ({ ...view, azimuth: view.azimuth + TURN_STEP })) },
    "zoom-in": { label: labels.zoomIn, icon: <Plus />, run: () => act((view) => ({ ...view, zoom: view.zoom * ZOOM_STEP })) },
    "zoom-out": { label: labels.zoomOut, icon: <Minus />, run: () => act((view) => ({ ...view, zoom: view.zoom / ZOOM_STEP })) },
    reset: { label: labels.reset, icon: <RotateCcw />, run: reset },
    turning: { label: turning ? labels.stopTurning : labels.startTurning, icon: turning ? <Pause /> : <Play />, run: () => setTurning(!turning) },
  }[action];
  return (
    <button
      type="button"
      data-slot="model-viewer-action"
      data-action={action}
      aria-label={actions.label}
      disabled={status !== "ready"}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) actions.run();
      }}
      className={cn(actionClass, className)}
      {...props}
    >
      {children ?? <span aria-hidden="true">{actions.icon}</span>}
    </button>
  );
}

const noPlatform = (): ArPlatform => "none";

export type ModelViewerArButtonProps = Omit<ComponentProps<"a">, "href" | "rel">;

/**
 * The hand-off to the phone's own AR viewer, at the top of the frame. It renders nothing where there is
 * none. On iPhone and iPad it opens the viewer's `ar.usdz` in AR Quick Look; on Android it opens `ar.glb`
 * (or the viewer's own glTF file) in Scene Viewer, which needs an absolute https address and falls back to
 * this page when the app is missing. Splats have no AR viewer to be handed to: give a mesh for it.
 */
export function ModelViewerArButton({ className, children, onClick, ...props }: ModelViewerArButtonProps) {
  const { ar, labels, src, kind } = useModelViewer("ModelViewerArButton");
  const platform = useSyncExternalStore(never, readArPlatform, noPlatform);
  const file = platform === "quicklook" ? ar?.usdz : platform === "sceneviewer" ? (ar?.glb ?? (kind === "gltf" ? src : undefined)) : undefined;
  if (!file) return null;

  let href = file;
  if (platform === "sceneviewer") {
    const absolute = new URL(file, window.location.href).toString();
    const query = new URLSearchParams({ file: absolute, mode: "ar_preferred" });
    if (ar?.title) query.set("title", ar.title);
    href = `intent://arvr.google.com/scene-viewer/1.0?${query.toString()}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end;`;
  }
  return (
    <a
      data-slot="model-viewer-ar"
      data-platform={platform}
      href={href}
      rel={platform === "quicklook" ? "ar" : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (platform !== "quicklook" || event.defaultPrevented) return;
        // Quick Look opens in place only from a link whose one child is a picture, so that link is made for the press.
        event.preventDefault();
        const link = document.createElement("a");
        link.rel = "ar";
        link.href = file;
        link.append(document.createElement("img"));
        link.click();
      }}
      className={cn(
        "absolute end-2 top-2 inline-flex h-control items-center gap-2 rounded-control border border-border-strong bg-background px-3 text-sm font-medium text-foreground transition-colors duration-instant ease-out hover:bg-accent motion-reduce:transition-none [&_svg]:size-4",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <Box aria-hidden="true" />
          {labels.ar}
        </>
      )}
    </a>
  );
}
