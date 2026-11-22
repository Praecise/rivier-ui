import { C, Code } from "../../_site/code";
import { Doc, docMetadata } from "../../_site/doc";
import { SITE, items } from "../../_site/registry";

export const metadata = docMetadata("/docs/assistants");

export default function Page() {
  const button = items().find((entry) => entry.name === "button");
  const header = button ? (/\/\*\*[\s\S]*?\*\//.exec(button.source)?.[0] ?? "") : "";
  return (
    <Doc
      href="/docs/assistants"
      onPage={[
        { id: "header", title: "The header of every file" },
        { id: "llms", title: "llms.txt" },
        { id: "registry", title: "The registry" },
        { id: "markdown", title: "A page as Markdown" },
        { id: "conventions", title: "Conventions" },
        { id: "not-yet", title: "What is not there yet" },
      ]}
    >
      <p>
        An assistant that writes interface code does better when it can find out what exists, when each thing is the right choice, and what correct use looks like. The
        library is written to answer those three questions from its own files.
      </p>

      <h2 id="header">The header of every file</h2>
      <p>Every component starts with what it is, when to use it and what to use instead when it is the wrong choice, and an example that works. This is the button's:</p>
      <Code code={header} title="registry/ui/button.tsx" />
      <p>Nothing else is listed by hand. What an item depends on is read from its imports.</p>

      <h2 id="llms">llms.txt</h2>
      <p>
        <a href="/llms.txt">{SITE}/llms.txt</a> is every item with its purpose, when to use it and its example, in one plain file, generated from the headers. Give it
        to an assistant before it writes a component of its own.
      </p>

      <h2 id="registry">The registry</h2>
      <p>
        <a href="/registry.json">registry.json</a> lists every item, and <C>/r/&lt;name&gt;.json</C> holds one item with its source, in the shadcn registry format.
        Tools that read that format can install from here: see <a href="/docs/installation">Installation</a>.
      </p>
      <Code code={`curl ${SITE}/r/button.json`} language="sh" />

      <h2 id="markdown">A page as Markdown</h2>
      <p>
        Each <a href="/components">component's page</a> has a button that copies the component as Markdown: its description, when to use it, how to add it and its
        example, ready to paste into a conversation.
      </p>

      <h2 id="conventions">Conventions</h2>
      <p>
        <a href="/docs/conventions">Conventions</a> is how a component here is written. A project's own components can follow the same rules, so that the theme
        reaches them and an assistant can read them the same way.
      </p>

      <h2 id="not-yet">What is not there yet</h2>
      <p>
        There is no MCP server of the library's own. The shadcn command's MCP server reads registries in this format, but it has not been tested with this one, so
        this site does not say it works.
      </p>
    </Doc>
  );
}
