import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { buildApiRoutes, type ApiRoute } from "../model/apiRoutes";

/** Every route file under `<root>/src/app/api` as it is on disk now, with its methods and their docs. */
export function scanApiRoutes(root = process.cwd()): ApiRoute[] {
  const sources: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/^route\.(ts|tsx|js)$/.test(e.name)) sources[relative(root, p).split("\\").join("/")] = readFileSync(p, "utf8");
    }
  };
  walk(join(root, "src/app/api"));
  return buildApiRoutes(sources);
}
