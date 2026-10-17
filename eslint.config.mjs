import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The design system is used through its public index only: a component's other files are its private parts.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/components/ui/*", "**/components/ui/*"],
          message: 'Import from "@/components/ui" (its index.ts); the files inside a component folder are private.',
        }],
      }],
    },
  },
  // Inside the design system a component reaches another one through that folder's index.ts, never its private files.
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^\\.\\./\\.\\./(atoms|molecules|organisms)/[^/]+/.+",
          message: "Import the component folder (its index.ts), not a file inside it.",
        }],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
