import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Editors } from "../_showcase/editors";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Code, text and pictures: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="editors" title="Code, text and pictures" description="A code block to read and copy, a Markdown editor with its toolbar and the project's own preview, and pictures to crop and to mark, by pointer or by keys." dir={dirFrom(await searchParams)}>
      <Editors />
    </Lab>
  );
}
