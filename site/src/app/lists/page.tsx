import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";
import { Lists } from "../_showcase/lists";

export const metadata: Metadata = { title: "Long lists: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="lists" title="Long lists" description="A windowed list and grid: thousands of items of any height, only the ones in view in the page, each still announced with its place in the whole." dir={dirFrom(await searchParams)}>
      <Lists />
    </Lab>
  );
}
