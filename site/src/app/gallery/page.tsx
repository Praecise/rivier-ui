import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { GalleryShowcase } from "../_showcase/gallery";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Pictures and uploads: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab
      id="gallery"
      title="Pictures and uploads"
      description="A gallery that opens a full-screen viewer with swipe, keys and zoom; shared-element transitions; and a dropzone with rows for each file's progress."
      dir={dirFrom(await searchParams)}
    >
      <GalleryShowcase />
    </Lab>
  );
}
