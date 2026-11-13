import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { buildStructure, type Structure } from "../model/structure";

/** Every .ts/.tsx/.mts file under `<root>/src`, keyed by its repo path. */
export function readSources(root = process.cwd()): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|mts)$/.test(e.name) && !e.name.endsWith(".d.ts")) out[relative(root, p).split("\\").join("/")] = readFileSync(p, "utf8");
    }
  };
  walk(join(root, "src"));
  return out;
}

/** The structure of the repo's src as it is on disk now. */
export function scanStructure(root = process.cwd()): Structure {
  return buildStructure(readSources(root));
}
