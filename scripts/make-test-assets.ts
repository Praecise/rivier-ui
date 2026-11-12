#!/usr/bin/env node
// Rivier UI: writes the small 3D files the showcase's model viewer loads (site/public/models/).
//
//   node --experimental-strip-types --no-warnings scripts/make-test-assets.ts
//
// Everything is computed here: a faceted vase as binary glTF (whole, and with its neck broken off, for the
// then-and-now demonstration), as USDZ for AR Quick Look, and as Gaussian splats in three formats (.spz,
// .ply, .splat).
// No scan, capture or third-party model is involved, so the files carry the repository's own licence. The
// output is deterministic: running it again writes the same bytes.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, gzipSync } from "node:zlib";
import { libraryDir } from "./registry.ts";

const outDir = join(libraryDir, "site", "public", "models");
mkdirSync(outDir, { recursive: true });

type Vec3 = [number, number, number];

/** The vase's outline: [height, radius] from foot to lip. */
const PROFILE: [number, number][] = [
  [0, 0.34],
  [0.06, 0.4],
  [0.3, 0.62],
  [0.62, 0.7],
  [0.95, 0.56],
  [1.2, 0.3],
  [1.42, 0.24],
  [1.6, 0.36],
];
const SIDES = 14;

/** Three bands of colour, as linear RGB: clay, a painted belt, a pale neck. */
const BANDS: Vec3[] = [
  [0.52, 0.21, 0.1],
  [0.09, 0.27, 0.36],
  [0.74, 0.62, 0.45],
];
const bandAt = (height: number): Vec3 => BANDS[height < 0.3 ? 0 : height < 0.95 ? 1 : 2] ?? [1, 1, 1];

const ring = (index: number, side: number): Vec3 => {
  const [height, radius] = PROFILE[index] ?? [0, 0];
  const angle = (side / SIDES) * Math.PI * 2;
  return [Math.cos(angle) * radius, height - 0.8, Math.sin(angle) * radius];
};
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};

type Triangle = { points: [Vec3, Vec3, Vec3]; normal: Vec3; band: number };

/** Flat-shaded triangles of the vase up to ring `rings` (the whole outline, or fewer for the broken one). */
function triangles(rings: number): Triangle[] {
  const list: Triangle[] = [];
  const triangle = (a: Vec3, b: Vec3, c: Vec3, band: number): void => {
    list.push({ points: [a, b, c], normal: unit(cross(sub(b, a), sub(c, a))), band });
  };
  for (let index = 0; index < rings - 1; index += 1) {
    const band = BANDS.indexOf(bandAt(((PROFILE[index]?.[0] ?? 0) + (PROFILE[index + 1]?.[0] ?? 0)) / 2));
    for (let side = 0; side < SIDES; side += 1) {
      const a = ring(index, side);
      const b = ring(index, side + 1);
      const c = ring(index + 1, side + 1);
      const d = ring(index + 1, side);
      // Counter-clockwise seen from outside.
      triangle(a, d, c, band);
      triangle(a, c, b, band);
    }
  }
  // The foot, closed.
  const base: Vec3 = [0, -0.8, 0];
  for (let side = 0; side < SIDES; side += 1) triangle(base, ring(0, side), ring(0, side + 1), 0);
  return list;
}

function vase(rings: number): { positions: number[]; normals: number[]; colors: number[] } {
  const list = triangles(rings);
  return {
    positions: list.flatMap((triangle) => triangle.points.flat()),
    normals: list.flatMap((triangle) => [...triangle.normal, ...triangle.normal, ...triangle.normal]),
    colors: list.flatMap((triangle) => {
      const color = BANDS[triangle.band] ?? [1, 1, 1];
      return [...color, ...color, ...color];
    }),
  };
}

