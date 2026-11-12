"use client";
/**
 * @name floating-shapes
 * @category three
 * @description A few simple solids (icosahedron, torus, box, octahedron) floating and turning slowly, flat-shaded or wireframe, coloured from theme variables.
 * @when An abstract, geometric accent for a hero or a feature section. Use it inside scene. For a single soft object use orb; to show a real object use model-stage.
 * @example
 * <Scene aspect={16 / 9}>
 *   <FloatingShapes />
 * </Scene>
 *
 * <Scene aspect={2}>
 *   <FloatingShapes
 *     shapes={[
 *       { kind: "torus", position: [-1.5, 0, 0], color: "--highlight" },
 *       { kind: "box", position: [1.5, 0.4, -1], size: 0.8, color: "--foreground", wireframe: true },
 *     ]}
 *   />
 * </Scene>
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { useThemeColors } from "@/lib/theme-color";

export type FloatingShape = {
  kind: "icosahedron" | "torus" | "box" | "octahedron";
  /** Where it rests, in scene units. The default camera sees about ±3.5 across and ±2 up at z = 0. */
  position: [number, number, number];
  /** Scale. 1 is about one unit in radius. */
  size?: number;
  /** The CSS variable it takes its colour from. */
  color?: string;
  /** Draw edges only. */
  wireframe?: boolean;
  /** Its own pace, multiplied by the component's `speed`. */
  speed?: number;
};

export type FloatingShapesProps = {
  /** Which shapes, and where. */
  shapes?: readonly FloatingShape[];
  /** Overall pace of the floating and turning. 0 holds everything still. */
  speed?: number;
  /** Faceted faces (true) or smooth shading (false). */
  flat?: boolean;
};

const DEFAULT_SHAPES: readonly FloatingShape[] = [
  { kind: "icosahedron", position: [-2.1, 0.5, 0], size: 1.05, color: "--highlight" },
  { kind: "torus", position: [1.9, 0.8, -0.8], size: 0.95, color: "--foreground", wireframe: true },
  { kind: "box", position: [1.1, -1.1, 0.5], size: 0.7, color: "--muted-foreground" },
  { kind: "octahedron", position: [-0.5, -1.2, -1], size: 0.6, color: "--chart-2" },
];

function ShapeGeometry({ kind }: { kind: FloatingShape["kind"] }) {
  if (kind === "torus") return <torusGeometry args={[0.72, 0.26, 12, 36]} />;
  if (kind === "box") return <boxGeometry args={[1.3, 1.3, 1.3]} />;
  if (kind === "octahedron") return <octahedronGeometry args={[1, 0]} />;
  return <icosahedronGeometry args={[1, 1]} />;
}

export function FloatingShapes({ shapes = DEFAULT_SHAPES, speed = 1, flat = true }: FloatingShapesProps) {
  const group = useRef<Group>(null);
  const time = useRef(0);
  const lean = useRef({ x: 0, y: 0 });
  const canvas = useThree((state) => state.gl.domElement);
  const names = useMemo(() => [...new Set(shapes.map((shape) => shape.color ?? "--highlight"))], [shapes]);
  const colors: Record<string, string> = useThemeColors(names, canvas);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    time.current += dt * speed;
    const ease = 1 - Math.exp(-dt * 2.5);
    lean.current.x += (state.pointer.x - lean.current.x) * ease;
    lean.current.y += (state.pointer.y - lean.current.y) * ease;
    const root = group.current;
    if (!root) return;
    root.rotation.y = lean.current.x * 0.1;
    root.rotation.x = -lean.current.y * 0.07;
    const children = root.children;
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      const shape = shapes[index];
      if (!child || !shape) continue;
      const pace = shape.speed ?? 1;
      const phase = index * 1.7;
      const t = time.current * pace;
      child.position.y = shape.position[1] + Math.sin(t * 0.6 + phase) * 0.16;
      child.rotation.x = t * 0.16 + phase;
      child.rotation.y = t * 0.22 + phase * 0.5;
    }
  });

  // Everything below is declared, so react-three-fiber disposes of the geometries and materials.
  return (
    <>
      <ambientLight intensity={1.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.7} />
      <group ref={group}>
        {shapes.map((shape, index) => (
          <mesh key={`${shape.kind}:${index}`} position={shape.position} scale={shape.size ?? 1}>
            <ShapeGeometry kind={shape.kind} />
            <meshLambertMaterial key={flat ? "flat" : "smooth"} color={colors[shape.color ?? "--highlight"]} flatShading={flat} wireframe={shape.wireframe === true} />
          </mesh>
        ))}
      </group>
    </>
  );
}
