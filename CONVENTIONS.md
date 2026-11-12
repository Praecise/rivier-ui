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
  `@react-three/fiber`, `d3-scale`, `d3-shape`, `cmdk`, `sonner`. Nothing else without asking. Check the
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
- Focus is visible: the theme draws a 2px ring on `:focus-visible`; do not remove outlines.
- Text contrast at least 4.5:1 in both themes; do not put `text-muted-foreground` on `bg-muted` at small sizes
  without checking.

## Motion

- Only `transform` and `opacity` are animated. Durations and easing come from the tokens:
  `duration-instant`, `duration-base`, `duration-slow`, `ease-out` (or `var(--duration-base)`, `var(--ease)`
  in `motion` props). Enter and exit of Radix content use `tw-animate-css` classes
  (`data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95` …).
- Everything stops under reduced motion: `motion-reduce:` utilities in CSS; in `motion` components use
  `useReducedMotion()` and render the final state. Content must be readable with motion off and with
  JavaScript still loading: text is in the markup, never created by an animation.
- Motion never changes layout height after the page has loaded.

## Three and visualisation

- Three components are client-only and lazy: they render a static fallback (the `fallback` prop, or a flat
  token-coloured block) until the canvas is ready, when WebGL is missing, and under reduced motion. They take
  their colours from the theme's CSS variables read at mount, cap the pixel ratio at 2, pause when off screen,
  and dispose of what they create.
- Charts are SVG, sized by their container, drawn with `d3-scale` and `d3-shape` for the maths only. Series
  colours are `chart-1` … `chart-5`, in that fixed order: a validated set that does not follow the highlight
  colour (run a palette validator before changing it). A sixth series is folded into "Other" or given a dash, never a new hue. Every chart takes `data` and accessors or keys, has a text alternative
  (`aria-label` plus a visually hidden table or summary), and never relies on colour alone.

## Checking

From this repository: `npm run typecheck` must pass, and `npm run registry` must accept the header.