/** A binary glTF 2.0 file with one mesh: positions, normals and vertex colours, and a double-sided matte material. */
function glb(name: string, rings: number): Buffer {
  const { positions, normals, colors } = vase(rings);
  const count = positions.length / 3;
  const bin = Buffer.alloc(count * 36);
  positions.forEach((value, index) => bin.writeFloatLE(value, index * 4));
  normals.forEach((value, index) => bin.writeFloatLE(value, count * 12 + index * 4));
  colors.forEach((value, index) => bin.writeFloatLE(value, count * 24 + index * 4));
  const axis = (offset: number, pick: (...values: number[]) => number): number => pick(...positions.filter((_, index) => index % 3 === offset));
  const json = {
    asset: { version: "2.0", generator: "rivier-ui scripts/make-test-assets.ts" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, material: 0, mode: 4 }] }],
    materials: [{ name: "matte", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.9 } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count, type: "VEC3", min: [0, 1, 2].map((offset) => axis(offset, Math.min)), max: [0, 1, 2].map((offset) => axis(offset, Math.max)) },
      { bufferView: 1, componentType: 5126, count, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count, type: "VEC3" },
    ],
    bufferViews: [0, 1, 2].map((index) => ({ buffer: 0, byteOffset: index * count * 12, byteLength: count * 12, target: 34962 })),
    buffers: [{ byteLength: bin.length }],
  };
  let text = Buffer.from(JSON.stringify(json), "utf8");
  // Chunks are padded to four bytes: JSON with spaces, binary with zeros.
  text = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + text.length + 8 + bin.length, 8);
  const chunk = (type: number, length: number): Buffer => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(length, 0);
    head.writeUInt32LE(type, 4);
    return head;
  };
  return Buffer.concat([header, chunk(0x4e4f534a, text.length), text, chunk(0x004e4942, bin.length), bin]);
}

type Splat = { position: Vec3; scale: Vec3; rotation: [number, number, number, number]; color: Vec3; alpha: number };

/** A fixed pseudo-random sequence (mulberry32), so the files are the same on every run. */
function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** The vase as flat discs lying on its surface. Colours are display (sRGB) values, as splat files store them. */
function splats(total: number): Splat[] {
  const next = sequence(20261112);
  const list: Splat[] = [];
  const gamma = (value: number): number => Math.pow(value, 1 / 2.2);
  while (list.length < total) {
    const along = next() * (PROFILE.length - 1);
    const index = Math.min(PROFILE.length - 2, Math.floor(along));
    const mix = along - index;
    const [h0, r0] = PROFILE[index] ?? [0, 0];
    const [h1, r1] = PROFILE[index + 1] ?? [0, 0];
    const height = h0 + (h1 - h0) * mix;
    const radius = r0 + (r1 - r0) * mix;
    // Keep the density even: a wide ring holds more discs than a narrow one.
    if (next() > radius / 0.7) continue;
    const angle = next() * Math.PI * 2;
    // Turn the disc to face outwards: a rotation about the vertical axis, then a tip to follow the slope.
    const slope = Math.atan2(r1 - r0, h1 - h0);
    const yaw = -angle;
    const qy: [number, number, number, number] = [Math.cos(yaw / 2), 0, Math.sin(yaw / 2), 0];
    const qz: [number, number, number, number] = [Math.cos(-slope / 2), 0, 0, Math.sin(-slope / 2)];
    const [aw, ax, ay, az] = qy;
    const [bw, bx, by, bz] = qz;
    const rotation: [number, number, number, number] = [aw * bw - ax * bx - ay * by - az * bz, aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw];
    const band = bandAt(height);
    const shade = 0.85 + next() * 0.3;
    list.push({
      position: [Math.cos(angle) * radius, height - 0.8, Math.sin(angle) * radius],
      // Thin along the outward (local x) axis, wide across the surface.
      scale: [0.006, 0.03 + next() * 0.015, 0.03 + next() * 0.015],
      rotation,
      color: [Math.min(1, gamma(band[0]) * shade), Math.min(1, gamma(band[1]) * shade), Math.min(1, gamma(band[2]) * shade)],
      alpha: 0.92,
    });
  }
  return list;
}

