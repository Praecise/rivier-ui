// Rivier UI: reads the registry's source files. Shared by the build script and the CLI.
//
// An item is one file in registry/<category>/. Its header comment gives its name, description, when to use it
// and an example; its imports give its dependencies. Nothing is listed by hand.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const libraryDir: string = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const registryDir: string = join(libraryDir, "registry");

export const CATEGORIES = ["lib", "ui", "layout", "motion", "three", "viz"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Item = {
  name: string;
  category: Category;
  description: string;
  when: string;
  example: string;
  /** Path of the source, relative to registry/ ("ui/button.tsx"). */
  file: string;
  /** Where it goes in a project, relative to the project's source folder. */
  target: string;
  /** npm packages it imports. */
  dependencies: string[];
  /** Other items it imports. */
  registryDependencies: string[];
  /** Whether it is a client component. */
  client: boolean;
  source: string;
};

/** Packages every project already has, or that are not installed by name. */
const IMPLICIT = new Set(["react", "react-dom", "next"]);

const packageOf = (specifier: string): string =>
  specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : (specifier.split("/")[0] ?? specifier);

/** "lib/cn.ts" -> "lib/cn.ts"; "ui/button.tsx" -> "components/ui/button.tsx". */
export const targetOf = (file: string): string => (file.startsWith("lib/") ? file : `components/${file}`);

function parse(file: string): Item {
  const source = readFileSync(join(registryDir, file), "utf8").replace(/\r\n/g, "\n");
  const fail = (problem: string): never => {
    throw new Error(`registry/${file}: ${problem}`);
  };
  const header = /\/\*\*\n([\s\S]*?)\n \*\//.exec(source)?.[1];
  if (!header) return fail("the file must start with a /** header */ (see CONVENTIONS.md)");
  const lines = header.split("\n").map((line) => line.replace(/^ \* ?/, ""));

  const tags: Record<string, string[]> = {};
  let current = "";
  for (const line of lines) {
    const tag = /^@(\w+)\s?(.*)$/.exec(line);
    if (tag) {
      current = tag[1] ?? "";
      tags[current] = tag[2] ? [tag[2]] : [];
    } else if (current) {
      tags[current]?.push(line);
    }
  }
  const one = (tag: string): string => {
    const value = (tags[tag] ?? []).join(" ").trim();
    return value || fail(`@${tag} is missing from the header`);
  };

  const category = file.split("/")[0] as Category;
  const name = one("name");
  if (one("category") !== category) fail(`@category must be "${category}", the folder the file is in`);
  if (name !== file.split("/")[1]?.replace(/\.tsx?$/, "")) fail(`@name must match the file name`);
  const example = (tags["example"] ?? []).join("\n").trim() || fail("@example is missing from the header");

  const dependencies = new Set<string>();
  const registryDependencies = new Set<string>();
  for (const match of source.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+"([^"]+)"|^\s*import\s+"([^"]+)"|import\("([^"]+)"\)/gm)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? "";
    if (specifier.startsWith(".")) fail(`relative import "${specifier}": import registry files through "@/…"`);
    const local = /^@\/(?:components\/((?:ui|layout|motion|three|viz)\/[\w-]+)|(lib\/[\w-]+))$/.exec(specifier);
    if (local) registryDependencies.add((local[1] ?? local[2] ?? "").split("/")[1] ?? "");
    else if (specifier.startsWith("@/")) fail(`unknown alias import "${specifier}"`);
    else if (!specifier.startsWith("node:") && !IMPLICIT.has(packageOf(specifier))) dependencies.add(packageOf(specifier));
  }

  return {
    name,
    category,
    description: one("description"),
    when: one("when"),
    example,
    file,
    target: targetOf(file),
    dependencies: [...dependencies].sort(),
    registryDependencies: [...registryDependencies].sort(),
    client: /^\s*"use client";?/.test(source),
    source,
  };
}

/** Every item in the registry, checked, in category then name order. */
export function loadItems(): Item[] {
  const items: Item[] = [];
  for (const category of CATEGORIES) {
    const dir = join(registryDir, category);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir).sort()) {
      if (/\.tsx?$/.test(entry)) items.push(parse(`${category}/${entry}`));
    }
  }
  const names = new Set<string>();
  for (const item of items) {
    if (names.has(item.name)) throw new Error(`Two registry items are named "${item.name}". Names are unique across categories.`);
    names.add(item.name);
  }
  for (const item of items) {
    for (const needed of item.registryDependencies) {
      if (!names.has(needed)) throw new Error(`registry/${item.file}: imports "${needed}", which is not in the registry`);
    }
  }
  return items;
}

/** The items asked for, with everything they depend on, dependencies first. */
export function withDependencies(items: Item[], wanted: string[]): Item[] {
  const byName = new Map(items.map((item) => [item.name, item]));
  const ordered: Item[] = [];
  const seen = new Set<string>();
  const add = (name: string): void => {
    if (seen.has(name)) return;
    seen.add(name);
    const item = byName.get(name);
    if (!item) throw new Error(`There is no "${name}" in Rivier UI. Run "rivier-ui list" to see what there is.`);
    for (const needed of item.registryDependencies) add(needed);
    ordered.push(item);
  };
  for (const name of wanted) add(name);
  return ordered;
}

export const themeFile = "theme/rivier-ui.css";
export const readTheme = (): string => readFileSync(join(registryDir, themeFile), "utf8").replace(/\r\n/g, "\n");
