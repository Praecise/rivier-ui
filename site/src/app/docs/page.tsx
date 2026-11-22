import { C } from "../_site/code";
import { Doc, docMetadata } from "../_site/doc";
import { CATEGORIES, items } from "../_site/registry";

export const metadata = docMetadata("/docs");

export default function Page() {
  const all = items();
  return (
    <Doc
      href="/docs"
      onPage={[
        { id: "different", title: "What makes it different" },
        { id: "inside", title: "What is in it" },
        { id: "built-on", title: "What it is built on" },
        { id: "next", title: "Where to go next" },
      ]}
    >
      <p>
        Rivier UI is a library of React components that you copy into a project and own. It is written so that an assistant can find the right component, use it
        correctly, and restyle a whole product from one place. It is public and licensed under Apache 2.0. Changes are dated; there are no version numbers yet.
      </p>

      <h2 id="different">What makes it different</h2>
      <ul>
        <li>
          <strong>Copied in, not installed.</strong> <C>rivier-ui add dialog</C> puts the source in your project. You can read it and change it, and nothing breaks on an
          upgrade you did not ask for.
        </li>
        <li>
          <strong>One theme, three switches.</strong> Light or dark, square to round, any highlight colour: three attributes on <C>{"<html>"}</C>. Every component draws
          only from the theme's variables, so the switches reach everything, charts and 3D included.
        </li>
        <li>
          <strong>Written to be read by an assistant.</strong> Every file starts with what it is, when to use it and when not to, and an example that works. From those
          headers the library generates <a href="/llms.txt">llms.txt</a>, a registry that shadcn-compatible tools can read, and the pages of this site.
        </li>
        <li>
          <strong>Past the flat page.</strong> Bento grids, motion and page transitions, 3D scenes and charts are part of the same library and the same theme, not
          separate products with separate looks.
        </li>
        <li>
          <strong>Checked in a real browser.</strong> Each component's keyboard pattern is driven key by key at desktop and phone widths, left-to-right and
          right-to-left, with an accessibility scan. See <a href="/docs/accessibility">Accessibility</a>.
        </li>
      </ul>

      <h2 id="inside">What is in it</h2>
      <p>{all.length} items today, in six groups.</p>
      <ul>
        {CATEGORIES.map((category) => (
          <li key={category.id}>
            <a href={`/components#${category.id}`}>
              <strong>{category.title}</strong>
            </a>{" "}
            ({all.filter((entry) => entry.category === category.id).length}). {category.description}
          </li>
        ))}
      </ul>

      <h2 id="built-on">What it is built on</h2>
      <p>
        Radix for behaviour and accessibility, Tailwind CSS for styling, Motion for animation, three.js for 3D, d3 for the maths of charts, cmdk for the command
        palette and Sonner for toasts. Where Radix has no primitive (a calendar, a sortable list, a bottom sheet, media players, a carousel, a windowed list) the
        component is written here to the WAI-ARIA pattern for its kind, so no package is added for one component. Every dependency is MIT or Apache 2.0, and nothing
        is hosted. The names of the theme's variables follow the shadcn convention, so components written for it take this theme as they are.
      </p>

      <h2 id="next">Where to go next</h2>
      <ul>
        <li>
          <a href="/docs/installation">Installation</a>: put the first components in a project.
        </li>
        <li>
          <a href="/docs/theming">Theming</a>: try the three switches on this page, live.
        </li>
        <li>
          <a href="/components">Components</a>: every item, with its example, its source and a working demonstration.
        </li>
      </ul>
    </Doc>
  );
}
