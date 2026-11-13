# Changelog

Prelaunch. There are no version numbers yet: entries are dated, newest first. Numbering starts at launch.

## 2026-11-13: full ground

Charts, maps, explainers and the other gaps found by the audit in `docs/GAPS-2026-11-13.md`. Everything is
added: no item, prop or part was removed or renamed.

New packages, each open source, with no hosted service and nothing sent anywhere (the owner's consent for
full ground covers MIT, ISC, BSD and Apache-2.0 packages of that kind):

| Package | Licence | Why |
| --- | --- | --- |
| `d3-array` | ISC | Bins, quantiles and extents: histogram, box plot, fan chart, density |
| `d3-hierarchy` | ISC | Treemap, sunburst and circle-pack layouts |
| `d3-sankey` | BSD-3-Clause | Sankey node and link layout |
| `d3-force` | ISC | The network graph's layout, run to rest before it is drawn |
| `d3-contour` | ISC | Density contours |
| `d3-delaunay` | ISC | The nearest point under the pointer in scatter, density and map layers |
| `d3-geo` | ISC | Map projections, paths, the graticule and great-circle routes |

### Charts (`viz`)

Each is drawn from d3 maths in the theme's series colours, measured by its container, read item by item by
arrow keys (Home, End, Escape) with what it reads said in its live region and shown in a tooltip, carries its
data as a table for screen readers, and fades in once, not at all under reduced motion. Shown at `/charts`
and checked by `scripts/checks/charts.ts`.

- **`scatter-chart`**: points by two numbers, a bubble chart with `size`, groups in fixed colours and shapes,
  the nearest point under the pointer (d3-delaunay).
- **`histogram`**: equal bins (d3-array), counts or shares.
- **`box-plot`**: quartiles, whiskers at 1.5 boxes and outliers per group, or `variant="violin"`.
- **`fan-chart`**: observed values, then a median forecast with nested interval bands and a forecast rule.
- **`small-multiples`**: a panel per group on one shared scale, line, area or bars, in a grid that fits.
- **`treemap`**, **`sunburst`**, **`circle-pack`**: a tree (`ChartTreeNode`) as rectangles, rings or
  circles; Enter or a click opens a group, Backspace or the trail goes back (`path`, `defaultPath`,
  `onPathChange`).
- **`sankey-chart`**: flows between stages (d3-sankey), nodes and bands both readable.
- **`network-graph`**: a force layout run to rest before drawing (d3-force), a node's links lit with it.
- **`calendar-heatmap`**: a value per "YYYY-MM-DD" day as a calendar; Down is the next day, Right a week on.
- **`gantt-chart`**: tasks under groups with progress, dependencies, milestones and a line for today.
- **`density-chart`**: contour bands of where points crowd (d3-contour), points optionally on top.
- **`radar-chart`**, **`waterfall-chart`**, **`funnel-chart`**, **`bullet-chart`**, **`candlestick-chart`**,
  **`chord-diagram`**, **`parallel-coordinates`**, **`dot-plot`** (dots, lollipop, dumbbell, beeswarm),
  **`stream-chart`**, **`slope-chart`**: the other forms the audit found missing. Direction (rise or fall,
  up or down a day) is always said in words or drawn as a shape, never by colour alone.
- **`chart-brush`**: an overview with two handles (Radix Slider) that choose the rows another chart shows.
- **`bar-chart`**: `normalize` stacks each category to 100 %; the tooltip and the table keep the amounts
  and add the share.
- **`chart`**: new shared parts for charts of a project's own: `ChartBaseProps`, `ChartEmpty`,
  `useChartCursor`, `chartSequential`, `chartDiverging`, `chartLinear`, `widestText`, `fitText`, the tree
  helpers and `ChartTrail`.
- **Fixed in `chart`, for every chart.** In a right-to-left page the SVG took the page's direction, which
  turns SVG text anchors round: axis labels were drawn on the wrong side of their tick. The SVG is now drawn
  left to right (words in a right-to-left script still read right to left inside a label). The hidden data
  table is now hidden by a wrapper: on the table itself, a wide table still widened the page on a phone.

### Maps (`viz`)

Drawn from GeoJSON the project passes: no tiles, no hosted data, nothing fetched unless the project names a
tile server. Shown at `/maps` and checked by `scripts/checks/maps.ts`. CONVENTIONS lists six categories and no
`map`, so they are in `viz`.

