"use client";
/**
 * @name particle-field
 * @category three
 * @description A field of small round points drifting slowly, with depth that shifts as the pointer moves.
 * @when A quiet moving ground behind a hero or a section. Use it inside scene and keep text on top readable. For one focal object use orb; for data use the viz components, never particles.
 * @example
 * <Scene className="absolute inset-0">
 *   <ParticleField />
 * </Scene>
 *
 * <Scene aspect={2}>
 *   <ParticleField count={400} color="--foreground" size={0.03} spread={10} />
 * </Scene>
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, type Points } from "three";
import { useThemeColors } from "@/lib/theme-color";

export type ParticleFieldProps = {
  /** How many points. Halved when the canvas is narrower than 640px. */
  count?: number;
  /** The CSS variable the points take their colour from. */
  color?: string;
  /** Diameter of a point in scene units. */
  size?: number;
  /** Width of the field in scene units; it is two thirds as tall and as deep. */
  spread?: number;
  /** Drift speed. 1 is slow; 0 holds the field still (it still answers the pointer). */
  speed?: number;
  /** 0 to 1. */
  opacity?: number;
};

const VERTEX = /* glsl */ `
uniform float uSize;
uniform float uScale;
varying float vFade;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  // World-sized points: half the drawing-buffer height, times the projection, over the distance.
  gl_PointSize = max(1.5, uSize * uScale * projectionMatrix[1][1] / max(0.001, -viewPosition.z));
  // Far points are fainter, which is what gives the field its depth.
  vFade = clamp(1.6 - (-viewPosition.z) / 9.0, 0.25, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vFade;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float alpha = (1.0 - smoothstep(0.38, 0.5, d)) * uOpacity * vFade;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor, alpha);
  #include <colorspace_fragment>
}
`;

/** A small seeded generator, so the same count gives the same field on every mount. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 1831565813) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ParticleField({ count = 600, color = "--highlight", size = 0.045, spread = 12, speed = 1, opacity = 0.8 }: ParticleFieldProps) {
  const points = useRef<Points>(null);
  const drift = useRef(0);
  const lean = useRef({ x: 0, y: 0 });
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const small = useThree((state) => state.size.width < 640);
  const fill = useThemeColors([color], canvas)[color] ?? "";
  const total = Math.max(1, Math.round(small ? count / 2 : count));

  // A typed array only: the geometry that holds it is declared below and disposed by react-three-fiber.
  const positions = useMemo(() => {
    const random = seeded(total * 7919 + 17);
    const array = new Float32Array(total * 3);
    for (let index = 0; index < total; index += 1) {
      array[index * 3] = (random() - 0.5) * spread;
      array[index * 3 + 1] = (random() - 0.5) * spread * 0.66;
      array[index * 3 + 2] = (random() - 0.5) * spread * 0.66;
    }
    return array;
  }, [total, spread]);

  const uniforms = useMemo(
    () => ({
      uSize: { value: 0 },
      uScale: { value: 1 },
      uOpacity: { value: 1 },
      uColor: { value: new Color() },
    }),
    [],
  );

  useEffect(() => {
    uniforms.uColor.value.set(fill);
    uniforms.uSize.value = size;
    uniforms.uOpacity.value = opacity;
    invalidate();
  }, [uniforms, fill, size, opacity, invalidate]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    uniforms.uScale.value = state.size.height * state.viewport.dpr * 0.5;
    drift.current += dt * speed * 0.03;
    const ease = 1 - Math.exp(-dt * 2);
    lean.current.x += (state.pointer.x - lean.current.x) * ease;
    lean.current.y += (state.pointer.y - lean.current.y) * ease;
    const object = points.current;
    if (object) {
      // Turning the whole field a little moves near points further than far ones: parallax.
      object.rotation.y = drift.current + lean.current.x * 0.12;
      object.rotation.x = -lean.current.y * 0.08;
    }
  });

  return (
    <points ref={points} key={`${total}:${spread}`} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial args={[{ uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false }]} />
    </points>
  );
}
