import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTION_CATALOG, buildPrompt, parseScript } from "./script";
import { isAction } from "./actions";

test("every catalogue example is a valid action", () => {
  assert.ok(ACTION_CATALOG.length > 25);
  for (const c of ACTION_CATALOG) {
    assert.equal(c.example.type, c.type);
    assert.ok(isAction(c.example), c.type);
  }
});

test("a plan from an AI: fences, prose around it, bad lines reported", () => {
  const reply = 'Here you go:\n```json\n[{"type":"sequencer.add","id":"d"},{"type":"sequencer.set","id":"d","patch":{"preset":"rock"}},{"type":"fx.add","target":{"group":"g1"},"fx":{"kind":"filter","id":"lp"}},{"type":"nope"},{"type":"fx.add","target":{"group":"g1"},"fx":{"kind":"flanger"}}]\n```';
  const r = parseScript(reply);
  assert.equal(r.macro?.steps.length, 3);
  assert.equal(r.errors.length, 2);
  assert.match(r.errors[0], /#4/);
});

test("steps with times are kept in order; objects with actions work too", () => {
  const r = parseScript(JSON.stringify({ steps: [{ t: 500, action: { type: "master.volume", value: 0.5 } }, { t: 0, action: { type: "transport.set", on: true } }] }));
  assert.deepEqual(r.macro?.steps.map((s) => s.t), [0, 500]);
  assert.equal(r.macro?.duration, 500);
  assert.equal(parseScript(JSON.stringify({ actions: [{ type: "loop.add" }] })).macro?.steps.length, 1);
});

test("garbage gives no macro and a message", () => {
  const r = parseScript("hello");
  assert.equal(r.macro, null);
  assert.equal(r.errors.length, 1);
});

test("the prompt carries the catalogue, the effects and the request", () => {
  const p = buildPrompt(null, "play drums and low-pass the guitar");
  assert.match(p, /input\.add/);
  assert.match(p, /filter: mode/);
  assert.match(p, /presets rock/);
  assert.match(p, /low-pass the guitar/);
});
