import { C } from "../../_site/code";
import { Doc, docMetadata } from "../../_site/doc";
import { PAGES } from "../../_showcase/pages";

export const metadata = docMetadata("/docs/accessibility");

export default function Page() {
  return (
    <Doc
      href="/docs/accessibility"
      onPage={[
        { id: "every", title: "What every component does" },
        { id: "checked", title: "How it is checked" },
        { id: "pages", title: "The pages the checks drive" },
        { id: "limits", title: "What the checks do not prove" },
      ]}
    >
      <h2 id="every">What every component does</h2>
      <ul>
        <li>
          <strong>Keyboard.</strong> It is operable to the WAI-ARIA pattern for its kind. Behaviour comes from Radix where a primitive exists; where none does, the
          pattern is written here.
        </li>
        <li>
          <strong>Names and states.</strong> Roles, names and states are there for a screen reader. An icon-only control has a name. State is never carried by colour
          alone: chosen, disabled, failed and current each have a mark or a word too.
        </li>
        <li>
          <strong>Focus.</strong> It is visible, it moves into what opens, and it returns to what opened it.
        </li>
        <li>
          <strong>Right-to-left.</strong> Layout uses logical properties, arrow keys follow the reading direction, and icons that point are mirrored.
        </li>
        <li>
          <strong>Phone width.</strong> It works from 320 pixels wide, and touch targets are at least 40 pixels.
        </li>
        <li>
          <strong>Less motion.</strong> Only transform and opacity move, and everything stops when the visitor asks for less motion.
        </li>
        <li>
          <strong>No fixed words.</strong> What a person reads or hears is passed in, or is a prop with an English default, so a product in any language can use it.
        </li>
        <li>
          <strong>No dragging required.</strong> Anything done by dragging can also be done with buttons or keys.
        </li>
        <li>
          <strong>Contrast.</strong> Text keeps at least 4.5 to 1 in light and dark, with any highlight colour: the theme chooses the lightness.
        </li>
      </ul>

      <h2 id="checked">How it is checked</h2>
      <p>
        Each group of components has a page on this site and a file of checks that drives that page in a real browser. Every group is run four times: at desktop
        width, at desktop width right-to-left, at 390 pixels with touch, and at 390 pixels right-to-left. Each time the checks press the component's keys one by one
        and read its roles, names and states, where focus goes on open and on close, and its controlled and uncontrolled use. Around them the runner checks that
        axe-core finds no WCAG 2.2 A or AA violation, that nothing overflows sideways, and that the page and the console report no errors.
      </p>
      <p>
        The library's own lint also runs the React rules that a project's lint runs on a copied component, so a component does not fail in the project it lands in.
      </p>

      <h2 id="pages">The pages the checks drive</h2>
      <ul>
        {PAGES.map((page) => (
          <li key={page.href}>
            <a href={page.href}>{page.title}</a>. {page.description}
          </li>
        ))}
      </ul>
      <p>
        Add <C>?dir=rtl</C> to any of them to see it right-to-left.
      </p>

      <h2 id="limits">What the checks do not prove</h2>
      <p>
        An automatic scan finds only part of what can go wrong, and a browser driven by a script is not a person using a screen reader. The checks show that the
        patterns are in place and stay in place. They do not replace testing a finished product with the people who will use it.
      </p>
    </Doc>
  );
}
