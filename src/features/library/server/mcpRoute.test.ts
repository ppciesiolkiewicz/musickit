import assert from "node:assert/strict";
import test from "node:test";
import { GET, POST } from "@/app/api/dev/mcp/route";

const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new Request("http://localhost/api/dev/mcp", { method: "POST", headers: { "content-type": "application/json", ...headers }, body }));
const ping = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" });

function set(env: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

async function withEnv(env: Record<string, string | undefined>, f: () => Promise<void>) {
  const old = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  set(env);
  try { await f(); } finally { set(old); }
}

test("production answers 404 first", () => withEnv({ NODE_ENV: "production" }, async () => {
  assert.equal((await post(ping)).status, 404);
  assert.equal(GET().status, 404);
}));

test("the route refuses what it should, without a database", () => withEnv({ NODE_ENV: "development", DATABASE_URL: undefined }, async () => {
  assert.equal(GET().status, 405);
  assert.equal((await post(ping, { origin: "https://evil.example" })).status, 403);
  assert.equal((await post(ping, { origin: "null" })).status, 403);
  assert.equal((await post("x".repeat(1_000_001))).status, 413);
  assert.equal((await post(ping, { "content-length": "2000000" })).status, 413);
  const bad = await post("{not json");
  assert.equal(((await bad.json()) as { error: { code: number } }).error.code, -32700);
  assert.equal((await post(ping)).status, 503);
}));
