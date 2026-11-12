"use client";
/**
 * @name globe
 * @category three
 * @description A dotted globe that turns slowly and can be dragged to spin, with optional highlighted markers by latitude and longitude.
 * @when Showing reach or places at a glance: offices, regions, where requests come from. Use it inside scene. For exact values per place use a table or bar-chart; the globe is not a chart.
 * @example
 * <Scene aspect={1} className="max-w-lg" label="A globe with markers on Amsterdam, Kochi and San Francisco">
 *   <Globe
 *     markers={[
 *       { lat: 52.37, lon: 4.9 },
 *       { lat: 9.93, lon: 76.27 },
 *       { lat: 37.77, lon: -122.42 },
 *     ]}
 *   />
 * </Scene>
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, type Group } from "three";
import { useThemeColors } from "@/lib/theme-color";

export type GlobeMarker = {
  /** Degrees north (south is negative). */
  lat: number;
  /** Degrees east (west is negative). */
  lon: number;
};

export type GlobeProps = {
  /** Places to highlight. */
  markers?: readonly GlobeMarker[];
  /** How many dots make the globe. */
  count?: number;
  /** Radius in scene units. */
  radius?: number;
  /** The CSS variable the dots take their colour from. */
  color?: string;
  /** The CSS variable the markers take their colour from. */
  markerColor?: string;
  /** Diameter of a dot in scene units. */
  dotSize?: number;
  /** Diameter of a marker in scene units. */
  markerSize?: number;
  /** Turning speed in radians per second. 0 stops it; dragging still works. */
  speed?: number;
  /** How far the axis leans toward the viewer, in radians. */
  tilt?: number;
  /** Let the pointer spin it. Horizontal drags spin; vertical touches still scroll the page. */
  draggable?: boolean;
  /** Where it sits in the scene. */
  position?: [number, number, number];
};

const VERTEX = /* glsl */ `
uniform float uSize;
uniform float uScale;
varying float vFacing;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = max(1.5, uSize * uScale * projectionMatrix[1][1] / max(0.001, -viewPosition.z));
  // On a sphere centred on its own origin, the position is the normal.
  vec3 outward = normalize(normalMatrix * normalize(position));
  vFacing = dot(outward, normalize(-viewPosition.xyz));
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uBack;
varying float vFacing;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float disc = 1.0 - smoothstep(0.38, 0.5, d);
  // The far side shows through, dimmed, so the globe reads as a sphere and not a disc.
  float alpha = disc * mix(uBack, 1.0, smoothstep(-0.12, 0.12, vFacing));
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor, alpha);
  #include <colorspace_fragment>
}
`;

const DEGREES = Math.PI / 180;

