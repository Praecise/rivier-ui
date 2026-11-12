"use client";
/**
 * @name model-stage
 * @category three
 * @description A turntable for any mesh or group: centres and fits it, turns it slowly, and lets the pointer orbit it within limits.
 * @when Showing one object: a product, a loaded model, a shape of your own. Use it inside scene. For decoration without a subject use orb or floating-shapes.
 * @example
 * <Scene aspect={4 / 3} label="A turning torus knot">
 *   <ModelStage>
 *     <mesh>
 *       <torusKnotGeometry args={[1, 0.32, 128, 16]} />
 *       <meshStandardMaterial flatShading />
 *     </mesh>
 *   </ModelStage>
 * </Scene>
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { Box3, Vector3, type Group } from "three";

export type ModelStageProps = {
  /** The mesh or group to show. Load models inside a Suspense boundary that also wraps the stage, so it fits them once they exist. */
  children?: ReactNode;
  /** Turn on its own when not being dragged. */
  autoRotate?: boolean;
  /** Turning speed in radians per second. */
  speed?: number;
  /** Let the pointer orbit it. Horizontal drags turn; vertical touches still scroll the page. */
  draggable?: boolean;
  /** How far it can be tipped away from and toward the viewer, in radians: [min, max]. */
  polar?: [number, number];
  /** The tip it starts at, in radians. */
  initialPolar?: number;
  /** Limits for turning, in radians: [min, max]. Without it the object turns all the way round. */
  azimuth?: [number, number];
  /** The largest dimension the object is scaled to, in scene units. `false` keeps its own size and only centres it. */
  size?: number | false;
  /** Add an ambient and a directional light. Turn off to light the object yourself. */
  lights?: boolean;
  /** Where the stage sits in the scene. */
  position?: [number, number, number];
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function ModelStage({
  children,
  autoRotate = true,
  speed = 0.4,
  draggable = true,
  polar = [-0.3, 0.7],
  initialPolar = 0.2,
  azimuth,
  size = 3,
  lights = true,
  position,
}: ModelStageProps) {
  const tilt = useRef<Group>(null);
  const pivot = useRef<Group>(null);
  const content = useRef<Group>(null);
  const motion = useRef({ turn: 0, tip: initialPolar, velocity: 0, direction: 1, dragging: false, pointer: -1, x: 0, y: 0, at: 0 });
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const [minPolar, maxPolar] = polar;
  const minAzimuth = azimuth?.[0] ?? -Infinity;
  const maxAzimuth = azimuth?.[1] ?? Infinity;

  // Scratch maths objects, made once. They hold no GPU memory, so there is nothing to dispose.
  const scratch = useMemo(() => ({ box: new Box3(), center: new Vector3(), extent: new Vector3(), scale: new Vector3() }), []);

  // Centre and fit after every render of the stage: the child may have changed.
  useLayoutEffect(() => {
    const outer = tilt.current;
    const turntable = pivot.current;
    const inner = content.current;
    if (!outer || !turntable || !inner) return;
    inner.position.set(0, 0, 0);
    inner.scale.setScalar(1);
    // Measure with the stage unturned (the next frame turns it back), in the turntable's own space.
    outer.rotation.set(0, 0, 0);
    turntable.rotation.set(0, 0, 0);
    turntable.updateWorldMatrix(true, true);
    scratch.box.setFromObject(inner);
    if (scratch.box.isEmpty()) return;
    scratch.box.getCenter(scratch.center);
    scratch.box.getSize(scratch.extent);
    turntable.worldToLocal(scratch.center);
    const parentScale = turntable.getWorldScale(scratch.scale).x || 1;
    const largest = Math.max(scratch.extent.x, scratch.extent.y, scratch.extent.z) / parentScale;
    const factor = size === false || largest <= 0 ? 1 : size / largest;
    inner.scale.setScalar(factor);
    inner.position.copy(scratch.center).multiplyScalar(-factor);
    invalidate();
  });

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
      const turn = (event.clientX - state.x) * 0.008;
      const seconds = Math.max(1, event.timeStamp - state.at) / 1000;
      state.turn = clamp(state.turn + turn, minAzimuth, maxAzimuth);
      state.tip = clamp(state.tip + (event.clientY - state.y) * 0.006, minPolar, maxPolar);
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
      state.velocity = clamp(state.velocity, -8, 8);
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
  }, [canvas, draggable, invalidate, minAzimuth, maxAzimuth, minPolar, maxPolar]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const state = motion.current;
    if (!state.dragging) {
      const own = autoRotate ? speed * state.direction : 0;
      state.turn += (own + state.velocity) * dt;
      state.velocity *= Math.exp(-dt * 3);
      // With limits, the turntable swings back and forth between them.
      if (state.turn > maxAzimuth) {
        state.turn = maxAzimuth;
        state.direction = -1;
        state.velocity = 0;
      } else if (state.turn < minAzimuth) {
        state.turn = minAzimuth;
        state.direction = 1;
        state.velocity = 0;
      }
    }
    state.tip = clamp(state.tip, minPolar, maxPolar);
    if (tilt.current) tilt.current.rotation.x = state.tip;
    if (pivot.current) pivot.current.rotation.y = state.turn;
  });

  return (
    <>
      {lights ? (
        <>
          <ambientLight intensity={1.9} />
          <directionalLight position={[3, 5, 4]} intensity={1.7} />
        </>
      ) : null}
      <group ref={tilt} position={position}>
        <group ref={pivot}>
          <group ref={content}>{children}</group>
        </group>
      </group>
    </>
  );
}
