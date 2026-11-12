import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";
import { Players } from "../_showcase/players";

export const metadata: Metadata = { title: "Video and sound: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="players" title="Video and sound" description="A scrubber, a video player with captions, and a sound player with a waveform and a transcript. The parts drive an element the project renders." dir={dirFrom(await searchParams)}>
      <Players />
    </Lab>
  );
}
