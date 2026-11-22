# Rivier UI

A component library for AI-native development: React components you copy into a project and own, built so
that an assistant can find the right one, use it correctly and restyle a whole product from one place.

It is the sibling of Rivier Architect (the repository `rivier-architect`). Each works without the other.

The library is public. Its website is **https://ui.rivier.ai**: the documentation, a page for every item
with its example, its source and a working demonstration, and the registry that tools install from.
Licensed under Apache 2.0 (`LICENSE`). Changes are dated and there are no version numbers yet
(`CHANGELOG.md`).

## What makes it different

- **Copied in, not installed.** `rivier-ui add dialog` puts the source in your project. You can read it, change
  it, and nothing breaks on an upgrade you did not ask for.
- **One theme, three switches.** Light or dark, square to round, any highlight colour: attributes on `<html>`.
  Every component draws only from the theme's variables, so the switches reach everything, including charts
  and 3D.
- **Written to be read by an assistant.** Every file starts with what it is, when to use it (and when not), and
  a working example. From those headers the library generates `llms.txt`, a registry any shadcn-compatible tool
  can read, and the answers to `rivier-ui info <name>`.
- **Past the flat page.** Bento grids and layout, motion and page transitions, 3D scenes, and charts are part of
  the same library and the same theme, not separate products with separate looks.
- **Built on what already works.** Radix for behaviour and accessibility, Tailwind CSS for styling, Motion for
  animation, three.js for 3D (and Spark for Gaussian splats, fetched only by a viewer that shows them), d3
  for chart maths, cmdk and Sonner for the palette and toasts. Where Radix has
  no primitive (calendar, sortable list, bottom sheet, media players, carousel, windowed list) the component is written here to the
  WAI-ARIA pattern rather than adding a package: every dependency is MIT or Apache 2.0 and nothing is hosted. Theme variable names follow the shadcn convention, so
  components written for it take this theme as they are.

## Use it in a project

The project needs React 19, Tailwind CSS 4 and the `@/` import alias (a Next.js app has all three).

From the website, with the shadcn command. Name the registry once in the project's `components.json`:

```json
{ "registries": { "@rivier-ui": "https://ui.rivier.ai/r/{name}.json" } }
```

```sh
npx shadcn@latest add @rivier-ui/button @rivier-ui/dialog
```

Then import the theme after Tailwind in the global stylesheet (`@import "tw-animate-css";` and
`@import "../styles/rivier-ui.css";`): that command does not. Each item's page on the website also has its
whole source, to copy by hand.

From a copy of this repository, with the library's own command, which also imports the theme:

```sh
npm run ui -- list                              # everything
npm run ui -- list chart                        # search
npm run ui -- info bento-grid                   # what, when, example
npm run ui -- add button dialog dir=<project>   # copy them, what they need, and the theme
npm run ui -- add all dir=<project>
npm run ui -- doctor dir=<project>
```

Inside a project created with Rivier Architect, the same through its plugin:
`npm run tool -- rivier-ui:ui <project> add button dialog`.

`add` copies the files into `src/components/<category>/` and `src/lib/`, puts the theme in
`src/styles/rivier-ui.css`, imports it after Tailwind in the global stylesheet, and installs the packages the
items need at their latest release. It never overwrites a file you have changed unless you say `overwrite`.
Options are plain words (`dir=`, `overwrite`, `dry`).

## Theme

```html
<html data-theme="dark" data-radius="lg" data-accent="violet">
```

| Attribute | Values |
| --- | --- |
| `data-theme` | `light`, `dark` (or the class `dark`) |
| `data-radius` | `none`, `sm`, `md`, `lg`, `full` (controls become pills) |
| `data-accent` | `teal`, `blue`, `violet`, `pink`, `red`, `orange`, `amber`, `green`, `ink` |

Any colour and any roundness: set `--accent-hue` (0 to 360) and `--accent-chroma` (0 to about 0.25) and
`--radius` yourself. Lightness is chosen by the theme, so text on the highlight colour keeps its contrast in
both modes. The attributes work on any element, so one part of a page can carry a different theme.

`theme-provider` lets visitors switch and remembers their choice without a flash on load.
A brand's own colours and fonts go in a block after the import in your global stylesheet; components are never
edited to restyle them. All tokens: `registry/theme/rivier-ui.css`.