- **`geo-map`**: any d3-geo projection by name (equal-earth, natural-earth, mercator, equirectangular,
  orthographic, conic-equal-area, azimuthal-equal-area, transverse-mercator) or as a function, fitted to
  `fit`; zoom and pan folded into the projection (crisp lines, exact tile maths) by dragging, pinching,
  Ctrl or ⌘ with the wheel (the wheel alone still scrolls the page), a double click, buttons and keys (arrows
  pan, + and - zoom, 0 resets), controlled with `view` and `onViewChange`. Parts: `GeoGraticule`,
  `GeoFeatures`, `GeoScaleBar`, `GeoTable`, and `GeoLayer`, the readable layer every other layer is built on
  (a named group in the Tab order, items read by arrow keys, said aloud, shown in a tooltip and brought into
  view). Works inside `map-frame`.
- **`choropleth`**: regions by a number, sequential, diverging or in classes (`choroplethScale`), and
  `ChoroplethLegend`, which says each step's range in words.
- **`geo-markers`**: points in group colours and shapes, or bubbles sized by area.
- **`geo-routes`**: great-circle routes or arcs, width by amount, an arrow for the direction, distances.
- **`geo-hexbin`**: points gathered into hexagons or squares on screen, re-gathered on zoom (the binning is
  written here; no package).
- **`geo-tiles`**: raster tiles from the project's own address template, with a required attribution and no
  default host.

### Explainers (`lib`, `motion`, `scripts`)

- **`explainer-spec`** (lib): the types of an explainer film as plain data (scenes of a title, any of 28
  charts by name, a map with choropleth, marker, route or hexbin layers and a camera that moves over the
  scene, a 3D model that turns, a then-and-now comparison that sweeps, a quote, a caption over a picture),
  each with a length, a transition, captions, a narration cue and a provenance of `measured`,
  `reconstructed`, `generated` or `invented`. `validateExplainer` returns every fault with its path and words
  that say how to mend it (a duration in milliseconds, a repeated id, an unknown chart, a chart or map that
  does not say how it was made). `explainerTimeline` and `explainerCues` put scenes and captions on the
  film's clock.
- **`explainer`** (motion): plays a spec on `film-stage`: playable, scrubbable, captions, narration and a
  sound bed in step, and `ExplainerProvenance` (a `provenance-label` that follows the scene on stage).
  Entrances and camera moves are worked out from the scene's own time, so `renderAt` draws any moment the
  same way, and they are final under reduced motion. A spec with faults shows them as an alert instead of a
  film. Parts: `ExplainerCaptions`, `ExplainerProvenance`, `ExplainerAudio`; `renderPicture` takes a
  framework's image component. Shown at `/explainers`, checked by `scripts/checks/explainers.ts`.
- **`scripts/export-film.ts`** (`npm run export-film -- url=… name=…`): opens a page with a deterministic
  stage, calls `window.__filmStage.<name>.renderAt(t)` for each frame, saves PNG frames, and writes an MP4
  with ffmpeg when it is on the PATH, else a zip of the frames with a `manifest.json` (written here: no
  package). Tried on 2026-11-13 against `/explainers` at 6 fps: 168 frames, a valid zip.

## 2026-11-13

More that the existing components can do. Every change is an added prop or part with the old behaviour
as its default; no package was added to the library. To take them into a project that already has the
items, add them again with `overwrite` (which replaces the project's own edits to those files).

- **`media-row-list` and `dropzone`.** A row can be in a state of the project's own: `state` takes any
  word, with `stateLabel` and `stateTone` (`neutral`, `success`, `warning`, `destructive`, each with its own
  mark; `stateIcon` on `UploadItem` replaces the mark). Rows take a `status` line, `controls` of the
  project's own, `hideCover`, and `altRequired`, `altInvalid` and `altError` for the description field (the
  message is tied to the field and read out when it appears). The list takes `onPause` and `onResume`
  (pause and resume buttons on uploading and paused rows), `altRequired`, `onDropped`, and
  `variant="lines"` for hairline rows with no box. A row now has the surface radius at every roundness,
  where it took the control radius and became a pill. `UploadItem` takes `as="div"`, so a media row no
  longer holds a list inside a list item.
