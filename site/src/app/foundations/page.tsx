import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Foundations } from "../_showcase/foundations";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Foundations: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="foundations" title="Foundations" description="Reading direction, one shared live region for announcements, and type that follows the script of the language." dir={dirFrom(await searchParams)}>
      <Foundations />
    </Lab>
  );
}
