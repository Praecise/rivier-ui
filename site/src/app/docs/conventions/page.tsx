import { Doc, docMetadata } from "../../_site/doc";
import { Markdown, headingsOf } from "../../_site/markdown";
import { readLibraryFile } from "../../_site/registry";

export const metadata = docMetadata("/docs/conventions");

export default function Page() {
  const source = readLibraryFile("CONVENTIONS.md");
  return (
    <Doc href="/docs/conventions" onPage={headingsOf(source)}>
      <Markdown source={source} />
    </Doc>
  );
}
