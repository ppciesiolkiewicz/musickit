import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nameMatches } from "./choices";

describe("finding a model by name", () => {
  it("ignores case, spaces and punctuation, and needs every word", () => {
    assert.ok(nameMatches("jcm800", "nam/Jcm800.nam"));
    assert.ok(nameMatches("twin reverb clean", "nam/fender-twin-reverb-clean.nam"));
    assert.ok(nameMatches("dualrec classic", "nam/Mesa 90s Dual Rectifier RI - Red Modern FULL RIG/90sDualRec-FullRig-Red-Modn-Classic.nam"));
    assert.ok(nameMatches("5150 stealth red", "nam/5150 Stealth 100w Mesa OS Full Rig - Blue, Red and Green/5150 Stealth 100w Red Mesa OS - jp_is_out_of_tune.nam"));
    assert.ok(nameMatches("fndr bfsr", "nam/FNDR BFSR VB Edge WRM2 CAB FREE.nam"));
    assert.ok(!nameMatches("jcm2000 crunch", "nam/marshall-jcm2000-clean.nam"));
    assert.ok(!nameMatches("", "anything"));
  });
});