- **`film-stage`.** Any number of `FilmStageAudio` at once, each with its own `start`, `duration` and
  `volume`, all following the clock, the rate, a seek and the mute. `renderAt(time, { timeout })` now loads
  pictures marked `loading="lazy"` at once (off screen or not displayed, they never arrived and it never
  resolved), counts `srcset` pictures, waits for the decode after a late load, and rejects after `timeout`
  milliseconds (default 10000) with an error naming the picture and its scene. `FilmStagePreviousScene`
  and `FilmStageNextScene`, the keys P and N, `previousScene()` and `nextScene()` on the handle, each
  reading out the scene arrived at; `onSceneChange` with the scene, its place and the one before;
  `sceneIndex` from `useFilmClock`. Letter keys are found by their place on keyboards of other scripts.
- **`wizard`.** Driven from outside: with `onNext`, `onBack` and `onSkip` the buttons tell the project and
  the wizard does not move; the project sets `step`. `pending` makes the buttons and the rail wait and
  marks the card busy. The step animation and the move of focus to the new heading now follow any change
  of `step`, not only the wizard's own buttons. Uncontrolled use is unchanged.
- **`sortable-list`.** `onDropped({ value, from, to, values })`, called once when a drag is let go, a
  lifted row is dropped (Space, Enter, Tab or focus leaving) or a move button is pressed; not when a lifted
  row is put back with Escape. `onValuesChange` still reports every step.
- **`dock`.** `stackBelow` (rem, default 42) sets the width below which the panel gives way to the bar.
  `DockBar` takes `show`: `"stacked"` for a bar written inside `DockMain` above a region that must stay
  lowest (a composer), `"collapsed"` for the strip of a wide dock, `"both"` (default) as before.
- **`model-viewer` and `add`.** A registry entry now lists `devDependencies`: the types of a package
  that does not carry its own (`@types/three`, `@types/d3-scale`, `@types/d3-shape`). `add` installs them
  with `-D`, `info` lists them, `doctor` reports them missing, and `npm run registry` fails when a
  dependency without types has no entry in `TYPES`. Pinch zoom is now exercised in the checks.
- **`lightbox` with `carousel`.** On close, a trigger inside a slide that is out of view (and so inert) is
  scrolled into view and then focused; before, focus was lost. A slide may have several triggers: the one in
  view and reachable is preferred, one that is not drawn is never chosen.
- **`virtual-list`.** `scroll="window"` on `VirtualList` and `VirtualGrid`: the list is as long as its rows
  and the page scrolls it; `scrollToIndex` scrolls the page and leaves room for a sticky header through the
  list's `scroll-margin-top`. A changing `count` and rows reordered under `getKey` are now in the checks.
- **`combobox` and `gallery`: clean under `eslint-config-next`.** The combobox trigger states
  `aria-expanded`, `aria-controls` and `aria-haspopup` itself. `GalleryImage` takes `as` and
  `GalleryLightbox` takes `renderImage`, for the framework's image component; the default stays `<img>`,
  with the rule switched off on those lines and the reason stated (and the same on the poster of
  `model-viewer`). `npm run lint` now enforces `@next/next/no-img-element` on the registry
  (`@next/eslint-plugin-next` 16.4.6, MIT, a dev dependency of the lint tooling only), and the whole
  registry was run through `eslint-config-next` 16.4.6 and reports nothing.
- **Types and proportions.** `MediaRowList` inherited the `onPause` of a `div` (a media event), which would have
  made the new prop's argument untypable. The large picture in `GalleryLightbox` keeps its proportions when
  the image component writes `width` and `height` attributes. In `lightbox`, a picture taller than the
  slide was cut off at the slide's edge (`max-h-full` had nothing definite to be a percentage of); a slide
  is now a size container and holds a picture directly inside it to its own height and width.
- **Not in it, with the releases checked on 2026-11-13.** glTF that carries Gaussian splats in an extension
  (`KHR_gaussian_splatting`): three.js 0.187.0 has a loader plugin for it, but the object it makes needs
  the WebGPU renderer, and the viewer draws with WebGL 2 so that Spark (`@sparkjsdev/spark` 2.4.0), which
  reads splat files and not glTF, can draw in the same canvas. Left until one of the two changes.
