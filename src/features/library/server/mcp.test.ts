import assert from "node:assert/strict";
import test from "node:test";
import { memoryUserDataRepo } from "@/features/userData/server/repo.memory";
import { PLAYER_A, baseFixture } from "./fixture";
import { DEV_ARGS, devScope, devTools, handleRpc, localRequest } from "./mcp";
import type { Deps } from "./query";
import { memoryLibraryRepo } from "./repo.memory";

const deps = (): Deps => ({ library: memoryLibraryRepo(baseFixture()), userData: memoryUserDataRepo(), today: () => "2026-11-15" });
const rpc = (method: string, params?: unknown, id = 1) => ({ jsonrpc: "2.0", id, method, params });
type Answer = { jsonrpc: string; id: unknown; result?: Record<string, unknown>; error?: { code: number; message: string } };
const call = async (d: Deps, name: string, args: unknown) => {
  const r = await handleRpc(d, rpc("tools/call", { name, arguments: args }));
  assert.equal(r.status, 200);
  return (r.body as Answer).result as { content: { type: string; text: string }[]; isError: boolean };
};

test("initialize answers the client's protocol version", async () => {
  const r = await handleRpc(deps(), rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "x", version: "1" } }));
  assert.equal(r.status, 200);
  const b = r.body as Answer;
  assert.equal(b.id, 1);
  assert.equal(b.result?.protocolVersion, "2025-03-26");
  assert.deepEqual(b.result?.capabilities, { tools: {} });
  assert.deepEqual(b.result?.serverInfo, { name: "musickit-library", version: "1" });
  const none = await handleRpc(deps(), rpc("initialize", {}));
  assert.equal(typeof (none.body as Answer).result?.protocolVersion, "string");
});

test("ping answers an empty result", async () => {
  assert.deepEqual((await handleRpc(deps(), rpc("ping"))).body, { jsonrpc: "2.0", id: 1, result: {} });
});

test("tools/list gives the six tools, each with the two dev arguments", async () => {
  const tools = ((await handleRpc(deps(), rpc("tools/list"))).body as Answer).result?.tools as { name: string; inputSchema: { properties: Record<string, unknown>; additionalProperties: boolean } }[];
  assert.equal(tools.length, 6);
  assert.equal(devTools().length, 6);
  for (const t of tools) {
    for (const k of Object.keys(DEV_ARGS)) assert.ok(k in t.inputSchema.properties, `${t.name} ${k}`);
    assert.equal(t.inputSchema.additionalProperties, false);
  }
});

test("tools/call find_blocks answers the list as text", async () => {
  const r = await call(deps(), "find_blocks", { topic: "guitar-scales", order: "newest" });
  assert.equal(r.isError, false);
  assert.equal(r.content[0].type, "text");
  assert.deepEqual((JSON.parse(r.content[0].text) as { id: string }[]).map((b) => b.id), ["S2", "S1"]);
});

test("a tool error is a result with isError", async () => {
  const r = await call(deps(), "get_block", { id: "nope" });
  assert.equal(r.isError, true);
  assert.ok(r.content[0].text.includes("nope"));
  const bad = await call(deps(), "find_blocks", { limit: "ten" });
  assert.equal(bad.isError, true);
  assert.ok(bad.content[0].text.includes("limit"));
});

test("a query that throws becomes a plain result and is logged", async () => {
  const d = deps();
  d.library.coverage = async () => { throw new Error("select * from secret_table failed"); };
  const logged: unknown[][] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => { logged.push(a); };
  try {
    const r = await handleRpc(d, rpc("tools/call", { name: "library_coverage", arguments: {} }));
    assert.equal(r.status, 200);
    const res = (r.body as Answer).result as { content: { text: string }[]; isError: boolean };
    assert.equal(res.isError, true);
    assert.equal(res.content[0].text, "The library could not be read.");
    assert.ok(!JSON.stringify(r.body).includes("secret_table"));
    assert.equal(logged.length, 1);
  } finally {
    console.error = orig;
  }
});

