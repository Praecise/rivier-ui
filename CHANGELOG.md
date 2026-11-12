# Changelog

Prelaunch. There are no version numbers yet: entries are dated, newest first. Numbering starts at launch.

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
