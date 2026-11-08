import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Tool renderer", () => {
  it("does not import the plan store, so the studio stage can use it", () => {
    const src = readFileSync(join(process.cwd(), "src/features/plan/ui/Tool.tsx"), "utf8");
    assert.ok(!/store\//.test(src));
    assert.ok(!/usePlan/.test(src));
  });
});
