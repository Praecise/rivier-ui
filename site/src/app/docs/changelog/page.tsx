import { Doc, docMetadata } from "../../_site/doc";
import { Markdown, headingsOf } from "../../_site/markdown";
import { readLibraryFile } from "../../_site/registry";

export const metadata = docMetadata("/docs/changelog");

export default function Page() {
  const source = readLibraryFile("CHANGELOG.md");
  return (
    <Doc href="/docs/changelog" onPage={headingsOf(source)}>
      <Markdown source={source} />
    </Doc>
  );
}
