import type { Metadata } from "next";
import { CarouselShowcase } from "../_showcase/carousel";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Carousels and media rows: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab
      id="carousel"
      title="Carousels and media rows"
      description="A carousel on the browser's own scroll snapping, with buttons, dots, a count and an autoplay that can always be stopped; and the rows of added pictures, to order, describe and choose a cover from."
      dir={dirFrom(await searchParams)}
    >
      <CarouselShowcase />
    </Lab>
  );
}
