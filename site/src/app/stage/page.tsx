import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";
import { Stage } from "../_showcase/stage";

export const metadata: Metadata = { title: "Film stage: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="stage" title="Film stage" description="A clock and a transport for a sequence of timed scenes the project draws itself, with a scrubber, a scene strip, captions, hotspots and narration in step, and a way to draw any moment exactly for export." dir={dirFrom(await searchParams)}>
      <Stage />
    </Lab>
  );
}
