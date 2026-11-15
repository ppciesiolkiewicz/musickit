import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { agentReply, checkPlanReply, fixRequest } from "./fixRequest";
import type { PlanConfig } from "./types";

describe("fixRequest", () => {
  it("lists every warning and asks for the whole plan again as one JSON block", () => {
    const m = fixRequest(["Day 1, exercise 2: backing-band had no key; used A.", "Day 3: 1 exercise; use 2 to 5."]);
    assert.match(m, /checked the plan/);
    assert.ok(m.includes("- Day 1, exercise 2: backing-band had no key; used A.\n- Day 3: 1 exercise; use 2 to 5."));
    assert.match(m, /whole corrected plan again as one JSON code block/);
    assert.match(m, /nothing else changed/);
  });
  it("is empty when there is nothing to fix", () => assert.equal(fixRequest([]), ""));
});

describe("agentReply", () => {
  const config = { title: "Pentatonic week", days: Array(7).fill({}) } as unknown as PlanConfig;
  it("says why a reply was refused", () => assert.match(agentReply({ ok: false, error: "No JSON found." }), /could not read.*No JSON found/));
  it("tells the AI to have the student build a clean plan", () =>
    assert.match(agentReply({ ok: true, config, warnings: [] }), /"Pentatonic week" \(7 days\).*Build my plan/));
  it("lists warnings and asks for the whole plan again", () => {
    const m = agentReply({ ok: true, config, warnings: ["Day 3: 1 exercise; use 2 to 5."] });
    assert.ok(m.includes("- Day 3: 1 exercise; use 2 to 5."));
    assert.match(m, /send the whole plan again with submit_practice_plan/);
  });
});

describe("checkPlanReply", () => {
  const config = { title: "Pentatonic week", days: Array(7).fill({}) } as unknown as PlanConfig;
  it("says nothing on the page changed, and why it can't be read", () =>
    assert.match(checkPlanReply({ ok: false, error: "No JSON found." }), /nothing on the page changed.*could not read.*No JSON found/));
  it("a clean plan: send it", () => assert.match(checkPlanReply({ ok: true, config, warnings: [] }), /Nothing to fix\. Send it with submit_practice_plan/));
  it("lists what would change and asks to check again", () => {
    const m = checkPlanReply({ ok: true, config, warnings: ["Day 3: 1 exercise; use 2 to 5."] });
    assert.ok(m.includes("- Day 3: 1 exercise; use 2 to 5."));
    assert.match(m, /check the whole plan again/);
  });
});