- **Showcase and checks.** New demonstrations on `/carousel`, `/flows`, `/panels`, `/stage`, `/lists`,
  `/gallery`, each with its checks; `/models` checks a pinch with two fingers at phone width.

## 2026-11-12 (third entry)

What three design studies in a project still found missing, added as general components. One package was
added, and only for one item: `@sparkjsdev/spark` (MIT), which `model-viewer` fetches when a file is
Gaussian splats and not otherwise. Everything else is built on what the library already used.

- **3D.** `model-viewer`: one model to turn, zoom and reset. glTF and GLB through three.js's own loader;
  Gaussian splats (.spz, .ply, .splat, .ksplat, .sog) through Spark. It is plain three.js rather than a
  react-three-fiber scene, so the file itself carries nothing heavy: three.js, the loader and Spark are
  fetched when the viewer comes near the screen. A poster and progress while loading; arrows turn, plus and
  minus zoom, Home resets, each announced; buttons for all of it; a named still where WebGL 2 is missing
  or the file cannot be read; no turning by itself under reduced motion, and a button to stop it otherwise;
  drawing stops off screen and in a hidden tab; vertical swipes and the plain wheel stay with the page;
  an optional hand-off to AR Quick Look (USDZ) or Scene Viewer behind `ar`. Two viewers given the same
  `view` and `bounds` share one camera.
- **Comparison and provenance.** `compare-slider` (two layers of any content cut with `clip-path`, a divider
  that is a slider), `certainty-legend` (classes the project names, each with a pattern as well as a colour,
  switched on and off) and `provenance-label` (what a picture is, with its sources, placed where a player's
  controls cannot cover it).
- **Collections.** `carousel` (native scroll-snap; previous and next, dots or a count, autoplay that needs
  its pause button and stops on hover, focus, off screen and under reduced motion), `virtual-list`
  (`VirtualList` and `VirtualGrid`: thousands of items of any height, only those in view in the page, each
  with its place in the whole list, the scroll position remembered) and `media-row-list` (reorderable
  upload rows with progress, retry, remove, a description field and a cover choice, composed from
  `dropzone` and `sortable-list`).
- **Timed scenes.** `film-stage`: the chrome and the clock for a sequence of scenes the project draws from
  time. Play, pause, seek and rate, controlled or not; cuts and crossfades computed from the time; the
  existing `scrubber`, `scene-strip`, `captions` and `hotspots` work inside it; a clock that sound and
  anything else can follow; and `renderAt(time)`, which draws one moment with no timer running, for export
  frame by frame from a headless browser.
- **Decided against, with the releases checked on 2026-11-12.** Embla (`embla-carousel-react` 8.6.0, MIT)
  for the carousel: the browser's scroll-snap already gives swipe, momentum and right-to-left. TanStack
  Virtual (`@tanstack/react-virtual` 3.14.26, MIT) for the list: it is headless, and the roles, the
  positions, focus and restoration that make up most of the component would still be written here. For the
  viewer: `@google/model-viewer` 4.4.0 (Apache 2.0) is a web component that asks for three.js 0.183 where
  the library is on 0.187, and has no splats; `@react-three/drei` 10.7.9 (MIT) would add a large package for one loader hook;
  `@mkkellogg/gaussian-splats-3d` 0.4.7 (MIT) was last released in January 2025; `gsplat` 1.2.9 (MIT) has
  its own renderer rather than three.js and reads fewer formats.
- **Showcase and checks.** Five more component pages (`/models`, `/evidence`, `/carousel`, `/lists`,
  `/stage`) with their checks. `scripts/make-test-assets.ts` writes the small 3D files the viewer's page
  loads (a vase as glTF, USDZ and splats in three formats, all computed, about 380 KB together).

## 2026-11-12 (second entry)

What a real project found missing, added for every project. No package was added to the library for
any of these: they are built on Radix, Motion, cmdk and lucide, which the library already used, and where
Radix has no primitive the WAI-ARIA Authoring Practices pattern is written here.

- **Dates and times.** `calendar` (one day, several, or a range; days as plain `"2026-11-14"` strings;
  unavailable days with a reason that is read out; a word mark per day; the date-grid keyboard pattern),
  `date-picker` (`DatePicker`, `DateRangePicker`; never the native picker), `slot-picker` (offered times as
  a radio group), `time-picker` (hour, minute and day-period spin buttons).
