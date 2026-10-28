import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findSection, findStage } from "./course";
import { LEGACY_STAGES, legacyNoteKey } from "./legacy";

describe("legacy stage slugs", () => {
  it("every old stage maps to a current one", () => {
    Object.values(LEGACY_STAGES).forEach((to) => assert.ok(findStage(to), to));
  });
  it("old note keys move to their new stage", () => {
    assert.equal(legacyNoteKey("0-2/em-and-am"), "2/em-and-am");
    assert.equal(legacyNoteKey("1/chords"), "5/chords");
    assert.ok(findSection("5", "chords"));
  });
});
