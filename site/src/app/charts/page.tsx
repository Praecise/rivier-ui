import type { Metadata } from "next";
import { MoreCharts } from "../_showcase/charts";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Charts: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab
      id="charts"
      title="Charts"
      description="Distributions, forecasts with their uncertainty, hierarchies, flows, networks, calendars and plans: each drawn from d3 maths in the theme's series colours, read by arrow keys, and carrying its data as a table for screen readers. All figures are examples."
      dir={dirFrom(await searchParams)}
    >
      <MoreCharts />
    </Lab>
  );
}
