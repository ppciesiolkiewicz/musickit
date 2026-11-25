import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBody, generateSoundEffect } from "./elevenlabs";
import { parseGenerate, serverKey } from "./guard";

test("parseGenerate validates and clamps", () => {
  assert.equal(typeof parseGenerate({ provider: "nope", prompt: "x" }), "string");
  assert.equal(typeof parseGenerate({ provider: "elevenlabs", prompt: "  " }), "string");
  assert.equal(typeof parseGenerate({ provider: "elevenlabs", prompt: "x".repeat(400) }), "string");
  const ok = parseGenerate({ provider: "elevenlabs", prompt: " warm pad ", seconds: 999 });
  assert.ok(typeof ok !== "string");
  if (typeof ok !== "string") {
    assert.equal(ok.prompt, "warm pad");
    assert.equal(ok.seconds, 22);
  }
});

test("the server key comes from the environment, trimmed", () => {
  assert.deepEqual(serverKey({ ELEVENLABS_API_KEY: " k " }, "ELEVENLABS_API_KEY"), { ok: true, key: "k" });
  assert.ok(!serverKey({ ELEVENLABS_API_KEY: " " }, "ELEVENLABS_API_KEY").ok);
  assert.ok(!serverKey({}, "ELEVENLABS_API_KEY").ok);
});

test("generateSoundEffect maps results and hides provider text", async () => {
  const seen: { url: string; key: string; body: unknown }[] = [];
  const good = (async (url: string, init: RequestInit) => {
    seen.push({ url, key: (init.headers as Record<string, string>)["xi-api-key"], body: JSON.parse(String(init.body)) });
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "audio/mpeg" } });
  }) as unknown as typeof fetch;
  const r = await generateSoundEffect({ apiKey: "k", prompt: "bell", seconds: 3, fetchImpl: good });
  assert.ok(r.ok && r.audio.byteLength === 3);
  assert.equal(seen[0].key, "k");
  assert.deepEqual(seen[0].body, buildBody("bell", 3));
  const bad = (async () => new Response("key k leaked", { status: 401 })) as unknown as typeof fetch;
  const e = await generateSoundEffect({ apiKey: "k", prompt: "bell", seconds: 3, fetchImpl: bad });
  assert.ok(!e.ok && e.status === 401 && !e.error.includes("leaked"));
  const down = (async () => { throw new Error("x"); }) as unknown as typeof fetch;
  const d = await generateSoundEffect({ apiKey: "k", prompt: "b", seconds: 1, fetchImpl: down });
  assert.ok(!d.ok && d.status === 502);
});
