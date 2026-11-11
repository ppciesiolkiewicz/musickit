import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseChoiceDiag, choiceSchema, TOOLS, toolInterface } from "./tools";

const diag = () => ({ notes: [] as string[] });

describe("parseChoiceDiag", () => {
  it("options: 2 to 4 options holding the same parts, as step-choice read them", () => {
    const d = diag();
    const { choice } = parseChoiceDiag({ label: "stage", options: [{ bpm: 60 }, { bpm: 80 }, { bpm: 100 }] }, d);
    assert.deepEqual(choice, { label: "stage", options: [{ bpm: 60 }, { bpm: 80 }, { bpm: 100 }] });
    const two = parseChoiceDiag({ options: [{ key: "g", position: 1 }, { key: "c", position: 4 }] }, diag());
    assert.deepEqual(two.choice, { label: "variant", options: [{ key: 7, position: 1 }, { key: 0, position: 4 }] });
  });
  it("options: one option, or options of different parts, is dropped", () => {
    const d = diag();
    const { choice, dropped } = parseChoiceDiag({ options: [{ key: "g" }, { bpm: 80 }] }, d);
    assert.equal(choice, null);
    assert.match(dropped ?? "", /2 to 4 different options/);
    assert.ok(d.notes.some((n) => n.includes("every option needs the same parts (key, scale, bpm, position, level)")), d.notes.join("|"));
  });
  it("open: the parts themselves, any value; a scale is a slug the app knows", () => {
    assert.deepEqual(parseChoiceDiag({ key: "a", scale: "minor-pentatonic" }, diag()).choice, { open: { key: 9, scale: "minor-pentatonic" } });
    assert.deepEqual(parseChoiceDiag({ bpm: 72 }, diag()).choice, { open: { bpm: 72 } });
    const d = diag();
    const bad = parseChoiceDiag({ scale: "nope" }, d);
    assert.equal(bad.choice, null);
    assert.ok(d.notes.some((n) => n.includes('"nope"')), d.notes.join("|"));
  });
  it("open: a tempo out of range is clamped and noted; nothing readable is dropped", () => {
    const d = diag();
    assert.deepEqual(parseChoiceDiag({ bpm: 500 }, d).choice, { open: { bpm: 240 } });
    assert.ok(d.notes.some((n) => n.includes("bpm")), d.notes.join("|"));
    assert.match(parseChoiceDiag({}, diag()).dropped ?? "", /no part it could read/);
    assert.match(parseChoiceDiag("x", diag()).dropped ?? "", /isn.t an object/);
  });
  it("step-choice is no longer a tool, and the schema offers both shapes", () => {
    assert.equal(Object.hasOwn(TOOLS, "step-choice"), false);
    assert.ok(!toolInterface().some((l) => l.startsWith("- step-choice :")));
    const s = choiceSchema() as { oneOf: unknown[] };
    assert.equal(s.oneOf.length, 2);
  });
});
