"use client";
/**
 * @name scene
 * @category three
 * @description The wrapper every 3D component is used inside: a transparent WebGL canvas that mounts late, pauses off screen and falls back to a static block.
 * @when Around orb, particle-field, floating-shapes, globe, model-stage or your own react-three-fiber content. Give it a size through the parent or `aspect`. For a decorative background that needs no 3D, use a plain token-coloured block.
 * @example
 * <Scene aspect={16 / 9} label="A slowly morphing sphere">
 *   <Orb />
 * </Scene>
 *
 * <div className="h-80">
 *   <Scene fallback={<img src="/globe.png" alt="" className="size-full object-contain" />}>
 *     <Globe markers={[{ lat: 52.37, lon: 4.9 }]} />
 *   </Scene>
 * </div>
 */
import { Canvas, type CanvasProps, type RootState } from "@react-three/fiber";
import { Component, useCallback, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SceneProps = Omit<ComponentProps<"div">, "children"> & {
  /** react-three-fiber content: the three components, lights, meshes. */
  children?: ReactNode;
  /** Shown until the canvas has drawn, when WebGL is missing or fails, and under reduced motion. Default: a flat muted block. */
  fallback?: ReactNode;
  /** Width / height, as a number (16 / 9) or a CSS ratio ("4 / 3"). Without it the scene fills its parent's height. */
  aspect?: number | string;
  /** Under reduced motion, draw one still frame instead of the fallback. */
  allowReducedMotion?: boolean;
  /** Describes the scene to assistive technology (`role="img"`). Without it the scene is decoration and hidden from it. */
  label?: string;
  /** "always" renders every frame while visible; "demand" only when something invalidates. */
  frameloop?: "always" | "demand";
  /** The default camera. */
  camera?: CanvasProps["camera"];
  /** How far outside the viewport the scene starts and keeps running (an IntersectionObserver margin). */
  margin?: string;
};

let webgl: boolean | undefined;

function hasWebGL(): boolean {
  if (webgl !== undefined) return webgl;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webgl = context !== null;
    // Give the probe's context back at once: browsers allow only a few.
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

/** Error boundaries can only be classes. A scene that throws (a shader that fails, a lost device) falls back. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(): void {
    this.props.onError();
  }
  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

const DEFAULT_CAMERA: CanvasProps["camera"] = { position: [0, 0, 6], fov: 40, near: 0.1, far: 100 };
const GL: CanvasProps["gl"] = { alpha: true, antialias: true, powerPreference: "high-performance" };
const DPR: [number, number] = [1, 2];

export function Scene({
  children,
  fallback,
  aspect,
  allowReducedMotion = false,
  label,
  frameloop = "always",
  camera = DEFAULT_CAMERA,
  margin = "200px",
  className,
  style,
  ...props
}: SceneProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  /** null until mounted: the server and the first client render show the fallback. */
  const [client, setClient] = useState<{ webgl: boolean; reduced: boolean } | null>(null);
  const [near, setNear] = useState(false);
  const [seen, setSeen] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setClient({ webgl: hasWebGL(), reduced: query.matches });
    const visibility = (): void => setTabVisible(document.visibilityState !== "hidden");
    update();
    visibility();
    query.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      query.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!root) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      setSeen(true);
      return;
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

  const fail = useCallback((): void => {
    setFailed(true);
    setReady(false);
  }, []);

  const created = useCallback(
    (state: RootState): void => {
      // The device can take the context away (too many canvases, a driver reset): show the fallback again.
      state.gl.domElement.addEventListener("webglcontextlost", fail, { once: true });
      setReady(true);
    },
    [fail],
  );

  const still = client?.reduced === true;
  const active = client !== null && client.webgl && !failed && seen && (!still || allowReducedMotion);
  const loop = !near || !tabVisible ? "never" : still ? "demand" : frameloop;
  const shown = active && ready;

  return (
    <div
      ref={setRoot}
      data-slot="scene"
      data-state={shown ? "ready" : "fallback"}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative w-full overflow-hidden", aspect === undefined && "h-full", className)}
      style={aspect === undefined ? style : { aspectRatio: String(aspect), ...style }}
      {...props}
    >
      <div
        data-slot="scene-fallback"
        className={cn("absolute inset-0 transition-opacity duration-slow ease-out motion-reduce:transition-none", shown && "pointer-events-none opacity-0")}
      >
        {fallback ?? <div className="size-full rounded-surface bg-muted" />}
      </div>
      {active ? (
        <div data-slot="scene-canvas" className={cn("absolute inset-0 transition-opacity duration-slow ease-out motion-reduce:transition-none", !ready && "opacity-0")}>
          <SceneBoundary onError={fail}>
            <Canvas flat dpr={DPR} gl={GL} camera={camera} frameloop={loop} onCreated={created}>
              {children}
            </Canvas>
          </SceneBoundary>
        </div>
      ) : null}
    </div>
  );
}
