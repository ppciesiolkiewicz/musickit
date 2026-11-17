import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fixRequest } from "./fixRequest";

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
