import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";
import { Surfaces } from "../_showcase/surfaces";

export const metadata: Metadata = { title: "Surfaces and navigation: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="surfaces" title="Surfaces and navigation" description="An alert dialog, a hover card, a collapsible, a menubar, a navigation menu, a toolbar, a button group, resizable panels, a sidebar, a skip link, hidden words and shortcuts." dir={dirFrom(await searchParams)}>
      <Surfaces />
    </Lab>
  );
}
