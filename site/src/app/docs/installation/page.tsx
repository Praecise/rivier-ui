import { C, Code } from "../../_site/code";
import { Doc, docMetadata } from "../../_site/doc";
import { SITE } from "../../_site/registry";

export const metadata = docMetadata("/docs/installation");

const COMPONENTS_JSON = `{
  "registries": {
    "@rivier-ui": "${SITE}/r/{name}.json"
  }
}`;

const GLOBALS = `@import "tailwindcss";
@import "tw-animate-css";
@import "../styles/rivier-ui.css";`;

const USE = `import { Button } from "@/components/ui/button";

export default function Page() {
  return <Button>Save</Button>;
}`;

export default function Page() {
  return (
    <Doc
      href="/docs/installation"
      onPage={[
        { id: "needs", title: "What a project needs" },
        { id: "shadcn", title: "With the shadcn command" },
        { id: "own", title: "With Rivier UI's own command" },
        { id: "hand", title: "By hand" },
        { id: "use", title: "Use a component" },
      ]}
    >
      <h2 id="needs">What a project needs</h2>
      <p>
        React 19, Tailwind CSS 4, and the <C>@/</C> import alias pointing at the project's source folder. A Next.js app has all three. Components go in{" "}
        <C>src/components/&lt;group&gt;/</C>, helpers in <C>src/lib/</C> and the theme in <C>src/styles/rivier-ui.css</C>.
      </p>

      <h2 id="shadcn">With the shadcn command</h2>
      <p>
        This site serves the library as a registry in the shadcn format, under the name <C>@rivier-ui</C>. Name it once in the project's <C>components.json</C>:
      </p>
      <Code code={COMPONENTS_JSON} language="json" title="components.json" />
      <p>Then add components by name. What a component depends on, and the theme, come with it, and the packages it needs are installed.</p>
      <Code code="npx shadcn@latest add @rivier-ui/button @rivier-ui/dialog" language="sh" />
      <p>One thing that command does not do, so do it once by hand: import the theme after Tailwind in the global stylesheet.</p>
      <Code code={GLOBALS} language="css" title="src/app/globals.css" />
      <p>Checked with the shadcn command 4.23.0 on 22 November 2026.</p>

      <h2 id="own">With Rivier UI's own command</h2>
      <p>
        The library's own command copies the files with their headers, puts the theme in place, imports it into the global stylesheet, and installs the packages. It
        never overwrites a file you have changed unless you say <C>overwrite</C>. It runs from a copy of the library, which opens at launch:
      </p>
      <Code
        language="sh"
        code={`npm run ui -- add button dialog dir=<project>   # copy them, what they need, and the theme
npm run ui -- add all dir=<project>
npm run ui -- doctor dir=<project>               # what is missing or out of place`}
      />
      <p>
        Every word it takes is on <a href="/docs/command">The command</a>.
      </p>

      <h2 id="hand">By hand</h2>
      <p>
        Each <a href="/components">component's page</a> has its whole source, the packages it imports and the other items it needs. Copy the file to the place the
        page names, do the same for the items it lists, install the packages, and add the <a href="/r/theme.json">theme</a> as <C>src/styles/rivier-ui.css</C>.
      </p>

      <h2 id="use">Use a component</h2>
      <Code code={USE} title="src/app/page.tsx" />
      <p>
        The look comes from the theme: see <a href="/docs/theming">Theming</a> before changing a component's classes.
      </p>
    </Doc>
  );
}