const byte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
const SH_C0 = 0.28209479177387814;

/** The ".splat" layout: 32 bytes each: position and scale as floats, colour and rotation as bytes. */
function splatFile(list: Splat[]): Buffer {
  const file = Buffer.alloc(list.length * 32);
  list.forEach((splat, index) => {
    const at = index * 32;
    splat.position.forEach((value, axis) => file.writeFloatLE(value, at + axis * 4));
    splat.scale.forEach((value, axis) => file.writeFloatLE(value, at + 12 + axis * 4));
    [...splat.color, splat.alpha].forEach((value, channel) => file.writeUInt8(byte(value * 255), at + 24 + channel));
    splat.rotation.forEach((value, part) => file.writeUInt8(byte(value * 128 + 128), at + 28 + part));
  });
  return file;
}

/** The PLY layout that 3D Gaussian splatting training writes: colour as a spherical-harmonic constant, opacity as a logit, scale as a logarithm. */
function plyFile(list: Splat[]): Buffer {
  const fields = ["x", "y", "z", "f_dc_0", "f_dc_1", "f_dc_2", "opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"];
  const header = Buffer.from(["ply", "format binary_little_endian 1.0", `element vertex ${list.length}`, ...fields.map((field) => `property float ${field}`), "end_header", ""].join("\n"), "ascii");
  const body = Buffer.alloc(list.length * fields.length * 4);
  list.forEach((splat, index) => {
    const values = [...splat.position, ...splat.color.map((value) => (value - 0.5) / SH_C0), Math.log(splat.alpha / (1 - splat.alpha)), ...splat.scale.map((value) => Math.log(value)), ...splat.rotation];
    values.forEach((value, field) => body.writeFloatLE(value, (index * fields.length + field) * 4));
  });
  return Buffer.concat([header, body]);
}

