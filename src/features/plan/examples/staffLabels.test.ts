import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { staffLabelSystem, type LabelSystem } from "@/features/theory/labels";
import { catalogue } from "../model/catalogue";
import { parsePlanConfig } from "../model/config";
import { parseTool, toolsOf, type PlanTool } from "../model/tools";
import type { PlanConfig } from "../model/types";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "./index";

const entries = catalogue();
const weekOf = (exercise: unknown) => JSON.stringify({ title: "W", days: Array.from({ length: 7 }, (_, i) => ({ theme: `D${i + 1}`, exercises: [exercise] })) });

function parsed(text: string): PlanConfig {
  const r = parsePlanConfig(text, entries);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.config;
}

type Staff = Extract<PlanTool, { type: "staff" }>;

/** Every staff in the examples, as the app stores it, with where it came from. */
const staffs: { where: string; tool: Staff }[] = [
  ...EXERCISE_EXAMPLES.map((e) => ({ where: e.id, ex: parsed(weekOf(e.exercise)).days[0].exercises[0] })),
  ...PLAN_EXAMPLES.flatMap((p) => parsed(JSON.stringify(p.plan)).days.flatMap((d, di) => d.exercises.map((ex, xi) => ({ where: `${p.id} day ${di + 1} #${xi + 1}`, ex })))),
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
  it("every staff with a mic in the examples shows labels, even with the setting on note names", () => {
    const sung = staffs.filter((s) => s.tool.mic !== false);
    assert.ok(sung.length > 0, "the examples have mic staffs");
    for (const { where, tool } of sung) assert.notEqual(staffLabelSystem(tool.labels, true, "note"), "note", where);
  });
});
