import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COMPONENT_DOCS, docOf } from "../docs";

const NAMES = ["scale-neck", "chord-shapes", "staff", "click-drone", "backing-band", "note-finder", "interval-ears"];

describe("basics docs", () => {
  it("lists every basic", () => {
    for (const n of NAMES) assert.equal(COMPONENT_DOCS.find((d) => d.name === n)?.kind, "basic", n);
  });
  it("documents others as optional dimmed|hidden", () => {
    for (const n of ["scale-neck", "staff"]) {
      const p = docOf(n)!.props.find((x) => x.name === "others");
      assert.equal(p?.required, false);
      assert.equal(p?.type, '"dimmed" | "hidden"');
    }
  });
  it("backing-band requires parts", () => {
    assert.equal(docOf("backing-band")!.props.find((x) => x.name === "parts")?.required, true);
  });
});
