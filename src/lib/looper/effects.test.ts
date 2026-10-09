import { test } from "node:test";
import assert from "node:assert/strict";
import { clampParams, defaultParams, distortionCurve, EFFECT_DEFS, EFFECT_KINDS, sanitiseEffects } from "./effects";

test("every effect has a name and defaults inside their own ranges", () => {
  assert.ok(EFFECT_KINDS.length >= 9);
  for (const k of EFFECT_KINDS) {
    const d = EFFECT_DEFS[k];
    assert.equal(d.kind, k);
    assert.ok(d.name.length > 0 && d.params.length > 0);
    for (const p of d.params) assert.ok(p.def >= p.min && p.def <= p.max, `${k}.${p.key}`);
    assert.deepEqual(clampParams(k, defaultParams(k)), defaultParams(k));
  }
});

test("a saved list keeps every known kind and drops unknown ones", () => {
  const list = sanitiseEffects([{ id: "a", kind: "filter", params: { cutoff: 99999 } }, { kind: "eq" }, { kind: "nope" }]);
  assert.deepEqual(list.map((e) => e.kind), ["filter", "eq"]);
  assert.equal(list[0].params.cutoff, EFFECT_DEFS.filter.params.find((p) => p.key === "cutoff")!.max);
});

test("the distortion curve is bounded, odd and rising", () => {
  const c = distortionCurve(0.8, 257);
  assert.ok(Math.abs(c[0] + 1) < 1e-9 && Math.abs(c[256] - 1) < 1e-9);
  assert.ok(Math.abs(c[128]) < 1e-9);
  for (let i = 1; i < c.length; i++) assert.ok(c[i] >= c[i - 1]);
});
