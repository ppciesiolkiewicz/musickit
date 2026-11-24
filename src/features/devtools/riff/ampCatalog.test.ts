import assert from "node:assert/strict";
import { test } from "node:test";
import { gearOf, groupByGear, matchesSearch } from "./ampCatalog";

test("a community capture is listed under its gear, without the capturer or the training error", () => {
  assert.deepEqual(gearOf("Tim R Magnatone Super 59 Mkii Ch1 Norm"), { kind: "amp", gear: "Magnatone Super 59 Mk II", variant: "Ch1 Norm" });
  assert.deepEqual(gearOf("Phillipe P JVM-OD2-RD-NoDrive-Cab-ESR0,006"), { kind: "amp", gear: "Marshall JVM", variant: "OD2 RD NoDrive Cab" });
  assert.deepEqual(gearOf("Peter N HM-2_V5_L10_H8_D2_Feather-ESR-0.0025"), { kind: "pedal", gear: "Boss HM-2", variant: "V5 L10 H8 D2 Feather" });
});

test("an amp capture that names the pedal in front of it stays an amp", () => {
  assert.equal(gearOf("Tim R Magnatone Super 59 Mkii Pushed TS9").kind, "amp");
  assert.equal(gearOf("Mikhail K SovtekMIG50 + Klone").gear, "Sovtek MIG-50");
});

test("the amp library's slug names read as words", () => {
  assert.deepEqual(gearOf("marshall-jcm2000-clean"), { kind: "amp", gear: "Marshall JCM2000", variant: "Clean" });
  assert.deepEqual(gearOf("pedal-boss-hm2-swede"), { kind: "pedal", gear: "Boss HM-2", variant: "Swede" });
  assert.deepEqual(gearOf("engl-savage"), { kind: "amp", gear: "Engl Savage", variant: "Standard" });
});

test("a name no rule knows is other, under its own name", () => {
  assert.deepEqual(gearOf("Helga B PP Wendigo"), { kind: "other", gear: "PP Wendigo", variant: "Standard" });
});

test("groups: amps before pedals, gears A to Z, variants in number order, filtered by kind and search", () => {
  const models = ["Tim R TS9", "Tim R Jet City G10", "Tim R Jet City G4", "Tim R Fender TwinVerb Norm Bright"].map((name) => ({ name }));
  const all = groupByGear(models, "all", "");
  assert.deepEqual(all.map((g) => g.gear), ["Fender Twin Reverb", "Jet City", "Ibanez TS9"]);
  assert.deepEqual(all[1].items.map((i) => i.variant), ["G4", "G10"]);
  assert.deepEqual(groupByGear(models, "amp", "").map((g) => g.gear), ["Fender Twin Reverb", "Jet City"]);
  assert.deepEqual(groupByGear(models, "all", "twin").map((g) => g.gear), ["Fender Twin Reverb"]);
});

test("search matches every word, in the file name or the gear name", () => {
  assert.ok(matchesSearch("Tim R JCM2000 Crunch", "marshall crunch"));
  assert.ok(!matchesSearch("Tim R JCM2000 Crunch", "marshall clean"));
});
