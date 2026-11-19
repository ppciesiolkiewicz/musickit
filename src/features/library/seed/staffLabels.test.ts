import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { staffLabelSystem, type LabelSystem } from "@/features/theory/labels";
import { catalogue } from "@/features/plan/model/catalogue";
import { parsePlanConfig } from "@/features/plan/model/config";
import { parseTool, toolsOf, type PlanTool } from "@/features/plan/model/tools";
import type { PlanConfig } from "@/features/plan/model/types";
import { SEED_BLOCKS, SEED_PLANS, seedExercises, seedPlan } from "./index";

const entries = catalogue();
const weekOf = (exercise: unknown) => JSON.stringify({ title: "W", days: Array.from({ length: 7 }, (_, i) => ({ theme: `D${i + 1}`, exercises: [exercise] })) });

function parsed(text: string): PlanConfig {
  const r = parsePlanConfig(text, entries);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.config;
}

type Staff = Extract<PlanTool, { type: "staff" }>;

/** Every staff in the seed blocks and plans, as the app stores it, with where it came from. */
const staffs: { where: string; tool: Staff }[] = [
  ...SEED_BLOCKS.flatMap((e) => seedExercises(e).map((x) => ({ where: String(x.choiceId), ex: parsed(weekOf(x)).days[0].exercises[0] }))),
  ...SEED_PLANS.flatMap((p) => parsed(JSON.stringify(seedPlan(p))).days.flatMap((d, di) => d.exercises.map((ex, xi) => ({ where: `${p.id} day ${di + 1} #${xi + 1}`, ex })))),
].flatMap(({ where, ex }) => toolsOf(ex.cells).flatMap((t) => (t.type === "staff" ? [{ where, tool: t }] : [])));

describe("staff labels", () => {
  it("a staff with labels shows them, whatever the setting", () => {
    for (const user of ["note", "interval", "degree", "solfege"] as LabelSystem[]) {
      assert.equal(staffLabelSystem("solfege", true, user), "solfege");
      assert.equal(staffLabelSystem("degree", false, user), "degree");
    }
  });
  it("a mic staff without labels never shows bare note names", () => {
    assert.equal(staffLabelSystem(undefined, true, "note"), "degree");
    assert.equal(staffLabelSystem(undefined, true, "solfege"), "solfege");
    assert.equal(staffLabelSystem(undefined, false, "note"), "note");
  });
  it("the staff tool keeps degree and solfège labels and drops anything else", () => {
    const base = { type: "staff", scale: "major-ionian", key: "c" };
    assert.equal((parseTool({ ...base, labels: "solfege" }) as Staff).labels, "solfege");
    assert.equal((parseTool({ ...base, labels: "degree" }) as Staff).labels, "degree");
    assert.equal((parseTool({ ...base, labels: "note" }) as Staff).labels, undefined);
  });
  it("every staff with a mic in the seed shows labels, even with the setting on note names", () => {
    const sung = staffs.filter((s) => s.tool.mic !== false);
    assert.ok(sung.length > 0, "the seed has mic staffs");
    for (const { where, tool } of sung) assert.notEqual(staffLabelSystem(tool.labels, true, "note"), "note", where);
  });
});
