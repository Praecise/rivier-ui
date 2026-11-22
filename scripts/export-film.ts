#!/usr/bin/env node
// Rivier UI: exports a film-stage (or an explainer) as frames, and as an MP4 when ffmpeg is installed.
//
//   node --experimental-strip-types scripts/export-film.ts url=http://localhost:3320/explainers name=demo
//   options: fps=30  out=<folder>  width=1280  height=720  from=0  to=<seconds>  format=auto|mp4|zip
//            selector="<css of the element to picture>"  browser="<path to Chrome or Edge>"  scale=1
//
// The page must hold a stage with `deterministic` and `exportName="<name>"`: nothing on it moves by itself,
// and window.__filmStage.<name>.renderAt(t) draws the moment t and resolves once its pictures are ready. For
// each frame this calls renderAt(frame / fps) and saves a picture of the stage's frame as PNG. Then, with
// ffmpeg on the PATH, it writes <out>/<name>.mp4 (H.264, yuv420p); without it, or with format=zip, it writes
// <out>/<name>.zip: the PNG frames in order and a manifest.json (name, fps, frame count, duration, size).

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { crc32 } from "node:zlib";
import puppeteer from "puppeteer-core";
import { libraryDir } from "./registry.ts";
import { DEFAULT_BROWSER } from "./smoke-kit.ts";

const args = process.argv.slice(2);
const option = (name: string, fallback = ""): string => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? fallback;
const url = option("url");
const name = option("name", "main");
if (!url) {
  console.error("Give the page: url=http://localhost:3320/explainers name=<exportName>");
  process.exit(1);
}
const fps = Math.max(1, Number(option("fps", "30")));
const width = Number(option("width", "1280"));
const height = Number(option("height", "720"));
const scale = Math.max(1, Number(option("scale", "1")));
const format = option("format", "auto");
const out = resolve(option("out", join(libraryDir, ".film", name)));
const framesDir = join(out, "frames");
const selector = option("selector", `[data-film-export="${name}"] [data-slot=film-stage-frame], [data-deterministic] [data-slot=film-stage-frame]`);

type Handle = { renderAt: (time: number, options?: { timeout?: number }) => Promise<number>; clock: { duration: () => number } };
type Host = { __filmStage?: Record<string, Handle> };

rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: option("browser") || DEFAULT_BROWSER, headless: true, args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let count = 0;
let duration = 0;
let box = { width: 0, height: 0 };
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  // The film is drawn as the person would see it with motion allowed; nothing moves without renderAt.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 120_000 });
  await page.waitForFunction((n) => Boolean((window as unknown as Host).__filmStage?.[n]), { timeout: 60_000 }, name);
  duration = await page.evaluate((n) => (window as unknown as Host).__filmStage?.[n]?.clock.duration() ?? 0, name);
  if (!(duration > 0)) throw new Error(`The stage "${name}" has no length.`);
  const from = Math.max(0, Number(option("from", "0")));
  const to = Math.min(duration, Number(option("to", String(duration))));
  const element = await page.$(selector);
  if (!element) throw new Error(`Nothing on the page matches ${selector}.`);
  await element.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  const frames = Math.max(1, Math.ceil((to - from) * fps));
  for (let frame = 0; frame < frames; frame++) {
    // The last frame is drawn just before the end, where the last scene is still on stage.
    const time = Math.min(to - 1e-3, from + frame / fps);
    await page.evaluate((n, t) => (window as unknown as Host).__filmStage?.[n]?.renderAt(t, { timeout: 15_000 }), name, time);
    const file = join(framesDir, `frame-${String(frame + 1).padStart(5, "0")}.png`) as `${string}.png`;
    await element.screenshot({ path: file });
    count++;
    if (frame % fps === 0) process.stdout.write(`\r  frame ${frame + 1} of ${frames} (${time.toFixed(2)} s)`);
  }
  const rect = await element.boundingBox();
  box = { width: Math.round((rect?.width ?? 0) * scale), height: Math.round((rect?.height ?? 0) * scale) };
  process.stdout.write("\n");
} finally {
  await browser.close();
}

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
if ((format === "auto" && hasFfmpeg) || format === "mp4") {
  if (!hasFfmpeg) {
    console.error("format=mp4 needs ffmpeg on the PATH. The frames are in " + framesDir);
    process.exit(1);
  }
  const video = join(out, `${name}.mp4`);
  // Even sides: H.264 in yuv420p cannot take an odd width or height.
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-framerate",
      String(fps),
      "-i",
      join(framesDir, "frame-%05d.png"),
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      video,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`${count} frames at ${fps} fps (${duration.toFixed(2)} s): ${video}`);
} else {
  const archive = join(out, `${name}.zip`);
  const files = readdirSync(framesDir)
    .filter((file) => file.endsWith(".png"))
    .sort();
  const manifest = { name, fps, frames: files.length, duration, width: box.width, height: box.height, files };
  writeZip(archive, [{ name: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2)) }, ...files.map((file) => ({ name: file, data: readFileSync(join(framesDir, file)) }))]);
  console.log(`${count} frames at ${fps} fps (${duration.toFixed(2)} s)${hasFfmpeg ? "" : " (no ffmpeg on the PATH, so no MP4)"}: ${archive}`);
}

/**
 * Writes a ZIP archive with the entries stored as they are (PNG is compressed already). The format is the
 * plain one every unzip reads: a local header and the data for each entry, then the central directory.
 */
function writeZip(path: string, entries: { name: string; data: Buffer }[]): void {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  // A fixed time (1 January 2026, 00:00) keeps the archive the same for the same frames.
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, name, entry.data);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(dosTime, 12);
    header.writeUInt16LE(dosDate, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(entry.data.length, 20);
    header.writeUInt32LE(entry.data.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(offset, 42);
    central.push(header, name);
    offset += local.length + name.length + entry.data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  writeFileSync(path, Buffer.concat([...parts, directory, end]));
}
