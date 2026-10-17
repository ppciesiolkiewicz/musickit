import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_LOOP_EFFECTS, cleanConfig } from "./loops";

test("a saved loop without effects or monitor gets none and stays quiet", () => {
  const c = cleanConfig({ id: "a", deviceId: "", channel: "1", bars: 2, volume: 0.5 });
  assert.deepEqual(c.effects, []);
  assert.equal(c.monitor, false);
});

test("loop effects are checked: unknown kinds go, parameters are clamped, all sit before the recorder, at most six", () => {
  const raw = [
    { id: "r", kind: "reverb", post: true, params: { decay: 99 } },
    { id: "x", kind: "nope", params: {} },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `n${i}`, kind: "nam", params: {} })),
  ];
  const c = cleanConfig({ effects: raw as never, monitor: true });
  assert.equal(c.effects.length, MAX_LOOP_EFFECTS);
  assert.equal(c.effects[0].kind, "reverb");
  assert.equal(c.effects[0].params.decay, 6);
  assert.ok(c.effects.every((e) => !e.post));
  assert.equal(c.monitor, true);
});
