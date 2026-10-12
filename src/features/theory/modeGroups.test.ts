import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MODE_GROUPS } from "./modeGroups";

describe("mode group teaching", () => {
  it("every group explains where it comes from, its sound, what to listen for and an exercise", () => {
    MODE_GROUPS.forEach((g) => {
      const t = g.teach;
      assert.ok(t, g.id);
      (["from", "sound", "listen", "practise"] as const).forEach((k) => assert.ok(t[k].length > 30, `${g.id}.${k}`));
    });
  });
});
