import { test } from "node:test";
import assert from "node:assert/strict";
import { prettyJson } from "./prettyJson";

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
