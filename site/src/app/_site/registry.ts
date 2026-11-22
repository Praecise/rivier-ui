// Site: what the pages know about the library. Read from the generated registry (registry.json, r/) and from
// the showcase's own source, when the site is built. Server only: every page that uses it is static.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** The library's folder: the site is built from there, or from site/ inside it. */
const root = existsSync(join(process.cwd(), "registry.json")) ? process.cwd() : join(process.cwd(), "..");

export const readLibraryFile = (path: string): string => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

export const SITE = "https://ui.rivier.ai";

export const CATEGORIES = [
  { id: "ui", title: "Controls and surfaces", description: "Buttons, fields, menus, dialogs, dates, lists, conversation parts, players and records." },
  { id: "layout", title: "Layout", description: "Containers, sections, a bento grid, a marquee and frames." },
  { id: "motion", title: "Motion", description: "Reveals, scroll scenes, pointer effects and page transitions, from the theme's durations." },
  { id: "three", title: "3D", description: "Scenes that take their colours from the theme and fall back to a still." },
  { id: "viz", title: "Charts", description: "SVG charts and sparklines in the theme's series colours, each with a text alternative." },
  { id: "lib", title: "Helpers", description: "Class names, motion tokens, reading direction, announcements and controllable state." },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export type Item = {
  name: string;
  title: string;
  category: CategoryId;
  description: string;
  when: string;
  example: string;
  client: boolean;
  dependencies: string[];
  registryDependencies: string[];
  /** Where the file goes in a project, from its source folder. */
  target: string;
  source: string;
};

type Raw = {
  name: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files?: { path: string; target?: string; content?: string }[];
  meta?: { category?: string; when?: string; example?: string; client?: boolean };
};

const bare = (name: string): string => name.replace(/^@rivier-ui\//, "");

let cache: Item[] | undefined;

/** Every component and helper, in category then name order. The theme is not one of them: it has its own page. */
export function items(): Item[] {
  if (cache) return cache;
  const order = CATEGORIES.map((category) => category.id as string);
  const all: Item[] = [];
  for (const file of readdirSync(join(root, "r")).sort()) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(readLibraryFile(`r/${file}`)) as Raw;
    const category = raw.meta?.category ?? "";
    if (!order.includes(category)) continue;
    const first = raw.files?.[0];
    all.push({
      name: raw.name,
      title: raw.title ?? raw.name,
      category: category as CategoryId,
      description: raw.description ?? "",
      when: raw.meta?.when ?? "",
      example: raw.meta?.example ?? "",
      client: raw.meta?.client ?? false,
      dependencies: raw.dependencies ?? [],
      registryDependencies: (raw.registryDependencies ?? []).map(bare).filter((name) => name !== "theme"),
      target: first?.target ?? first?.path ?? "",
      source: first?.content ?? "",
    });
  }
  all.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name));
  cache = all;
  return all;
}

export const item = (name: string): Item | undefined => items().find((entry) => entry.name === name);

/** The items that import this one. */
export const usedBy = (name: string): string[] =>
  items()
    .filter((entry) => entry.registryDependencies.includes(name))
    .map((entry) => entry.name);

/** The import path of an item in a project. */
export const importPath = (entry: Item): string => `@/${entry.target.replace(/^src\//, "").replace(/\.tsx?$/, "")}`;

/* ── Live demonstrations ─────────────────────────────────────────────────────────────────────────────── */

/** The showcase files that hold demonstrations, with the page each is shown on. */
export const GROUPS = {
  controls: { href: "/showcase#controls", title: "Controls" },
  overlays: { href: "/showcase#overlays", title: "Overlays and navigation" },
  display: { href: "/showcase#display", title: "Display" },
  layouts: { href: "/showcase#layout", title: "Layout" },
  motions: { href: "/showcase#motion", title: "Motion and transitions" },
  three: { href: "/showcase#three", title: "3D" },
  "overview-charts": { href: "/showcase#charts", title: "Charts" },
  foundations: { href: "/foundations", title: "Foundations" },
  choices: { href: "/choices", title: "Choices" },
  dates: { href: "/dates", title: "Dates and times" },
  flows: { href: "/flows", title: "Flows and lists" },
  panels: { href: "/panels", title: "Panels" },
  conversation: { href: "/conversation", title: "Conversation" },
  gallery: { href: "/gallery", title: "Pictures" },
  players: { href: "/players", title: "Video and audio" },
  records: { href: "/records", title: "Records" },
  models: { href: "/models", title: "Models" },
  evidence: { href: "/evidence", title: "Comparison" },
  carousel: { href: "/carousel", title: "Carousels and media rows" },
  lists: { href: "/lists", title: "Lists" },
  stage: { href: "/stage", title: "Stage" },
  charts: { href: "/charts", title: "Charts" },
  maps: { href: "/maps", title: "Maps" },
  explainers: { href: "/explainers", title: "Explainers" },
  grid: { href: "/grid", title: "Data grid" },
  entry: { href: "/entry", title: "Data entry" },
  surfaces: { href: "/surfaces", title: "Surfaces and navigation" },
  boards: { href: "/boards", title: "Trees, boards and diagrams" },
  editors: { href: "/editors", title: "Code, text and pictures" },
  effects: { href: "/effects", title: "Effects and 3D data" },
} as const;

