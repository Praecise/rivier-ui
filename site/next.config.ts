import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const here = dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  // Packages are installed once, in the library's folder above this one.
  // A tree staged for release (scripts/stage-site.ts) has them beside this file instead.
  turbopack: { root: existsSync(resolve(here, "package-lock.json")) ? here : resolve(here, "..") },
  // Types are checked by the library's own "npm run typecheck" (TypeScript 7), which covers the registry
  // these components are copied from.
  typescript: { ignoreBuildErrors: true },
};

export default config;
