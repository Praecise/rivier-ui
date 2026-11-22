# Rivier UI: how a component is written

Every file in `registry/` follows these rules. They are what makes the library themable from one place and
readable by an assistant. `registry/ui/button.tsx` and `registry/ui/card.tsx` are the models: read them first.

## The file

- One component (with its parts) per file, in `registry/<category>/<name>.tsx`, kebab-case. Categories:
  `ui` (controls and surfaces), `layout`, `motion`, `three`, `viz`, `lib` (helpers, `.ts`).
- TypeScript, strict. No `any`. No default exports. Named function components, not arrow constants.
- The file starts with the header below. The registry, the docs and `llms.txt` are generated from it, so it is
  not optional and its example must be code that works.

```tsx
/**
 * @name bento-grid
 * @category layout
 * @description One sentence: what it is.
 * @when When to reach for it, and what to use instead when it is the wrong choice.
 * @example
 * <BentoGrid>
 *   <BentoCell span={2}>…</BentoCell>
 * </BentoGrid>
 */
```

- Imports: other registry files through the alias exactly as a project will have them:
  `@/lib/cn`, `@/components/ui/button`, `@/components/motion/reveal`. Never a relative import between
  registry files. Dependencies are worked out from the imports; do not list them anywhere.
- Allowed packages (all installed, latest): `react`, `radix-ui` (the unified package:
  `import { Dialog } from "radix-ui"`, then `Dialog.Root`), `class-variance-authority`, `clsx`,
  `tailwind-merge`, `lucide-react`, `motion` (`import { motion } from "motion/react"`), `three`,
  `@react-three/fiber`, `d3-scale`, `d3-shape`, `d3-array`, `d3-hierarchy`, `d3-sankey`, `d3-force`,
  `d3-contour`, `d3-delaunay`, `d3-geo` (maths only, as for the other d3 packages), `cmdk`, `sonner`, and `@sparkjsdev/spark` in `model-viewer`
  only, by `import()`. Nothing else without asking. Check the
  installed package's types in `node_modules` before using an API; do not write an API from memory.
- React 19: `ref` is a normal prop; do not use `forwardRef`. Type props as `ComponentProps<"div">` or
  `ComponentProps<typeof Dialog.Content>` and spread the rest onto the root element.
- `"use client"` as the first line (before the header) only when the file uses state, effects, event
  handlers, context, browser APIs, Radix interactive primitives, `motion` or three. Plain markup stays a
  server component.

## Styling

- Tailwind 4 utilities and the theme's tokens only. Never a hex value, never a named Tailwind palette colour
  (`bg-zinc-900`, `text-blue-500`), never a fixed radius.
- Colours: `bg-background`, `text-foreground`, `bg-card`, `bg-popover`, `bg-muted`, `text-muted-foreground`,
  `bg-accent` (hover ground), `bg-primary text-primary-foreground` (the highlight colour),
  `bg-highlight-soft`, `border-border` (default), `border-border-strong`, `border-input` (control edges),
  `bg-destructive`, `bg-success`, `bg-warning` (+ `-foreground`), `bg-overlay`, `fill-chart-1` … `chart-5`.
- Radius: `rounded-control` for controls (buttons, inputs, badges, chips), `rounded-surface` for surfaces
  (cards, dialogs, popovers, menus). `rounded-full` only for things that are circles by nature (avatar, switch
  thumb, spinner). This is what makes square-to-round work from one attribute.
- Flat. No `shadow-*` and no gradients as decoration. Surfaces are separated by a 1px border. A popover or
  dialog is told apart by its border and the overlay behind it.
- Heights: `h-control`, `h-control-sm`, `h-control-lg`. Text: `text-sm` for controls, `text-base` for reading.
- Every root element takes `className` and merges it last with `cn(...)`, and sets `data-slot="<name>"`.
- Variants with `cva`, exported as `<name>Variants` when another component may reuse the look.
- Responsive by default: works from 320px wide; touch targets at least 40px; no fixed widths that overflow.
  Use container queries (`@container`, `@md:`) where a component's layout depends on its own width.
