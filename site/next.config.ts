import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const here = dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  // Packages are installed once, in the library's folder above this one.
  turbopack: { root: resolve(here, "..") },
  // Types are checked by the library's own "npm run typecheck" (TypeScript 7), which covers the registry
  // these components are copied from.
  typescript: { ignoreBuildErrors: true },
};

export default config;