function place(target: Float32Array, index: number, lat: number, lon: number, radius: number): void {
  const phi = (90 - lat) * DEGREES;
  const theta = (lon + 180) * DEGREES;
  target[index * 3] = -radius * Math.sin(phi) * Math.cos(theta);
  target[index * 3 + 1] = radius * Math.cos(phi);
  target[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
}

function pointUniforms(): { uSize: { value: number }; uScale: { value: number }; uBack: { value: number }; uColor: { value: Color } } {
  return { uSize: { value: 0 }, uScale: { value: 1 }, uBack: { value: 0.2 }, uColor: { value: new Color() } };
}

export function Globe({
  markers,
  count = 1800,
  radius = 2,
  color = "--foreground",
  markerColor = "--highlight",
  dotSize = 0.035,
  markerSize = 0.13,
  speed = 0.12,
  tilt = 0.3,
  draggable = true,
  position,
}: GlobeProps) {
  const group = useRef<Group>(null);
  const motion = useRef({ spin: 0, lift: 0, velocity: 0, dragging: false, pointer: -1, x: 0, y: 0, at: 0 });
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const colors: Record<string, string> = useThemeColors([color, markerColor], canvas);
  const dotFill = colors[color] ?? "";
  const markerFill = colors[markerColor] ?? "";
  const total = Math.max(1, Math.round(count));
  const markerKey = (markers ?? []).map((marker) => `${marker.lat},${marker.lon}`).join(";");

  // Typed arrays only; the geometries that hold them are declared below and disposed by react-three-fiber.
  const dots = useMemo(() => {
    // A Fibonacci lattice: each dot a golden angle on from the last, evenly spaced from pole to pole.
    const array = new Float32Array(total * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let index = 0; index < total; index += 1) {
      const y = 1 - ((index + 0.5) / total) * 2;
      const ring = Math.sqrt(1 - y * y);
      const angle = index * golden;
      array[index * 3] = Math.cos(angle) * ring * radius;
      array[index * 3 + 1] = y * radius;
      array[index * 3 + 2] = Math.sin(angle) * ring * radius;
    }
    return array;
  }, [total, radius]);

  const pins = useMemo(() => {
    const list = markerKey === "" ? [] : markerKey.split(";");
    const array = new Float32Array(list.length * 3);
    list.forEach((entry, index) => {
      const [lat, lon] = entry.split(",");
      // Just above the surface, so a marker is never hidden behind the dot it lands on.
      place(array, index, Number(lat), Number(lon), radius * 1.01);
    });
    return array;
  }, [markerKey, radius]);

  const dotUniforms = useMemo(pointUniforms, []);
  const pinUniforms = useMemo(pointUniforms, []);

  useEffect(() => {
    dotUniforms.uColor.value.set(dotFill);
    dotUniforms.uSize.value = dotSize;
    dotUniforms.uBack.value = 0.22;
    pinUniforms.uColor.value.set(markerFill);
    pinUniforms.uSize.value = markerSize;
    pinUniforms.uBack.value = 0.3;
    invalidate();
  }, [dotUniforms, pinUniforms, dotFill, markerFill, dotSize, markerSize, invalidate]);

  useEffect(() => {
    if (!draggable) return;
    const state = motion.current;
    const before = { touchAction: canvas.style.touchAction, cursor: canvas.style.cursor };
    canvas.style.touchAction = "pan-y";
    canvas.style.cursor = "grab";

    const down = (event: PointerEvent): void => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      state.dragging = true;
      state.pointer = event.pointerId;
      state.x = event.clientX;
      state.y = event.clientY;
      state.at = event.timeStamp;
      state.velocity = 0;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const move = (event: PointerEvent): void => {
      if (!state.dragging || event.pointerId !== state.pointer) return;
      const turn = (event.clientX - state.x) * 0.006;
      const seconds = Math.max(1, event.timeStamp - state.at) / 1000;
      state.spin += turn;
      state.lift = Math.max(-0.9, Math.min(0.9, state.lift + (event.clientY - state.y) * 0.006));
      state.velocity = state.velocity * 0.6 + (turn / seconds) * 0.4;
      state.x = event.clientX;
      state.y = event.clientY;
      state.at = event.timeStamp;
      invalidate();
    };
    const up = (event: PointerEvent): void => {
      if (event.pointerId !== state.pointer) return;
      state.dragging = false;
      state.pointer = -1;
      // Held still before letting go: no throw.
      if (event.timeStamp - state.at > 100) state.velocity = 0;
      state.velocity = Math.max(-8, Math.min(8, state.velocity));
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.style.touchAction = before.touchAction;
      canvas.style.cursor = before.cursor;
      state.dragging = false;
    };
  }, [canvas, draggable, invalidate]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const scale = state.size.height * state.viewport.dpr * 0.5;
    dotUniforms.uScale.value = scale;
    pinUniforms.uScale.value = scale;
    const current = motion.current;
    if (!current.dragging) {
      current.spin += (speed + current.velocity) * dt;
      current.velocity *= Math.exp(-dt * 2.5);
    }
    const root = group.current;
    if (root) {
      root.rotation.x = tilt + current.lift;
      root.rotation.y = current.spin;
    }
  });

  return (
    <group ref={group} position={position}>
      <points key={`dots:${total}:${radius}`} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dots, 3]} />
        </bufferGeometry>
        <shaderMaterial args={[{ uniforms: dotUniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false }]} />
      </points>
      {pins.length > 0 ? (
        <points key={`pins:${markerKey}:${radius}`} frustumCulled={false} renderOrder={1}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[pins, 3]} />
          </bufferGeometry>
          <shaderMaterial args={[{ uniforms: pinUniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false }]} />
        </points>
      ) : null}
    </group>
  );
}
