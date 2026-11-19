import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApiRoutes, parseRoute, routeGroup, routePath } from "./apiRoutes";

test("routePath turns a route file into its URL", () => {
  assert.equal(routePath("src/app/api/videos/[id]/file/route.ts"), "/api/videos/[id]/file");
  assert.equal(routePath("src/app/(site)/api/x/route.ts"), "/api/x");
});

const SRC = `
import { signedIn } from "x";

export const runtime = "nodejs";

/** The player's videos, newest first: { videos }. */
export async function GET(req: Request) { await signedIn(req); }

/**
 * Save one:
 * JSON { id }.
 */
export async function POST(req: Request) {}

export function DELETE() {}
`;

test("parseRoute reads each method and the doc above it", () => {
  const r = parseRoute("src/app/api/videos/route.ts", SRC);
  assert.equal(r.path, "/api/videos");
  assert.deepEqual(r.methods, [
    { method: "GET", doc: "The player's videos, newest first: { videos }." },
    { method: "POST", doc: "Save one: JSON { id }." },
    { method: "DELETE", doc: "" },
  ]);
  assert.equal(r.guard, "signed in");
});

test("parseRoute marks dev-only and open routes", () => {
  assert.equal(parseRoute("src/app/api/dev/x/route.ts", "devGate(); signedIn(").guard, "dev only");
  assert.equal(parseRoute("src/app/api/admin/x/route.ts", "await devOrAdminGate(req);").guard, "dev or admin");
  assert.equal(parseRoute("src/app/api/x/route.ts", "").guard, null);
});

test("parseRoute doesn't take a doc that belongs to something else", () => {
  const r = parseRoute("src/app/api/x/route.ts", `/** helper */\nfunction h() {}\nexport async function GET() {}`);
  assert.deepEqual(r.methods, [{ method: "GET", doc: "" }]);
  const s = parseRoute("src/app/api/x/route.ts", `/** helper */\nfunction h() {}\n/** Read it. */\nexport async function GET() {}`);
  assert.deepEqual(s.methods, [{ method: "GET", doc: "Read it." }]);
});

test("buildApiRoutes sorts by path; routeGroup is the first segment", () => {
  const routes = buildApiRoutes({ "src/app/api/b/route.ts": "", "src/app/api/a/x/route.ts": "" });
  assert.deepEqual(routes.map((r) => r.path), ["/api/a/x", "/api/b"]);
  assert.equal(routeGroup("/api/auth/google/start"), "auth");
});
