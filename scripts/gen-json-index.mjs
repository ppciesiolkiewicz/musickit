/**
 * Writes `index.gen.ts` in each folder given: one static import per `*.json` file there, and `FILES`, a record of them
 * by file name (without `.json`), sorted. Folders of one-file-per-item data (the library seed) load
 * through it, so a script or an agent reads only the files it needs, never one big file.
 *
 *   node scripts/gen-json-index.mjs src/features/library/seed/plans src/features/library/seed/blocks
 *   npm run -s gen:json-index        (every folder below)
 */
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const FOLDERS = [
  "src/features/library/seed/plans",
  "src/features/library/seed/blocks",
  "src/features/exercises/riffs/book",
];

const ident = (name, i) => `f${i}_${name.replace(/[^a-zA-Z0-9]/g, "_")}`.slice(0, 80);

export async function writeIndex(dir) {
  const names = (await readdir(dir)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
  const lines = [
    "// Written by scripts/gen-json-index.mjs; don't edit by hand. Run `npm run -s gen:json-index` after adding or removing a file here.",
    ...names.map((n, i) => `import ${ident(n, i)} from "./${n}.json";`),
    "",
    `export const FILES: Record<string, unknown> = {${names.length ? "\n" + names.map((n, i) => `  ${JSON.stringify(n)}: ${ident(n, i)},`).join("\n") + "\n" : ""}};`,
    "",
  ];
  await writeFile(path.join(dir, "index.gen.ts"), lines.join("\n"));
  return names.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dirs = process.argv.slice(2).length ? process.argv.slice(2) : FOLDERS;
  for (const d of dirs) console.log(`${await writeIndex(d)} files in ${d}/index.gen.ts`);
}
