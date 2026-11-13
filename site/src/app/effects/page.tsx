import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Effects } from "../_showcase/effects";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Effects and 3D data: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="effects" title="Effects and 3D data" description="A word that changes in place, a background pattern, a beam between two parts, an orbit, confetti for a rare success, data as points in 3D and notes pinned to a model. All still under reduced motion." dir={dirFrom(await searchParams)}>
      <Effects />
    </Lab>
  );
}