- Right-to-left safe: logical utilities (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`).

## Behaviour and accessibility

- Behaviour comes from Radix primitives where one exists. Keep their accessibility: labels, roles, focus
  return, keyboard support. Icon-only controls need an `aria-label`. Decoration is `aria-hidden`.
- Where Radix has no primitive (a calendar, a spin button, a sortable list, a splitter, a media scrubber),
  the component is written here to the WAI-ARIA Authoring Practices pattern for its kind, and its browser
  check proves the pattern key by key. A new package is not added for one component.
- Focus is visible: the theme draws a 2px ring on `:focus-visible`; do not remove outlines.
- Text contrast at least 4.5:1 in both themes; do not put `text-muted-foreground` on `bg-muted` at small sizes
  without checking.
- State is never carried by colour alone: chosen, disabled, failed, current each have a mark or a word too.
- Anything done by dragging can also be done without it (buttons, keys): WCAG 2.5.7.
- A change that no focus move will read out (an item moved, a total changed, an upload finished) is said
  through `announce()` from `@/lib/announce`: one shared live region for the page. A component does not
  create its own live region unless it is one by nature (`status-line`, `toaster`).

## Parts, state and words

- Composable parts, not one component with twenty props: a root that holds the state in a context, and named
  parts (`Calendar`, `CalendarGrid`; `Composer`, `ComposerInput`, `ComposerSubmit`) that a project arranges,
  leaves out or replaces. A root may render a sensible default arrangement when it has no children.
- Anything that holds a value or an open state works controlled and uncontrolled: `value`, `defaultValue`,
  `onValueChange` (`open`, `defaultOpen`, `onOpenChange`), through `@/lib/use-controllable-state`.
- Values are plain data. A day is `"2026-11-14"`, a month `"2026-11"`, a time `"19:30"`, never a `Date`: a
  `Date` carries a time zone and the wrong one changes the day.
- No words are fixed in a component. What a person reads or hears is passed in by the project, or is a prop
  with an English default (`aria-label`, a `labels` object, a message function) so it can be translated.
  Dates, times, numbers and lists are formatted with `Intl` and a `locale` prop.
- Nothing in the library names a product, a client or a domain. Examples use neutral subjects.

## Direction and scripts

- Layout uses logical utilities only, so it mirrors by itself. Code that handles Left and Right arrow keys or
  moves something sideways with a transform asks `inlineStep`, `inlineSign` or `isRtl` from
  `@/lib/direction`. Icons that point (arrows, chevrons) flip with `rtl:-scale-x-100`; clocks, ticks, play
  buttons and media time bars do not.
- `direction-provider` sets the direction for Radix-based components; people's own words get `dir="auto"`.
- The theme adapts tracking and leading to the script of the language (`lang`): do not set letter-spacing
  or a tight line height with arbitrary values (`tracking-[…]`, `leading-[1]`), which the theme cannot reach.

## Motion

- Only `transform` and `opacity` are animated. Durations and easing come from the tokens:
  `duration-instant`, `duration-base`, `duration-slow`, `ease-out` (or `var(--duration-base)`, `var(--ease)`
  in `motion` props). Enter and exit of Radix content use `tw-animate-css` classes
  (`data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95` …).
- Everything stops under reduced motion: `motion-reduce:` utilities in CSS; in `motion` components use
  `useReducedMotion()` and render the final state. Content must be readable with motion off and with
  JavaScript still loading: text is in the markup, never created by an animation.
- Motion never changes layout height after the page has loaded. Where a size must change (a step of a wizard
  that is taller than the last), it changes at once, or through a transform-based layout animation.

## Three and visualisation

- Three components are client-only and lazy: they render a static fallback (the `fallback` prop, or a flat
  token-coloured block) until the canvas is ready, when WebGL is missing, and under reduced motion. They take
  their colours from the theme's CSS variables read at mount, cap the pixel ratio at 2, pause when off screen,
  and dispose of what they create. `model-viewer` stands alone rather than inside `scene`: it imports
  nothing heavy at the top of the file and fetches three.js, a loader and Spark with `import()` when it
  comes near the screen. A package named in an `import()` is installed by `add` like any other.
- Charts are SVG, sized by their container, drawn with `d3-scale` and `d3-shape` for the maths only. Series
  colours are `chart-1` … `chart-5`, in that fixed order: a validated set that does not follow the highlight
  colour (run a palette validator before changing it). A sixth series is folded into "Other" or given a dash, never a new hue. Every chart takes `data` and accessors or keys, has a text alternative
  (`aria-label` plus a visually hidden table or summary), and never relies on colour alone.

## Checking

From this repository:

- `npm run typecheck` must pass, and `npm run registry` must accept the header.
- `npm run lint` must pass (once: `npm run lint:install`). It runs the React rules a project's own lint
  runs on a copied component, the React Compiler rules included (no state set in an effect, no ref read
  during render).
- `npm run check` must pass against the showcase (`npm run site:build`, `npm run site:start`). Every
  component is on a showcase page (`site/src/app/<group>/`) with a file of checks (`scripts/checks/<group>.ts`)
  that drives it in a real browser at desktop width, at 390 px with touch, and at 390 px right-to-left: its
  keyboard pattern key by key, roles, names and states, focus on open and close, controlled and uncontrolled
  use, no sideways overflow, no console errors, and no WCAG 2.2 A or AA violation found by axe-core.
  A new component comes with its demonstration and its checks.
