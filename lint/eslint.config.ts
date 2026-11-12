// Rivier UI: lint rules for the registry, the scripts and the showcase.
//
//   npm run lint:install   once (its own packages: see lint/package.json for why)
//   npm run lint
//
// The React rules are the ones a project's own lint runs on a copied component (eslint-plugin-react-hooks,
// with the React Compiler rules such as set-state-in-effect), so a component that passes here passes there.

import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/node_modules/**", "**/.next/**", ".smoke/**", "r/**", "site/src/components/**", "site/src/lib/**", "site/next-env.d.ts"]),
  ...tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "no-restricted-syntax": [
        "error",
        { selector: "ExportDefaultDeclaration", message: "No default exports in the library (see CONVENTIONS.md)." },
      ],
    },
  },
  {
    // Next.js requires default exports for pages, layouts and its config.
    files: ["site/**"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    files: ["lint/eslint.config.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
]);