test("tools/call without a name is an invalid-params error", async () => {
  const r = await handleRpc(deps(), rpc("tools/call", {}));
  assert.equal((r.body as Answer).error?.code, -32602);
});

test("a notification answers 202 with no body", async () => {
  const r = await handleRpc(deps(), { jsonrpc: "2.0", method: "notifications/initialized" });
  assert.deepEqual(r, { status: 202 });
});

test("an unknown method is -32601; garbage is -32600", async () => {
  assert.equal(((await handleRpc(deps(), rpc("nope"))).body as Answer).error?.code, -32601);
  for (const bad of ["text", 5, null, [], {}, { jsonrpc: "1.0", id: 1, method: "ping" }, { jsonrpc: "2.0", id: 1 }, { jsonrpc: "2.0", id: {}, method: "ping" }]) {
    const r = await handleRpc(deps(), bad);
    assert.equal((r.body as Answer).error?.code, -32600, JSON.stringify(bad));
  }
});

test("devScope strips the two dev arguments and checks the player", async () => {
  const d = deps();
  const ok = await devScope({ player: PLAYER_A, include_not_enabled: true, topic: "x" }, d);
  assert.deepEqual(ok, { scope: { player: PLAYER_A, includeNotEnabled: true }, args: { topic: "x" } });
  assert.deepEqual(await devScope(undefined, d), { scope: {}, args: {} });
  for (const player of ["x", "c0000000-0000-4000-8000-0000000000ff", 5]) {
    const r = await devScope({ player }, d);
    assert.ok("error" in r && r.error.includes("player"), JSON.stringify(player));
  }
  const b = await devScope({ include_not_enabled: "yes" }, d);
  assert.ok("error" in b && b.error.includes("include_not_enabled"));
  const planIds = await devScope({ planIds: ["P3"] }, d);
  assert.ok("args" in planIds && "planIds" in (planIds.args as object) && !("planIds" in planIds.scope));
});

test("include_not_enabled shows the example block; a bad player is a tool error", async () => {
  const d = deps();
  const ids = async (args: unknown) => (JSON.parse((await call(d, "find_blocks", args)).content[0].text) as { id: string }[]).map((b) => b.id);
  assert.ok(!(await ids({})).includes("X"));
  assert.ok((await ids({ include_not_enabled: true })).includes("X"));
  const r = await call(d, "find_blocks", { player: "x" });
  assert.equal(r.isError, true);
  assert.ok(r.content[0].text.includes("player"));
  const mine = JSON.parse((await call(d, "find_blocks", { player: PLAYER_A, mine: "had" })).content[0].text) as unknown[];
  assert.equal(mine.length, 4);
});

test("localRequest accepts this machine only", () => {
  const ok = (origin: string | null, host: string | null) => localRequest({ origin, host });
  assert.ok(ok(null, "localhost:3000"));
  assert.ok(ok(null, "127.0.0.1"));
  assert.ok(ok(null, "[::1]:3000"));
  for (const o of ["http://localhost", "http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"]) assert.ok(ok(o, "localhost:3000"), o);
  for (const o of ["https://evil.example", "null", "http://localhost.evil.example", "http://evil.example:3000", ""]) assert.ok(!ok(o, "localhost:3000"), o);
  for (const h of ["evil.example:3000", "localhost.evil.example", "", null]) assert.ok(!ok(null, h), String(h));
});

test("tools/call with params that are not an object is an invalid-params error", async () => {
  for (const params of [[], "text", 5]) assert.equal(((await handleRpc(deps(), rpc("tools/call", params))).body as Answer).error?.code, -32602);
});

test("devScope with arguments that are not an object is an error", async () => {
  for (const a of [[], "text", 5]) assert.ok("error" in (await devScope(a, deps())));
  assert.deepEqual(await devScope(null, deps()), { scope: {}, args: {} });
});

test("include_not_enabled false shows no example block", async () => {
  const r = await call(deps(), "find_blocks", { include_not_enabled: false });
  assert.ok(!(JSON.parse(r.content[0].text) as { id: string }[]).some((b) => b.id === "X"));
});
