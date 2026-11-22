import type { Metadata } from "next";
import { Boards } from "../_showcase/boards";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Trees, boards and diagrams: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="boards" title="Trees, boards and diagrams" description="A tree of files, a board of cards moved by mouse, keys or menu, a diagram of steps edited by pointer or keys, a tour of an interface and an inbox of notices." dir={dirFrom(await searchParams)}>
      <Boards />
    </Lab>
  );
}
