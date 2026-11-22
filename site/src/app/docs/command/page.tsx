import { C, Code } from "../../_site/code";
import { Doc, docMetadata } from "../../_site/doc";

export const metadata = docMetadata("/docs/command");

export default function Page() {
  return (
    <Doc
      href="/docs/command"
      onPage={[
        { id: "commands", title: "What it does" },
        { id: "words", title: "Its words" },
        { id: "add", title: "What add does" },
        { id: "doctor", title: "What doctor checks" },
      ]}
    >
      <p>
        <C>rivier-ui</C> is the library's own command. It runs from a copy of the library, as <C>npm run ui --</C>, and works on the project named with <C>dir=</C>.
        <a href="/docs/installation">Installation</a> also has the ways that work from this site alone.
      </p>

      <h2 id="commands">What it does</h2>
      <Code
        language="sh"
        code={`rivier-ui list [words]            # what there is, or a search
rivier-ui info <name>             # what an item is, when to use it, an example
rivier-ui add <name>... | all     # copy items, what they need, and the theme into the project
rivier-ui theme                   # copy (or refresh) only the theme
rivier-ui doctor                  # check a project`}
      />

      <h2 id="words">Its words</h2>
      <p>Options are plain words, not flags.</p>
      <ul>
        <li>
          <C>dir=&lt;project&gt;</C>: the project to work on.
        </li>
        <li>
          <C>overwrite</C>: replace files that are already there, your own edits to them included.
        </li>
        <li>
          <C>dry</C>: say what would be done, and do nothing.
        </li>
      </ul>

      <h2 id="add">What add does</h2>
      <ul>
        <li>
          Copies each item, and every item it imports, into <C>src/components/&lt;group&gt;/</C> and <C>src/lib/</C>, with its header comment.
        </li>
        <li>
          Puts the theme in <C>src/styles/rivier-ui.css</C> and imports it after Tailwind in the global stylesheet.
        </li>
        <li>Installs the packages the items import, at their latest release, and the type packages of those that keep their types apart.</li>
        <li>
          Leaves alone any file you have changed, unless you say <C>overwrite</C>.
        </li>
      </ul>

      <h2 id="doctor">What doctor checks</h2>
      <p>That the theme is there, current and imported; that the packages the copied items need are installed; and which copied files differ from the library's.</p>
    </Doc>
  );
}
