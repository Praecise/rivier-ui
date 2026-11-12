import type { Metadata } from "next";
import { Dates } from "../_showcase/dates";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Dates and times: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="dates" title="Dates and times" description="A calendar for a day, several days or a range; a date picker; offered time slots; and a time field. No native pickers." dir={dirFrom(await searchParams)}>
      <Dates />
    </Lab>
  );
}
