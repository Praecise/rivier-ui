import type { Metadata } from "next";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";
import { Models } from "../_showcase/models";

export const metadata: Metadata = { title: "3D models: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="models" title="3D models" description="A viewer for one model: glTF, or Gaussian splats. The 3D code and the file are fetched only when the viewer comes near the screen." dir={dirFrom(await searchParams)}>
      <Models />
    </Lab>
  );
}
