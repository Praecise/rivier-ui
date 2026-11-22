import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ThemePanel } from "../../_showcase/theme-panel";
import { C, Code } from "../../_site/code";
import { Doc, docMetadata } from "../../_site/doc";

export const metadata = docMetadata("/docs/theming");

const TOKENS = [
  ["bg-background, text-foreground", "The page and its text."],
  ["bg-card, bg-popover", "Surfaces: cards and dialogs, and what floats over the page."],
  ["bg-muted, text-muted-foreground", "Quiet ground, and text that is secondary."],
  ["bg-accent", "The ground under a hovered or highlighted row."],
  ["bg-primary, text-primary-foreground", "The highlight colour, and text on it."],
  ["bg-highlight-soft", "A tint of the highlight colour, for what is chosen or current."],
  ["border-border, border-border-strong, border-input", "Edges: default, emphasised, and around controls."],
  ["bg-destructive, bg-success, bg-warning", "States, each with a -foreground for text on it."],
  ["fill-chart-1 to fill-chart-5", "Series colours of charts, in a fixed, checked order."],
  ["rounded-control, rounded-surface", "Corners of controls, and of surfaces. Both follow data-radius."],
  ["h-control, h-control-sm, h-control-lg", "Heights of controls."],
  ["duration-instant, duration-base, duration-slow, ease-out", "Motion."],
] as const;

export default function Page() {
  return (
    <Doc
      href="/docs/theming"
      onPage={[
        { id: "try", title: "Try it" },
        { id: "attributes", title: "The three attributes" },
        { id: "any", title: "Any colour, any roundness" },
        { id: "part", title: "A theme for part of a page" },
        { id: "brand", title: "A brand's own colours and fonts" },
        { id: "tokens", title: "The tokens" },
      ]}
    >
      <h2 id="try">Try it</h2>
      <p>These switches set three attributes on this page. Everything on the site follows, and the choice is remembered.</p>
      <div className="mt-4">
        <ThemePanel />
      </div>

      <h2 id="attributes">The three attributes</h2>
      <Code code={`<html data-theme="dark" data-radius="lg" data-accent="violet">`} language="html" />
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Attribute</TableHead>
            <TableHead>Values</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <C>data-theme</C>
            </TableCell>
            <TableCell>light, dark (or the class dark)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <C>data-radius</C>
            </TableCell>
            <TableCell>none, sm, md, lg, full (controls become pills)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <C>data-accent</C>
            </TableCell>
            <TableCell>teal, blue, violet, pink, red, orange, amber, green, ink</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p>
        The <a href="/components/theme-provider">theme-provider</a> component lets visitors switch and remembers their choice, without a flash of the wrong theme
        when the page loads.
      </p>

      <h2 id="any">Any colour, any roundness</h2>
      <p>
        Set <C>--accent-hue</C> (0 to 360), <C>--accent-chroma</C> (0 to about 0.25) and <C>--radius</C> yourself. Lightness is chosen by the theme, so text on the
        highlight colour keeps its contrast in both modes.
      </p>
      <Code code={`:root {\n  --accent-hue: 262;\n  --accent-chroma: 0.19;\n  --radius: 0.5rem;\n}`} language="css" />

      <h2 id="part">A theme for part of a page</h2>
      <p>The attributes work on any element, so one block can carry its own mode and colour whatever the page is set to.</p>
      <div data-theme="dark" data-accent="violet" className="mt-4 rounded-surface border bg-background p-6 text-foreground">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Dark and violet, inside this page</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="soft">Soft</Button>
        </div>
      </div>
      <Code code={`<section data-theme="dark" data-accent="violet">…</section>`} language="html" />

      <h2 id="brand">A brand's own colours and fonts</h2>
      <p>
        They go in a block after the theme's import in the global stylesheet. Components are never edited to restyle them: they draw only from these variables.
      </p>
      <Code
        language="css"
        title="src/app/globals.css"
        code={`@import "tailwindcss";\n@import "tw-animate-css";\n@import "../styles/rivier-ui.css";\n\n:root {\n  --accent-hue: 28;\n  --accent-chroma: 0.17;\n  --radius: 0.75rem;\n}`}
      />

      <h2 id="tokens">The tokens</h2>
      <p>
        The names follow the shadcn convention. The whole stylesheet, with both modes, is <a href="/r/theme.json">the theme item</a>.
      </p>
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Utilities</TableHead>
            <TableHead>For</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TOKENS.map(([names, use]) => (
            <TableRow key={names}>
              <TableCell className="font-mono text-[0.8125rem]">{names}</TableCell>
              <TableCell>{use}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Doc>
  );
}
