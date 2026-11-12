import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Flows } from "../_showcase/flows";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Flows and lists: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="flows" title="Flows and lists" description="A rail of steps, a wizard, a list that can be reordered by dragging, keyboard or buttons, a searchable select, and skeletons that hold the final size." dir={dirFrom(await searchParams)}>
      <Flows />
    </Lab>
  );
}
