import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INPUT_PRESETS, INPUT_ROLES, presetFor } from "./inputPresets";
import { EFFECT_DEFS } from "./effects";

describe("input presets", () => {
  it("only use real effects and parameters inside their ranges", () => {
    for (const role of INPUT_ROLES) {
      assert.ok(INPUT_PRESETS[role.id].length > 0);
      for (const p of INPUT_PRESETS[role.id]) {
        assert.ok(p.effects.length <= 6, `${role.id}/${p.id} fits the effect limit`);
        for (const fx of p.effects) {
          const def = EFFECT_DEFS[fx.kind];
          assert.ok(def, `${p.id}: ${fx.kind} exists`);
          for (const [k, v] of Object.entries(fx.params ?? {})) {
            const pd = def.params.find((x) => x.key === k);
            assert.ok(pd, `${p.id}: ${fx.kind}.${k} exists`);
            assert.ok(v >= pd.min && v <= pd.max, `${p.id}: ${fx.kind}.${k}=${v} within ${pd.min}..${pd.max}`);
          }
        }
      }
    }
  });
  it("has unique ids per role", () => {
    for (const role of INPUT_ROLES) {
      const ids = INPUT_PRESETS[role.id].map((p) => p.id);
      assert.equal(new Set(ids).size, ids.length);
    }
    assert.equal(presetFor("guitar", "nope"), undefined);
  });
});
