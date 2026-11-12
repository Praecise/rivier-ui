import type { Metadata } from "next";
import { Conversation } from "../_showcase/conversation";
import { dirFrom } from "../_showcase/demo";
import { Lab } from "../_showcase/lab";

export const metadata: Metadata = { title: "Conversation: Rivier UI" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string | string[] }> }) {
  return (
    <Lab id="conversation" title="Conversation" description="A thread, messages, text that streams, one status line, a composer and a frame for structured parts: what every product with an assistant rebuilds." dir={dirFrom(await searchParams)}>
      <Conversation />
    </Lab>
  );
}
