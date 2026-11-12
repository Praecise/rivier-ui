import type { Metadata } from "next";
import { Choices } from "../_showcase/choices";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Choices: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="choices" title="Choices" description="Chips, a segmented control and a number stepper: small controls for picking among a few things." dir={dirFrom(await searchParams)}>
      <Choices />
    </Lab>
  );
}
