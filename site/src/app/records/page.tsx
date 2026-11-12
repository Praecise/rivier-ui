import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";
import { Records } from "../_showcase/records";

export const metadata: Metadata = { title: "Records and decisions: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab
      id="records"
      title="Records and decisions"
      description="Comparing things, showing what is known and where it came from, asking permission, choosing a language, and what a price is made of."
      dir={dirFrom(await searchParams)}
    >
      <Records />
    </Lab>
  );
}
