import { test } from "node:test";
import assert from "node:assert/strict";
import { jsonTokens, prettyJson, prettyJsonSegments } from "./prettyJson";

test("a json fence's body is indented", () => {
  const out = prettyJson('### Example\n```json\n{"a":1,"b":[{}]}\n```\nafter');
  assert.equal(out, '### Example\n```json\n{\n  "a": 1,\n  "b": [\n    {}\n  ]\n}\n```\nafter');
});

test("a whole-line object outside a fence is indented", () => {
  assert.equal(prettyJson('Shape:\n{"x":true}\nend'), 'Shape:\n{\n  "x": true\n}\nend');
});

test("text and broken JSON stay as they were", () => {
  const text = 'plain {not json}\n[link](/x)\n```json\n{"a":\n```\n{"a":';
  assert.equal(prettyJson(text), text);
});

test("prettying twice changes nothing more", () => {
  const once = prettyJson('```json\n{"a":{"b":{}}}\n```\n{"c":[1]}');
  assert.equal(prettyJson(once), once);
});

test("segments mark the JSON runs and join back to the pretty text", () => {
  const text = 'intro\n```json\n{"a":1}\n```\n{"b":2}\nend';
  const segs = prettyJsonSegments(text);
  assert.equal(segs.map((s) => s.text).join(""), prettyJson(text));
  assert.deepEqual(segs.filter((s) => s.json).map((s) => s.text), ['{\n  "a": 1\n}', '{\n  "b": 2\n}']);
});

test("tokens tell keys from strings and join back to the input", () => {
  const json = JSON.stringify({ k: "v \" x", n: -1.5e3, t: true, z: null, a: [] }, null, 2);
  const tokens = jsonTokens(json);
  assert.equal(tokens.map((t) => t.text).join(""), json);
  assert.deepEqual(tokens.filter((t) => t.kind === "key").map((t) => t.text), ['"k"', '"n"', '"t"', '"z"', '"a"']);
  assert.deepEqual(tokens.filter((t) => t.kind === "string").map((t) => t.text), ['"v \\" x"']);
  assert.deepEqual(tokens.filter((t) => t.kind === "number" || t.kind === "literal").map((t) => t.text), ["-1500", "true", "null"]);
});
