"use client";
/**
 * @name orb
 * @category three
 * @description A softly morphing sphere in the highlight colour, lit at its rim so it reads on light and dark grounds, leaning gently toward the pointer.
 * @when A calm focal object for a hero or an empty state. Use it inside scene. For many small elements use particle-field; for a product or object of your own use model-stage.
 * @example
 * <Scene aspect={1} className="max-w-md">
 *   <Orb />
 * </Scene>
 *
 * <Scene aspect={16 / 9}>
 *   <Orb color="--chart-2" speed={0.6} distortion={0.5} detail={32} />
 * </Scene>
 */
/* eslint-disable react-hooks/immutability -- three.js objects (uniforms, the canvas, scene nodes) are changed in place by design, in effects and frames, never during render */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Vector2, type Mesh } from "three";
import { useThemeColors } from "@/lib/theme-color";

export type OrbProps = {
  /** The CSS variable the orb takes its colour from. */
  color?: string;
  /** How fast the surface moves. 1 is a slow breath; 0 holds it still. */
  speed?: number;
  /** How far the surface is pushed in and out, as a share of the radius (0 to about 0.6). */
  distortion?: number;
  /** Subdivisions of the sphere. More is smoother and costs more; 8 to 48. */
  detail?: number;
  /** Radius in scene units. */
  radius?: number;
  /** Where it sits in the scene. */
  position?: [number, number, number];
};

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uDistortion;
uniform vec2 uPointer;
varying vec3 vNormal;
varying vec3 vView;

vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Gradient noise, roughly -1 to 1.
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(dot(hash3(i), f), dot(hash3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
      mix(dot(hash3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)), dot(hash3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(dot(hash3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)), dot(hash3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
      mix(dot(hash3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)), dot(hash3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

// A point on the unit sphere, pushed along its own direction.
vec3 surface(vec3 direction, float radius) {
  vec3 q = direction * 1.15 + vec3(uPointer * 0.35, 0.0) + vec3(0.0, 0.0, uTime * 0.25);
  float n = noise(q) + 0.35 * noise(q * 2.3 + vec3(uTime * 0.2));
  return direction * radius * (1.0 + n * uDistortion);
}

void main() {
  float radius = length(position);
  vec3 direction = position / radius;
  // The normal of the moved surface comes from two neighbours on the sphere, moved the same way.
  vec3 axis = abs(direction.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 tangent = normalize(cross(axis, direction));
  vec3 bitangent = cross(direction, tangent);
  float eps = 0.02;
  vec3 moved = surface(direction, radius);
  vec3 a = surface(normalize(direction + tangent * eps), radius);
  vec3 b = surface(normalize(direction + bitangent * eps), radius);
  vec3 movedNormal = normalize(cross(a - moved, b - moved));
  vec4 viewPosition = modelViewMatrix * vec4(moved, 1.0);
  vNormal = normalize(normalMatrix * movedNormal);
  vView = -viewPosition.xyz;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uRim;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 view = normalize(vView);
  float facing = clamp(dot(normal, view), 0.0, 1.0);
  float fresnel = pow(1.0 - facing, 2.2);
  // One soft light from the upper left gives the form; the rim takes the text colour, which is dark on a
  // light ground and light on a dark one, so the edge always separates from the page.
  float light = 0.88 + 0.12 * dot(normal, normalize(vec3(-0.4, 0.7, 0.6)));
  vec3 color = mix(uColor * light, uRim, fresnel * 0.55);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;

export function Orb({ color = "--highlight", speed = 1, distortion = 0.3, detail = 24, radius = 1.6, position }: OrbProps) {
  const mesh = useRef<Mesh>(null);
  const time = useRef(0);
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const colors = useThemeColors([color, "--foreground"], canvas);
  const fill = colors[color] ?? "";
  const rim = colors["--foreground"] ?? "";

  // Uniform holders are plain objects: nothing here holds GPU memory. The geometry and the material are
  // created declaratively below, so react-three-fiber disposes of them.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDistortion: { value: 0 },
      uPointer: { value: new Vector2() },
      uColor: { value: new Color() },
      uRim: { value: new Color() },
    }),
    [],
  );

  useEffect(() => {
    uniforms.uColor.value.set(fill);
    uniforms.uRim.value.set(rim);
    invalidate();
  }, [uniforms, fill, rim, invalidate]);

  useEffect(() => {
    uniforms.uDistortion.value = distortion;
    invalidate();
  }, [uniforms, distortion, invalidate]);

  useFrame((state, delta) => {
    // A long gap (a hidden tab, a paused scene) must not jump the surface.
    const dt = Math.min(delta, 0.1);
    time.current += dt * speed;
    uniforms.uTime.value = time.current;
    const ease = 1 - Math.exp(-dt * 3);
    const pointer = uniforms.uPointer.value;
    pointer.x += (state.pointer.x - pointer.x) * ease;
    pointer.y += (state.pointer.y - pointer.y) * ease;
    const object = mesh.current;
    if (object) {
      object.rotation.y = pointer.x * 0.35;
      object.rotation.x = -pointer.y * 0.25;
    }
  });

  const segments = Math.max(1, Math.min(64, Math.round(detail)));

  return (
    <mesh ref={mesh} position={position}>
      <icosahedronGeometry args={[radius, segments]} />
      <shaderMaterial args={[{ uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT }]} />
    </mesh>
  );
}
