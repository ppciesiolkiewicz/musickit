import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBody, generateSoundEffect } from "./elevenlabs";
import { chooseKey, createLimiter, parseGenerate, sameText } from "./guard";

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

test("the app key needs the access code, a person's own key does not", () => {
  const keyEnv = "ELEVENLABS_API_KEY";
  const env = { ELEVENLABS_API_KEY: "secret", SAMPLER_ACCESS_CODE: "open" };
  assert.deepEqual(chooseKey({ ownKey: "mine", env: {}, keyEnv }), { ok: true, key: "mine", own: true });
  assert.deepEqual(chooseKey({ env, keyEnv, accessCode: "open" }), { ok: true, key: "secret", own: false });
  const wrong = chooseKey({ env, keyEnv, accessCode: "nope" });
  assert.ok(!wrong.ok && wrong.status === 401);
  const none = chooseKey({ env, keyEnv });
  assert.ok(!none.ok && none.status === 401);
  // a key without a code configured is never used
  const noCode = chooseKey({ env: { ELEVENLABS_API_KEY: "secret" }, keyEnv, accessCode: "" });
  assert.ok(!noCode.ok && noCode.status === 403);
  assert.ok(!chooseKey({ env: {}, keyEnv }).ok);
});

test("sameText", () => {
  assert.ok(sameText("abc", "abc"));
  assert.ok(!sameText("abc", "abd"));
  assert.ok(!sameText("abc", "abcd"));
});

test("limiter allows `limit` calls per window per caller", () => {
  let t = 0;
  const l = createLimiter(2, 1000, () => t);
  assert.ok(l.take("a") && l.take("a"));
  assert.ok(!l.take("a"));
  assert.ok(l.take("b"));
  t = 1001;
  assert.ok(l.take("a"));
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