/** The SPZ layout, version 2: a 16-byte header, then each attribute as its own array, quantised, the whole file gzipped. */
function spzFile(list: Splat[]): Buffer {
  const count = list.length;
  const fractionalBits = 12;
  const header = Buffer.alloc(16);
  header.writeUInt32LE(0x5053474e, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(count, 8);
  header.writeUInt8(0, 12);
  header.writeUInt8(fractionalBits, 13);
  header.writeUInt8(0, 14);
  header.writeUInt8(0, 15);
  const positions = Buffer.alloc(count * 9);
  const alphas = Buffer.alloc(count);
  const colors = Buffer.alloc(count * 3);
  const scales = Buffer.alloc(count * 3);
  const rotations = Buffer.alloc(count * 3);
  list.forEach((splat, index) => {
    splat.position.forEach((value, axis) => {
      const fixed = Math.round(value * (1 << fractionalBits)) & 0xffffff;
      positions.writeUIntLE(fixed, index * 9 + axis * 3, 3);
    });
    alphas.writeUInt8(byte(splat.alpha * 255), index);
    splat.color.forEach((value, channel) => colors.writeUInt8(byte((((value - 0.5) / SH_C0) * 0.15 + 0.5) * 255), index * 3 + channel));
    splat.scale.forEach((value, axis) => scales.writeUInt8(byte((Math.log(value) + 10) * 16), index * 3 + axis));
    // x, y and z of the unit quaternion with w made positive; w is worked out again on reading.
    const [w, x, y, z] = splat.rotation;
    const sign = w < 0 ? -1 : 1;
    [x, y, z].forEach((value, part) => rotations.writeUInt8(byte(value * sign * 127.5 + 127.5), index * 3 + part));
  });
  // No timestamp in the gzip header would differ between runs: zlib writes zero for it.
  return gzipSync(Buffer.concat([header, positions, alphas, colors, scales, rotations]), { level: 9 });
}

/**
 * The vase as USDZ, the format AR Quick Look opens: one text layer (USDA) in a zip archive that is stored,
 * not compressed, with the file's bytes starting at a multiple of 64, as the format requires. One mesh and
 * one matte material per band of colour. A unit is 20 cm, so the vase stands 32 cm tall in a room.
 */
function usdzFile(): Buffer {
  const number = (value: number): string => String(Math.round(value * 100000) / 100000);
  const tuple = (values: readonly number[]): string => `(${values.map(number).join(", ")})`;
  const all = triangles(PROFILE.length);
  const materials = BANDS.map(
    (color, band) => `        def Material "Band${band}"
        {
            token outputs:surface.connect = </Root/Materials/Band${band}/PreviewSurface.outputs:surface>

            def Shader "PreviewSurface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = ${tuple(color)}
                float inputs:metallic = 0
                float inputs:roughness = 0.9
                token outputs:surface
            }
        }`,
  );
  const meshes = BANDS.map((_, band) => {
    const list = all.filter((triangle) => triangle.band === band);
    const count = list.length * 3;
    return `    def Mesh "Band${band}"
    {
        uniform bool doubleSided = 1
        int[] faceVertexCounts = [${list.map(() => 3).join(", ")}]
        int[] faceVertexIndices = [${Array.from({ length: count }, (_, index) => index).join(", ")}]
        normal3f[] normals = [${list.flatMap((triangle) => [tuple(triangle.normal), tuple(triangle.normal), tuple(triangle.normal)]).join(", ")}] (
            interpolation = "vertex"
        )
        point3f[] points = [${list.flatMap((triangle) => triangle.points.map(tuple)).join(", ")}]
        uniform token subdivisionScheme = "none"
        rel material:binding = </Root/Materials/Band${band}>
    }`;
  });
  const layer = Buffer.from(
    `#usda 1.0
(
    customLayerData = {
        string creator = "rivier-ui scripts/make-test-assets.ts"
    }
    defaultPrim = "Root"
    metersPerUnit = 0.2
    upAxis = "Y"
)

def Xform "Root"
{
    def Scope "Materials"
    {
${materials.join("\n\n")}
    }

${meshes.join("\n\n")}
}
`,
    "utf8",
  );

  const name = Buffer.from("vase.usda", "ascii");
  // The extra field pads the local header so that the data begins on a 64-byte boundary.
  const unpadded = 30 + name.length + 4;
  const padding = (64 - (unpadded % 64)) % 64;
  const extra = Buffer.alloc(4 + padding);
  extra.writeUInt16LE(0x1986, 0);
  extra.writeUInt16LE(padding, 2);
  const sum = crc32(layer);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(10, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  // A fixed date (1 January 2026), so the file is the same on every run.
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(((2026 - 1980) << 9) | (1 << 5) | 1, 12);
  local.writeUInt32LE(sum, 14);
  local.writeUInt32LE(layer.length, 18);
  local.writeUInt32LE(layer.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(extra.length, 28);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(10, 4);
  central.writeUInt16LE(10, 6);
  local.copy(central, 8, 6, 30);
  central.writeUInt16LE(extra.length, 30);
  const body = Buffer.concat([local, name, extra, layer]);
  const directory = Buffer.concat([central, name, extra]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(body.length, 16);
  return Buffer.concat([body, directory, end]);
}

const cloud = splats(3000);
const files: [string, Buffer][] = [
  ["vase.glb", glb("vase", PROFILE.length)],
  ["vase-broken.glb", glb("vase-broken", 5)],
  ["vase.usdz", usdzFile()],
  // Not a model at all: what the viewer does with a file it cannot read.
  ["not-a-model.glb", Buffer.from("This file is not a model.\n", "utf8")],
  ["vase.spz", spzFile(cloud)],
  ["vase.ply", plyFile(cloud)],
  ["vase.splat", splatFile(cloud)],
];
let total = 0;
for (const [name, data] of files) {
  writeFileSync(join(outDir, name), data);
  total += data.length;
  console.log(`  ${name.padEnd(18)} ${data.length} bytes`);
}
console.log(`${files.length} files in site/public/models, ${total} bytes in all.`);
