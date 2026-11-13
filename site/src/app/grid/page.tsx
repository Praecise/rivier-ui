import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Grid } from "../_showcase/grid";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Data grid: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="grid" title="Data grid" description="Records to sort, narrow, group, choose and change: a filter per column and a search across all, a pinned column, columns shown and hidden, pages, two thousand rows drawn only where they are seen, and cells edited in place. One tab stop, arrow keys from cell to cell. The orders are invented." dir={dirFrom(await searchParams)}>
      <Grid />
    </Lab>
  );
}
