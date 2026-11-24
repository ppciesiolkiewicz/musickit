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

const w = (area: string, minutes = 2) => ({ area, minutes, kind: "warm-up" });

test("sectionStarts: a warm-up is a part of its own, before its area's", () => {
  assert.deepEqual(sectionStarts([w("voice"), w("voice", 1), e("voice", 10), e("voice", 7)]), [
    { label: "Warm-up", minutes: 3 }, null, { label: "Voice", minutes: 17 }, null,
  ]);
});

test("sectionStarts: two warm-ups in a day are named by their area", () => {
  assert.deepEqual(sectionStarts([w("voice"), e("voice", 13), w("guitar"), e("guitar", 13), e("theory", 5)]).map((x) => x?.label ?? null), [
    "Voice warm-up", "Voice", "Guitar warm-up", "Guitar", "Theory & ear",
  ]);
});

import { dayPages, pageOf } from "./sections";

test("dayPages: each part is a page", () => {
  const pages = dayPages([w("voice"), e("voice", 10), e("voice", 10), e("guitar", 10)]);
  assert.deepEqual(pages, [
    { label: "Warm-up", start: 0, count: 1, minutes: 2 },
    { label: "Voice", start: 1, count: 2, minutes: 20 },
    { label: "Guitar", start: 3, count: 1, minutes: 10 },
  ]);
  assert.equal(pageOf(pages, 2), 1);
});

test("dayPages: a long part is cut into even pages; a short day of one area is one page", () => {
  assert.deepEqual(dayPages([w("voice"), ...Array.from({ length: 6 }, () => e("voice"))]).map((p) => [p.label, p.count]), [
    ["Warm-up", 1], ["Voice 1 of 2", 3], ["Voice 2 of 2", 3],
  ]);
  assert.deepEqual(dayPages([e("guitar"), e("guitar")]).map((p) => p.label), ["Part 1"]);
  assert.deepEqual(dayPages(Array.from({ length: 5 }, () => e("guitar"))).map((p) => [p.label, p.count]), [["Part 1", 3], ["Part 2", 2]]);
  assert.deepEqual(dayPages([]), []);
});
