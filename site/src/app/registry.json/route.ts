import { readLibraryFile } from "../_site/registry";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(readLibraryFile("registry.json"), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
}
