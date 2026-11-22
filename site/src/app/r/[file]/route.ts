// The registry's items, one per address: /r/button.json. Read by the shadcn command and by other tools.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readLibraryFile } from "../../_site/registry";

export const dynamic = "force-static";
export const dynamicParams = false;

const folder = (): string => {
  try {
    readdirSync(join(process.cwd(), "r"));
    return join(process.cwd(), "r");
  } catch {
    return join(process.cwd(), "..", "r");
  }
};

export const generateStaticParams = (): { file: string }[] =>
  readdirSync(folder())
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({ file }));

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }): Promise<Response> {
  const { file } = await params;
  if (!/^[\w-]+\.json$/.test(file)) return new Response("Not found", { status: 404 });
  return new Response(readLibraryFile(`r/${file}`), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
}
