import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Explainers } from "../_showcase/explainers";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Explainers: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab
      id="explainers"
      title="Explainers"
      description="A film written as plain data: a title, a chart, a map, a 3D model, a comparison, a quote and a caption, each with captions, narration and a label that says how it was made. Played and scrubbed on the film stage, drawn frame by frame for export, and checked with its faults in words. The town and its numbers are invented."
      dir={dirFrom(await searchParams)}
    >
      <Explainers />
    </Lab>
  );
}
