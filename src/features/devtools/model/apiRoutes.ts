import type { Permission } from "@/features/account/model";

/** One HTTP method a route file exports, with the doc comment above it ("" when it has none). */
export interface ApiMethod {
  method: string;
  doc: string;
}

/** One `route.ts` under src/app/api, read from its source. */
export interface ApiRoute {
  /** The URL, as `/api/videos/[id]/file`. */
  path: string;
  /** Repo path of the route file. */
  file: string;
  methods: ApiMethod[];
  /**
   * What the handler checks before it runs: a signed-in player (`signedIn`), dev only (`devGate`), or development or a
   * permission (`permissionGate(req, "<permission>")`).
   */
  guard: "signed in" | "dev only" | `${Permission} permission` | null;
}

// The doc block can't contain "*/", so a helper's comment never stretches into the next handler's.
const METHOD_RE = /(\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*)?export\s+(?:async\s+)?(?:function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

/** A JSDoc block's text, without the slashes and stars. */
function docText(block: string): string {
  return block
    .replace(/^\s*\/\*\*/, "")
    .replace(/\*\/\s*$/, "")
    .split("\n")
    .map((l) => l.replace(/^\s*\* ?/, "").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The URL a route file answers at: `src/app/api/a/[id]/route.ts` → `/api/a/[id]`. Route groups `(x)` are dropped. */
export function routePath(file: string): string {
  const segs = file.replace(/^src\/app/, "").replace(/\/route\.(ts|tsx|js)$/, "").split("/");
  return segs.filter((s) => !/^\(.*\)$/.test(s)).join("/") || "/";
}

/** One route file's methods, their docs and its guard. */
export function parseRoute(file: string, source: string): ApiRoute {
  const methods: ApiMethod[] = [];
  for (const m of source.matchAll(METHOD_RE)) methods.push({ method: m[2], doc: m[1] ? docText(m[1]) : "" });
  const permission = /\bpermissionGate\(\s*\w+\s*,\s*"(dev|content|admin)"/.exec(source)?.[1] as Permission | undefined;
  const guard = permission ? (`${permission} permission` as const) : /\bdevGate\(/.test(source) ? "dev only" : /\bsignedIn\(/.test(source) ? "signed in" : null;
  return { path: routePath(file), file, methods, guard };
}

/** Every route, sorted by path. */
export function buildApiRoutes(sources: Record<string, string>): ApiRoute[] {
  return Object.entries(sources)
    .map(([file, src]) => parseRoute(file, src))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** The first path segment after /api, which the page groups by: `/api/auth/google/start` → `auth`. */
export function routeGroup(path: string): string {
  return path.split("/")[2] ?? "";
}
