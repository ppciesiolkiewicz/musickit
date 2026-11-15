import { test } from "node:test";
import assert from "node:assert/strict";
import { isDevModel, isOllamaModel, ollamaName } from "../model/models";
import { contextFor, readChatStream } from "./ollama";

test("contextFor leaves room for the prompt and a plan, and no more", () => {
  assert.equal(contextFor(1000), 12_288 + 4096);
  // the ~44k-token plan prompt: about 64k, not 128k
  const ctx = contextFor(177_000);
  assert.ok(ctx >= (177_000 / 4) * 1.1 + 12_288 && ctx <= 65_536, String(ctx));
  assert.equal(contextFor(10_000_000), 131_072);
});

test("ollama models are dev models by their prefix", () => {
  assert.ok(isOllamaModel("ollama:llama3.1:8b"));
  assert.ok(isDevModel("ollama:huihui_ai/qwen3.5-abliterated:9b"));
  assert.ok(!isOllamaModel("ollama:"));
  assert.ok(!isOllamaModel("llama3.1"));
  assert.equal(ollamaName("ollama:llama3.2:latest"), "llama3.2:latest");
});

test("readChatStream joins the streamed reply and reads the tokens from the last line", () => {
  const lines = [
    { message: { content: "Hel" }, done: false },
    { message: { content: "lo" }, done: false },
    { message: { content: "" }, done: true, prompt_eval_count: 40_000, eval_count: 900 },
  ].map((l) => JSON.stringify(l)).join("\n");
  assert.deepEqual(readChatStream(lines), { ok: true, text: "Hello", usage: { input: 40_000, output: 900, cacheRead: 0, cacheWrite: 0 } });
  assert.deepEqual(readChatStream(`${JSON.stringify({ message: { content: "x" } })}\n${JSON.stringify({ error: "model ran out of memory" })}`), { ok: false, error: "model ran out of memory" });
});