export type GroupId = keyof typeof GROUPS;

/** The source file of each group. Two groups share one file. */
const FILES: Record<GroupId, string> = {
  ...(Object.fromEntries(Object.keys(GROUPS).map((id) => [id, `${id}.tsx`])) as Record<GroupId, string>),
  three: "visuals.tsx",
  "overview-charts": "visuals.tsx",
};

export type Live = { group: GroupId; href: string; page: string; titles: string[] };

type Block = { group: GroupId; title: string; names: Set<string> };

let blocks: Block[] | undefined;

/** Every titled demonstration in the showcase, with the items it uses: read from the imports and the markup. */
function demonstrations(): Block[] {
  if (blocks) return blocks;
  const found: Block[] = [];
  // In the library the site is in site/; in a tree staged for release (scripts/stage-site.ts) it is the root.
  const dir = [join(root, "site", "src", "app", "_showcase"), join(root, "src", "app", "_showcase")].find((path) => existsSync(path)) ?? "";
  for (const group of Object.keys(GROUPS) as GroupId[]) {
    const path = join(dir, FILES[group]);
    if (!existsSync(path)) continue;
    let source = readFileSync(path, "utf8");
    const owner = new Map<string, string>();
    for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@\/(?:components\/\w+|lib)\/([\w-]+)"/g)) {
      for (const part of (match[1] ?? "").split(",")) {
        const word = part.replace(/^\s*type\s+/, "").trim().split(/\s+as\s+/).pop() ?? "";
        if (word) owner.set(word, match[2] ?? "");
      }
    }
    // The file that holds two groups: each is one exported function.
    if (FILES[group] === "visuals.tsx") {
      const start = source.indexOf(`export function ${group === "three" ? "Three" : "Charts"}(`);
      const next = source.indexOf("export function ", start + 10);
      source = source.slice(start, next === -1 ? undefined : next);
    }
    const starts = [...source.matchAll(/<Demo\s+title="([^"]+)"/g)];
    starts.forEach((match, index) => {
      const body = source.slice(match.index, starts[index + 1]?.index);
      const names = new Set<string>();
      for (const [word, name] of owner) if (new RegExp(`\\b${word}\\b`).test(body)) names.add(name);
      found.push({ group, title: match[1] ?? "", names });
    });
  }
  blocks = found;
  return found;
}

/** Where an item is shown working: the demonstrations most about it, all in one group. */
export function liveFor(name: string): Live | undefined {
  const words = name.replace(/-/g, " ");
  const ranked = demonstrations()
    .filter((block) => block.names.has(name))
    .map((block) => ({ block, about: block.title.toLowerCase().includes(words) ? 0 : 1, crowd: block.names.size }))
    .sort((a, b) => a.about - b.about || a.crowd - b.crowd);
  const best = ranked[0];
  if (!best) return undefined;
  const same = ranked.filter((entry) => entry.block.group === best.block.group);
  const chosen = (same.some((entry) => entry.about === 0) ? same.filter((entry) => entry.about === 0) : same).slice(0, 3);
  const group = best.block.group;
  return { group, href: GROUPS[group].href, page: GROUPS[group].title, titles: chosen.map((entry) => entry.block.title) };
}

/* ── Pages ───────────────────────────────────────────────────────────────────────────────────────────── */

export const DOCS = [
  { href: "/docs", title: "Introduction", description: "What Rivier UI is and what makes it different." },
  { href: "/docs/installation", title: "Installation", description: "Put components in a project: by command or by hand." },
  { href: "/docs/theming", title: "Theming", description: "Light or dark, square to round, any highlight colour, from three attributes." },
  { href: "/docs/command", title: "The command", description: "list, info, add, theme and doctor." },
  { href: "/docs/assistants", title: "For assistants", description: "llms.txt, the registry and the conventions an assistant reads." },
  { href: "/docs/accessibility", title: "Accessibility", description: "What every component is checked for, and how." },
  { href: "/docs/conventions", title: "Conventions", description: "How a component is written." },
  { href: "/docs/changelog", title: "Changelog", description: "What changed, by date." },
] as const;

export type NavGroup = { title: string; links: { href: string; title: string }[] };

export const docsNav = (): NavGroup[] => [
  { title: "Get started", links: DOCS.map(({ href, title }) => ({ href, title })) },
  { title: "Components", links: [{ href: "/components", title: "All components" }, ...CATEGORIES.map((category) => ({ href: `/components#${category.id}`, title: category.title }))] },
];

export const componentsNav = (): NavGroup[] =>
  CATEGORIES.map((category) => ({
    title: category.title,
    links: items()
      .filter((entry) => entry.category === category.id)
      .map((entry) => ({ href: `/components/${entry.name}`, title: entry.name })),
  }));
