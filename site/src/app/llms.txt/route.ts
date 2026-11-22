import { readLibraryFile } from "../_site/registry";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(readLibraryFile("llms.txt"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
