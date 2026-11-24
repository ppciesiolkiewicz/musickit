import { test } from "node:test";
import assert from "node:assert/strict";
import { sectionStarts } from "./sections";

const e = (area: string | undefined, minutes = 5) => ({ area, minutes });

test("sectionStarts: a day in one area has no headings", () => {
  assert.deepEqual(sectionStarts([e("guitar"), e("guitar")]), [null, null]);
  assert.deepEqual(sectionStarts([]), []);
});

test("sectionStarts: each run of one area opens a section, named as the questionnaire names the area, with its minutes", () => {
  assert.deepEqual(sectionStarts([e("voice", 5), e("voice", 10), e("guitar", 5), e("theory", 7)]), [
    { label: "Voice", minutes: 15 }, null, { label: "Guitar", minutes: 5 }, { label: "Theory & ear", minutes: 7 },
  ]);
});

test("sectionStarts: an exercise with no area, or an unknown one, means no headings", () => {
  assert.deepEqual(sectionStarts([e("voice"), e(undefined), e("guitar")]), [null, null, null]);
});
