import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Entry } from "../_showcase/entry";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Data entry: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="entry" title="Data entry" description="A form that checks itself and lists its faults, tags, a one-time code, a password with its rules, an amount of money in any locale, a colour in OKLCH and a rating." dir={dirFrom(await searchParams)}>
      <Entry />
    </Lab>
  );
}
