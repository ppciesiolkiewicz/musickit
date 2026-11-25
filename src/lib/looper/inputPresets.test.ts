import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INPUT_PRESETS, INPUT_ROLES, presetFor } from "./inputPresets";
import { GUITAR_AMPS, INPUT_STACKS, stackSpecs } from "@/features/instruments/model";
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
  it("offers every guitar and vocal stack to a recorder, each amp by its model", () => {
    const ids = INPUT_STACKS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(INPUT_STACKS.filter((s) => s.amp).length, GUITAR_AMPS.length);
    assert.ok(!ids.includes("guitar:nam"), "the empty amp is left out");
    assert.ok(ids.includes("vocal:room") && ids.includes("guitar:sparkle"));
    for (const s of INPUT_STACKS) assert.equal(s.effects.some((e) => e.kind === "nam"), Boolean(s.amp), s.id);
  });
  it("turns a stack into a chain's effects: before the fader first, the amp's model set", () => {
    const lead = INPUT_STACKS.find((s) => s.id === "guitar:lead")!;
    const specs = stackSpecs(lead);
    assert.deepEqual(specs.map((e) => e.kind), ["denoise", "distortion", "eq", "tapeDelay", "reverb"]);
    assert.ok(specs.every((e) => e.id.startsWith("guitar:lead/") && !e.bypass));
    assert.equal(specs.at(-1)!.params.decay, 2.8);
    assert.equal(specs.at(-1)!.params.tone, 6000, "a parameter left out takes its default");
    const amp = INPUT_STACKS.find((s) => s.amp)!;
    assert.equal(stackSpecs(amp).find((e) => e.kind === "nam")!.params.model, 0);
    assert.equal(stackSpecs(amp, 7).find((e) => e.kind === "nam")!.params.model, 7);
  });
});
