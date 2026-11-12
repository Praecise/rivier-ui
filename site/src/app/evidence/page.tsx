import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Evidence } from "../_showcase/evidence";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Comparison and provenance: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="evidence" title="Comparison and provenance" description="A then-and-now slider over any two layers, a key of classes told apart by pattern as well as colour, and a label that says what a picture is and cannot be covered by its controls." dir={dirFrom(await searchParams)}>
      <Evidence />
    </Lab>
  );
}
