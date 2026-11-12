# Contributing to Rivier UI

Prelaunch: the repository is private, and this guide is for when it opens. Contributions are accepted under
the repository's licence (`LICENSE`).

## Adding or changing a component

A component is one file in `registry/<category>/<name>.tsx`. Read `CONVENTIONS.md` first, and
`registry/ui/button.tsx` and `registry/ui/card.tsx` as the models. In short:

- The file starts with a header: `@name`, `@category`, `@description`, `@when`, and an `@example` that works.
  The registry, `llms.txt` and `rivier-ui info` are generated from it.
- Colours, radius and motion come from the theme's tokens only. No hex values, palette colours, fixed radii or
  shadows. That is what keeps one theme switch working everywhere.
- Behaviour comes from Radix where a primitive exists; otherwise from the WAI-ARIA Authoring Practices
  pattern, written here. Motion is transform and opacity only, and off under reduced motion.
- Parts, not one component with many props. Controlled and uncontrolled. No fixed words: labels are props.
  Logical properties only, so it works right-to-left. Nothing that names a product or a client.
- Dependencies are read from the imports. Import other registry files through `@/…`, never relatively.
  A new package needs a reason, and its latest release.

## Before opening a pull request

```sh
npm install
npm run lint:install    # once
npm run typecheck
npm run lint
npm run registry        # checks every header; rewrites registry.json, r/, llms.txt (commit them)
npm run site:install    # copies the registry into the showcase site
npm run site:typecheck
npm run site:build
npm run site:start      # in one terminal
npm run smoke           # in another: the overview page at desktop and phone widths
npm run check           # and every component page: keyboard, focus, roles, right-to-left, 390 px, axe-core
```

Add the component to a showcase page (`site/src/app/_showcase/<group>.tsx`, shown at `/<group>`) and its
checks to `scripts/checks/<group>.ts`: its keyboard pattern key by key, its roles, names and states, focus,
controlled and uncontrolled use. `scripts/checks/choices.ts` is the model. Then look at it yourself,
in light and dark, square and round, at phone and desktop widths: the smoke test cannot judge looks.
Add a dated line to `CHANGELOG.md`. No version numbers before launch.

## The theme

`registry/theme/rivier-ui.css` is shared by everything. A new token needs a use in more than one component.
The chart colours `--chart-1` to `--chart-5` are a checked set: change them only with a palette validator, for
both modes.

## Reporting a problem

Say which component, the theme settings (mode, roundness, highlight), the browser and width, and what you
expected. For a security problem, do not open a public issue; write to the maintainers privately.
