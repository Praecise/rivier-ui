#!/usr/bin/env node
// Rivier UI: the command that puts components into a project.
//
//   rivier-ui list [words]            what there is, or a search
//   rivier-ui info <name>             one item: what it is, when to use it, an example
//   rivier-ui add <name>... | all     copy items, what they depend on, and the theme into the project
//   rivier-ui theme                   copy (or refresh) only the theme
//   rivier-ui doctor                  check a project: theme imported, packages present, files changed
//
// Options, as plain words: dir=<project folder> (default: the current folder), overwrite, dry,
// and prefix=<word> for a project whose Tailwind has a prefix (`@import "tailwindcss" prefix(tw)`):
// every class in what is copied is then written with it (`tw:flex`), and `cn` is told the prefix.
// Run from anywhere:  node --experimental-strip-types <path to>/rivier-ui/scripts/cli.ts add button
// or, from this repository:  npm run ui -- add button dir=../../my-project
//
// A copied file is the project's own: add never overwrites one unless "overwrite" is given.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { prefixClasses, prefixMerge, prefixTheme } from "./prefix.ts";
import { CATEGORIES, loadItems, readTheme, withDependencies, type Item } from "./registry.ts";

const args = process.argv.slice(2);
const command = args[0] ?? "help";
const words = args.slice(1).filter((arg) => !arg.includes("=") && arg !== "overwrite" && arg !== "dry");
const option = (name: string): string => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
const flag = (name: string): boolean => args.includes(name);

const projectDir = resolve(option("dir") || process.cwd());
/** Where "@/…" points in the project: src/ when the project has one, else the project root. */
const sourceDir = existsSync(join(projectDir, "src")) ? join(projectDir, "src") : projectDir;
const THEME_TARGET = "styles/rivier-ui.css";
const prefix = option("prefix");
if (prefix && !/^[a-z][a-z0-9]*$/.test(prefix)) throw new Error(`prefix=${prefix}: a Tailwind prefix is lower-case letters and digits, as in prefix=tw.`);

/** The theme as this project gets it. */
const themeFor = (): string => (prefix ? prefixTheme(readTheme(), prefix) : readTheme());

/** An item as this project gets it: as written, or with the project's prefix on every class. */
function sourceFor(item: Item): string {
  if (!prefix) return item.source;
  if (item.name === "cn") return prefixMerge(item.source, prefix);
  return item.file.endsWith(".tsx") ? prefixClasses(item.source, prefix) : item.source;
}
const THEME_PACKAGES = ["tw-animate-css"];
const BASE_PACKAGES = ["tailwindcss"];

type Manifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

function manifest(): Manifest {
  const path = join(projectDir, "package.json");
  if (!existsSync(path)) throw new Error(`${projectDir} has no package.json. Run this in a project, or pass dir=<project folder>.`);
  return JSON.parse(readFileSync(path, "utf8")) as Manifest;
}

const missingPackages = (wanted: string[]): string[] => {
  const pkg = manifest();
  const have = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
  return [...new Set(wanted)].filter((name) => !have.has(name)).sort();
};

const show = (path: string): string => relative(projectDir, path).replaceAll("\\", "/");

/** Writes a file unless the project already has it. Returns what happened. */
function place(target: string, content: string): "created" | "kept" | "overwritten" | "same" {
  const path = join(sourceDir, target);
  const exists = existsSync(path);
  if (exists && readFileSync(path, "utf8").replace(/\r\n/g, "\n") === content) return "same";
  if (exists && !flag("overwrite")) return "kept";
  if (!flag("dry")) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
  }
  return exists ? "overwritten" : "created";
}

function report(target: string, result: ReturnType<typeof place>): void {
  const note = { created: "create ", overwritten: "replace", same: "same   ", kept: "keep   " }[result];
  const why = result === "kept" ? "  (the project's copy differs; add \"overwrite\" to replace it)" : "";
  console.log(`  ${note} ${show(join(sourceDir, target))}${why}`);
}