## What is in it

`npm run ui -- list` is the current answer. By category: `ui` (controls and surfaces, dates and times,
steps and wizards, sortable lists, sheets and docks, conversation parts, pictures and players, uploads,
carousels, windowed lists and grids, a then-and-now slider, a certainty legend and a provenance label,
records and consent), `layout` (containers, sections, bento grid, marquee, a frame for a map), `motion`
(reveals, scroll scenes, pointer effects, page and view transitions, a stage for timed scenes), `three`
(scenes that fall back to a still when WebGL or motion is not available, and a viewer for a glTF model or
Gaussian splats), `viz` (charts and sparklines), `lib` (helpers: class names,
motion tokens, reading direction, screen-reader announcements, controllable state).

Added on 2026-11-13 for full ground (the audit is `docs/GAPS-2026-11-13.md`): `viz` now holds 28 kinds of
chart (distributions, forecasts with intervals, hierarchies, flows, networks, calendars, plans and more) and
maps drawn from GeoJSON the project passes (`geo-map` with choropleth, marker, route, hexagon and tile
layers); `motion` an `explainer` that plays a film written as JSON (`lib/explainer-spec`), exported frame by
frame by `scripts/export-film.ts`; `ui` a data grid, a self-checking form, data entry (tags, one-time code,
password, money, colour, rating), surfaces and navigation (alert dialog, hover card, collapsible, menubar,
navigation menu, toolbar, resizable panels, sidebar), boards (tree view, kanban, flow diagram, tour,
notifications) and editors (code block, Markdown editor, image cropper and annotator); `three` a point cloud
and labels pinned to a model; `lib` keyboard shortcuts.

Every component is keyboard operable to the WAI-ARIA pattern for its kind, works right-to-left and at phone
width, stops moving when the visitor asks for less motion, and carries no fixed words: labels are passed in
or are props with English defaults, so a product in any language can use it.

## For assistants

- Start with `llms.txt`: every item with its purpose and an example, in one file.
- `CONVENTIONS.md` is how a component is written and what a project's own components should follow.
- Other tools: `registry.json` and `r/<name>.json` follow the shadcn registry format under the namespace
  `@rivier-ui`. Tested with the shadcn command 4.23.0 on 2026-11-12: with the `r/` folder served over HTTP
  and `"registries": { "@rivier-ui": "<address>/r/{name}.json" }` in the project's `components.json`,
  `shadcn add @rivier-ui/button` puts the component, what it depends on and the theme in the same places as
  `rivier-ui add` and installs the packages. One difference: it does not import the theme into the global
  stylesheet (add `@import "tw-animate-css";` and `@import "../styles/rivier-ui.css";` after Tailwind by
  hand). Checked again on 2026-11-22 against the site's own `/r/` addresses (https://ui.rivier.ai): the
  copied file keeps its header comment. Its MCP server has not been tested.

## Working on the library

```sh
npm install            # once
npm run lint:install   # once: the lint tools have their own packages (lint/)
npm run typecheck      # TypeScript, strict
npm run lint           # ESLint with the React rules a project's lint runs on a copied component
npm run registry       # checks every header and writes registry.json, r/, llms.txt
npm run site:install   # copies the whole registry into the showcase site with the library's own command
npm run site:dev       # the site, http://localhost:3320: landing, docs, a page per item, the showcase
npm run smoke          # with the site running: the page that shows everything (/showcase) in a real browser
npm run site:stage -- <folder>   # the site as a plain Next.js app, for a host to build and serve (ui.rivier.ai)
npm run check          # with the site running: every component page: keyboard, focus, roles, right-to-left, 390 px, axe-core
npm run export-film -- url=http://localhost:3320/explainers name=demo   # frames of a deterministic stage: MP4 with ffmpeg, else a zip
```

The 3D files on the showcase's `/models` page are written by `scripts/make-test-assets.ts` (computed, not
scanned or downloaded) and committed in `site/public/models/`.

A component is one file in `registry/<category>/`. Its dependencies are read from its imports; nothing is
listed by hand. It is shown on a showcase page (`site/src/app/<group>/`) and tested by that page's checks
(`scripts/checks/<group>.ts`). Rules: `CONVENTIONS.md`. Changes: `CHANGELOG.md` (dated, no
version numbers).
