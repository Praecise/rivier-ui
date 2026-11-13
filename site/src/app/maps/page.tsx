import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";
import { Maps } from "../_showcase/maps";

export const metadata: Metadata = { title: "Maps: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab
      id="maps"
      title="Maps"
      description="Maps drawn from GeoJSON the page already has, in any projection: regions coloured by a number with a legend in words, places, routes, hexagon bins and tiles from an address the project names. Zoom and pan by pointer, wheel with Ctrl, buttons and keys; every layer read by arrow keys. The coast and its numbers are invented."
      dir={dirFrom(await searchParams)}
    >
      <Maps />
    </Lab>
  );
}