- **Choices.** `chip` (removable, pressable, and a set to choose from), `tile-group` (picture tiles),
  `segmented-control`, `number-stepper` (a spin button with hold-to-repeat), `combobox`.
- **Flows and lists.** `steps` (a rail with done, assumed, current, upcoming, skipped and blocked steps),
  `wizard` (a shell that moves focus to each step's heading), `sortable-list` (drag, keyboard lift and
  drop, and move buttons, each move announced), `timeline`, `undo-line`.
- **Panels.** `bottom-sheet` (snap points, drag to dismiss, and a handle that works from the keyboard),
  `dock` (a resizable panel beside the page: the window-splitter pattern, with a collapsed bar),
  `map-frame` (a container that loads a map engine only when asked, with a list equivalent and full screen).
- **Conversation.** `thread` (a log that follows new content until the person scrolls up), `message`,
  `streaming-text` (not announced word by word; the finished reply is announced once), `status-line` (the
  one polite live region), `composer` (attachments and voice slots, safe with input methods), `part-frame`
  (a card with a lifecycle and an expand to full screen).
- **Pictures, video and sound.** `gallery`, `lightbox` (swipe, keys, zoom by pinch, wheel, double tap and
  buttons, opening from its thumbnail as a shared element), `dropzone` with upload rows and progress (no
  upload engine), `video-player`, `audio-player` with a waveform, `scrubber` (buffered ranges, marks, a
  preview with thumbnails), `captions` and `Transcript`, `scene-strip`, `hotspots`, and `use-media`, the
  state of a media element that they share.
- **Records and decisions.** `compare-table` (a sticky first column; columns that snap inside their own
  scroll area on phones), `fact-row` with `SourceChip` and actions the project names, `consent` (nothing
  pre-ticked; declining weighs the same as accepting), `language-switcher` (languages by their own names,
  no flags), `price-breakdown`, `countdown` (text, announced only at thresholds).
- **Foundations.** `direction-provider` and `lib/direction` for right-to-left, `lib/announce` (one shared
  live region), `lib/use-controllable-state`. The theme now adapts tracking, leading and line breaking to
  the script of the language.
- **Changed.** `theme-provider` reads the stored theme and the device preference as external stores (it
  set state in an effect, which a project's lint rejects) and now follows a change made in another tab.
  `skeleton` can wrap content and hold its final size (`loading`), and has `SkeletonText`.
  `view-transition` adds `SharedElement` and `TransitionBoundary` over React's own `<ViewTransition>`.
  `scene`, `chart`, `globe` and `number-ticker` no longer fail the React Compiler lint rules.
- **Checking.** `npm run lint` (ESLint with the React rules a project runs). `npm run check`: every
  component page in a real browser at desktop and 390 px, each left-to-right and right-to-left: keyboard
  patterns key by key, roles and names, focus, sideways overflow, console errors, and the WCAG 2.2 A and
  AA rules of axe-core. `CONVENTIONS.md` gains the rules these follow: parts, controlled and uncontrolled
  state, no fixed words, plain values for dates, direction and scripts.
- **Registry.** Items carry `categories`. Installing with the shadcn command from the `@rivier-ui` namespace
  was tested (see `README.md`).

## 2026-11-12

First build. Its own repository, `rivier-ui`, Apache 2.0, private until launch.

- **Theme.** One stylesheet of tokens (shadcn variable names) with light and dark, five steps of roundness from
  square to pill, nine named highlight colours and any other by hue and chroma, a fixed chart palette checked for
  colour-blindness and contrast in both modes, motion tokens, flat surfaces. The default look follows the rivier.ai design language.
- **Registry.** One file per component with a header (what, when, example); dependencies read from imports;
  `registry.json`, `r/<name>.json` and `llms.txt` generated from them.
- **Command.** `rivier-ui list | info | add | theme | doctor`, copying source into a project.
- **Components.** Controls and surfaces, layout and bento grid, motion and transitions, 3D, charts.
- **Showcase site.** Every item with the theme switches, installed by the library's own command.
- **Rivier Architect plugin.** `rivier-ui`, so a project's assistant looks here before writing a component.
