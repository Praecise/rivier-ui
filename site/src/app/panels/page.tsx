import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";
import { Panels } from "../_showcase/panels";

export const metadata: Metadata = { title: "Panels: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab
      id="panels"
      title="Panels"
      description="A bottom sheet with snap points, a panel docked beside the content, and the frame around a map."
      dir={dirFrom(await searchParams)}
    >
      <Panels />
    </Lab>
  );
}
