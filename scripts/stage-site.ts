#!/usr/bin/env node
// Rivier UI: lays the site out as a plain Next.js app, ready to be built and served anywhere.
//
//   npm run registry ; npm run site:install        (first: the registry and the site's copy of it are current)
//   npm run site:stage -- <folder>
//
// In the library the site lives in site/ and shares the packages installed above it. A host that runs
// "npm ci", "npm run build" and "npm run start" in one folder needs the app at the top of that folder. This
// writes such a folder: the site's source and public files, the generated registry it reads while building
// (registry.json, r/, llms.txt, the conventions and the changelog), and the library's package files with
// "build" and "start" scripts.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { libraryDir } from "./registry.ts";

const target = process.argv[2];
if (!target) {
  console.error("Say where to write it: npm run site:stage -- <folder>");
  process.exit(1);
}
const out = resolve(target);
if (existsSync(out) && readdirSync(out).length > 0) {
  console.error(`${out} is not empty. Give an empty or a new folder.`);
  process.exit(1);
}
const site = join(libraryDir, "site");
if (!existsSync(join(site, "src", "components", "ui", "button.tsx"))) {
  console.error('The site has no copy of the registry yet. Run "npm run site:install" first.');
  process.exit(1);
}
mkdirSync(out, { recursive: true });

for (const name of ["src", "public", "next.config.ts", "postcss.config.json", "tsconfig.json"]) cpSync(join(site, name), join(out, name), { recursive: true });
for (const name of ["registry.json", "llms.txt", "r", "CONVENTIONS.md", "CHANGELOG.md", "LICENSE", "package-lock.json"]) cpSync(join(libraryDir, name), join(out, name), { recursive: true });

const manifest = JSON.parse(readFileSync(join(libraryDir, "package.json"), "utf8")) as { scripts?: Record<string, string>; bin?: unknown; files?: unknown };
manifest.scripts = { build: "next build", start: "next start" };
delete manifest.bin;
delete manifest.files;
writeFileSync(join(out, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`The site is staged in ${out}: npm ci, npm run build, npm run start.`);
