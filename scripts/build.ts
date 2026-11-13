#!/usr/bin/env node
// Rivier UI: checks every registry file and writes what is generated from them.
//
//   npm run registry            check, and write registry.json, r/<name>.json, llms.txt
//   npm run registry -- check   check only
//
// Generated files are committed, so the library can be read and installed without running anything.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORIES, TYPES, carriesTypes, libraryDir, loadItems, readTheme, type Category, type Item } from "./registry.ts";

/** The namespace other tools use for this registry: "@rivier-ui/button". */
const NAMESPACE = "@rivier-ui";
const SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";

const TYPE: Record<Category, string> = {
  lib: "registry:lib",
  ui: "registry:ui",
  layout: "registry:component",
  motion: "registry:component",
  three: "registry:component",
  viz: "registry:component",
};

const HEADING: Record<Category, string> = {
  lib: "Helpers",
  ui: "Controls and surfaces",
  layout: "Layout",
  motion: "Motion and transitions",
  three: "3D",
  viz: "Visualisation",
};

const title = (name: string): string => name.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

/** One item in the registry-item format that shadcn-compatible tools read. */
function registryItem(item: Item, withContent: boolean): Record<string, unknown> {
  return {
    ...(withContent ? { $schema: SCHEMA } : {}),
    name: item.name,
    type: TYPE[item.category],
    title: title(item.name),
    description: item.description,
    categories: [item.category],
    dependencies: item.dependencies,
    ...(item.devDependencies.length > 0 ? { devDependencies: item.devDependencies } : {}),
    registryDependencies: ["theme", ...item.registryDependencies].map((name) => `${NAMESPACE}/${name}`),
    files: [{ path: `registry/${item.file}`, type: TYPE[item.category], target: item.target, ...(withContent ? { content: item.source } : {}) }],
    meta: { category: item.category, when: item.when, example: item.example, client: item.client },
  };
}

function themeItem(withContent: boolean): Record<string, unknown> {
  return {
    ...(withContent ? { $schema: SCHEMA } : {}),
    name: "theme",
    type: "registry:file",
    title: "Theme",
    description: "The tokens every Rivier UI component draws from: colours, the highlight colour, roundness, motion. Light and dark.",
    dependencies: ["tw-animate-css"],
    registryDependencies: [],
    files: [{ path: "registry/theme/rivier-ui.css", type: "registry:file", target: "styles/rivier-ui.css", ...(withContent ? { content: readTheme() } : {}) }],
    meta: { category: "theme", when: "Always: install it first and import it after Tailwind in the global stylesheet." },
  };
}

function llms(items: Item[]): string {
  const lines = [
    "# Rivier UI",
    "",
    "> A component library for AI-native development: React components you copy into a project and own, themed",
    "> from one place (light or dark, square to round, any highlight colour), covering controls, layout and bento",
    "> grids, motion and transitions, 3D and charts, dates, flows, conversation, media. Built on Radix, Tailwind CSS,",
    "> Motion and three.js. Keyboard operable, right-to-left safe, no fixed words: labels are props.",
    "",
    "Install an item into a project: `rivier-ui add <name>` (it brings what the item depends on, and the theme).",
    "Imports in a project: `@/components/<category>/<name>` and `@/lib/cn`.",
    "Rules for using and writing components: CONVENTIONS.md. Theming: registry/theme/rivier-ui.css.",
    "",
  ];
  for (const category of CATEGORIES) {
    const group = items.filter((item) => item.category === category);
    if (group.length === 0) continue;
    lines.push(`## ${HEADING[category]}`, "");
    for (const item of group) {
      lines.push(`### ${item.name}`, "", item.description, "", `Use it: ${item.when}`, "", "```tsx", item.example, "```", "");
    }
  }
  return lines.join("\n");
}

/** Every dependency either carries its types or is listed with the package that does: otherwise a project's type-check fails on the copied file. */
function checkTypes(items: Item[]): void {
  for (const name of new Set(items.flatMap((item) => item.dependencies))) {
    if (name in TYPES || carriesTypes(name) !== false) continue;
    const user = items.find((item) => item.dependencies.includes(name));
    throw new Error(`registry/${user?.file ?? ""}: "${name}" has no types of its own. Add it to TYPES in scripts/registry.ts with the package that carries them, so that "add" installs both.`);
  }
}

try {
  const items = loadItems();
  checkTypes(items);
  const counts = CATEGORIES.map((category) => `${items.filter((item) => item.category === category).length} ${category}`).join(", ");
  if (process.argv[2] === "check") {
    console.log(`Rivier UI registry is sound: ${items.length} items (${counts})`);
  } else {
    const write = (path: string, data: unknown): void =>
      writeFileSync(join(libraryDir, path), typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n", "utf8");
    write("registry.json", {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "rivier-ui",
      homepage: "https://rivier.ai",
      items: [themeItem(false), ...items.map((item) => registryItem(item, false))],
    });
    rmSync(join(libraryDir, "r"), { recursive: true, force: true });
    mkdirSync(join(libraryDir, "r"), { recursive: true });
    write("r/theme.json", themeItem(true));
    for (const item of items) write(`r/${item.name}.json`, registryItem(item, true));
    write("llms.txt", llms(items));
    console.log(`Rivier UI registry built: ${items.length} items (${counts})`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