/** The global stylesheet that imports Tailwind, if the project has one in a usual place. */
function globalStylesheet(): string | undefined {
  return ["app/globals.css", "styles/globals.css", "index.css", "app.css", "globals.css"].map((path) => join(sourceDir, path)).find(existsSync);
}

function installTheme(): void {
  report(THEME_TARGET, place(THEME_TARGET, themeFor()));
  const sheet = globalStylesheet();
  if (!sheet) {
    console.log(`  note    import "tw-animate-css" and "${THEME_TARGET}" after Tailwind in your global stylesheet`);
    return;
  }
  const css = readFileSync(sheet, "utf8");
  if (css.includes("rivier-ui.css")) return;
  const themePath = relative(dirname(sheet), join(sourceDir, THEME_TARGET)).replaceAll("\\", "/");
  const imports = `@import "tw-animate-css";\n@import "${themePath.startsWith(".") ? themePath : `./${themePath}`}";\n`;
  const tailwind = /@import\s+["']tailwindcss["'][^;]*;\s*\n?/.exec(css);
  if (!tailwind) {
    console.log(`  note    ${show(sheet)} does not import Tailwind; add these lines after it:\n${imports}`);
    return;
  }
  if (!flag("dry")) writeFileSync(sheet, css.replace(tailwind[0], `${tailwind[0].trimEnd()}\n${imports}`), "utf8");
  console.log(`  edit    ${show(sheet)}  (imports the theme after Tailwind)`);
}

/** The package manager the project uses, from its lockfile. */
function packageManager(): string {
  if (existsSync(join(projectDir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(projectDir, "yarn.lock"))) return "yarn";
  if (existsSync(join(projectDir, "bun.lock")) || existsSync(join(projectDir, "bun.lockb"))) return "bun";
  return "npm";
}

/** Installs packages the project does not have yet. `dev`: as dev dependencies (types, needed only to type-check). */
function installPackages(names: string[], dev = false): void {
  if (names.length === 0) return;
  const manager = packageManager();
  // Latest release of each, resolved by the package manager at the time of installing.
  const install = `${manager} ${manager === "npm" ? "install" : "add"}${dev ? " -D" : ""} ${names.map((name) => `${name}@latest`).join(" ")}`;
  if (flag("dry") || !existsSync(join(projectDir, "node_modules"))) {
    console.log(`  note    ${dev ? "dev packages" : "packages"} to install:  ${install}`);
    return;
  }
  console.log(`  run     ${install}`);
  execFileSync(install, { cwd: projectDir, shell: true, stdio: "inherit" });
}

function add(items: Item[], wanted: string[]): void {
  const chosen = wanted.includes("all") ? items : withDependencies(items, wanted);
  console.log(`Rivier UI -> ${projectDir}${flag("dry") ? "  (dry run: nothing is written)" : ""}`);
  installTheme();
  for (const item of chosen) report(item.target, place(item.target, sourceFor(item)));
  installPackages(missingPackages([...BASE_PACKAGES, ...THEME_PACKAGES, ...chosen.flatMap((item) => item.dependencies)]));
  // The types of packages that do not carry their own: without them the project's type-check fails on the copied file.
  installPackages(missingPackages(chosen.flatMap((item) => item.devDependencies)), true);
  console.log(`\n${chosen.length} item${chosen.length === 1 ? "" : "s"}. Import as "@/${chosen.at(-1)?.target.replace(/\.tsx?$/, "")}".`);
}

function list(items: Item[], query: string[]): void {
  const matches = items.filter((item) => query.every((word) => `${item.name} ${item.category} ${item.description} ${item.when}`.toLowerCase().includes(word.toLowerCase())));
  if (matches.length === 0) {
    console.log(`Nothing in Rivier UI matches "${query.join(" ")}".`);
    return;
  }
  for (const category of CATEGORIES) {
    const group = matches.filter((item) => item.category === category);
    if (group.length === 0) continue;
    console.log(`\n${category}`);
    for (const item of group) console.log(`  ${item.name.padEnd(20)} ${item.description}`);
  }
}

function info(items: Item[], name: string): void {
  const item = items.find((candidate) => candidate.name === name);
  if (!item) throw new Error(`There is no "${name}" in Rivier UI. Run "rivier-ui list" to see what there is.`);
  console.log(
    [
      `${item.name}  (${item.category}${item.client ? ", client component" : ""})`,
      "",
      item.description,
      "",
      `Use it: ${item.when}`,
      "",
      `Goes to:   ${item.target}`,
      `Needs:     ${[...item.registryDependencies, ...item.dependencies].join(", ") || "nothing else"}`,
      ...(item.devDependencies.length > 0 ? [`Types:     ${item.devDependencies.join(", ")} (dev)`] : []),
      "",
      item.example,
    ].join("\n"),
  );
}

function doctor(items: Item[]): number {
  let problems = 0;
  const say = (ok: boolean, text: string): void => {
    console.log(`  ${ok ? "ok  " : "FIX "} ${text}`);
    if (!ok) problems++;
  };
  console.log(`Rivier UI doctor: ${projectDir}`);
  const theme = join(sourceDir, THEME_TARGET);
  say(existsSync(theme), `theme present (${show(theme)})`);
  if (existsSync(theme)) say(readFileSync(theme, "utf8").replace(/\r\n/g, "\n") === themeFor(), "theme is the current one (run \"rivier-ui theme overwrite\" to refresh; your edits would be lost)");
  const sheet = globalStylesheet();
  say(Boolean(sheet && readFileSync(sheet, "utf8").includes("rivier-ui.css")), "global stylesheet imports the theme");
  const installed = items.filter((item) => existsSync(join(sourceDir, item.target)));
  const changed = installed.filter((item) => readFileSync(join(sourceDir, item.target), "utf8").replace(/\r\n/g, "\n") !== sourceFor(item));
  console.log(`  info ${installed.length} of ${items.length} items installed; ${changed.length} differ from the library${changed.length ? `: ${changed.map((item) => item.name).join(", ")}` : ""}`);
  const names = new Set(installed.map((item) => item.name));
  for (const item of installed) {
    for (const needed of item.registryDependencies) say(names.has(needed), `${item.name} needs ${needed}`);
  }
  const missing = missingPackages([...BASE_PACKAGES, ...THEME_PACKAGES, ...installed.flatMap((item) => item.dependencies)]);
  say(missing.length === 0, missing.length ? `packages missing from package.json: ${missing.join(", ")}` : "packages present");
  const missingTypes = missingPackages(installed.flatMap((item) => item.devDependencies));
  say(missingTypes.length === 0, missingTypes.length ? `types missing from package.json (dev dependencies): ${missingTypes.join(", ")}` : "types present");
  return problems === 0 ? 0 : 1;
}

const HELP = `Rivier UI

  rivier-ui list [words]            what there is, or a search
  rivier-ui info <name>             what an item is, when to use it, an example
  rivier-ui add <name>... | all     copy items, what they need, and the theme into the project
  rivier-ui theme                   copy (or refresh) only the theme
  rivier-ui doctor                  check a project

Options: dir=<project folder>   overwrite   dry   prefix=<tailwind prefix>`;

try {
  const items = loadItems();
  if (command === "list") list(items, words);
  else if (command === "info" && words[0]) info(items, words[0]);
  else if (command === "add" && words.length > 0) add(items, words);
  else if (command === "theme") {
    manifest();
    installTheme();
    installPackages(missingPackages([...BASE_PACKAGES, ...THEME_PACKAGES]));
  } else if (command === "doctor") process.exitCode = doctor(items);
  else {
    console.log(HELP);
    if (command !== "help") process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
