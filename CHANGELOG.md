# Changelog

Prelaunch. There are no version numbers yet: entries are dated, newest first. Numbering starts at launch.

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
