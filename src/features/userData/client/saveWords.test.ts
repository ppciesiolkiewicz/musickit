import { test } from "node:test";
import assert from "node:assert/strict";
import { staleWords } from "./saveWords";

test("a stale save: the last change wasn't saved and why; the teacher only for a teacher's student", () => {
  assert.deepEqual(staleWords(false), {
    title: "Your last change wasn't saved.",
    body: "Your data was changed in another tab or on another device, so this page is reloading with the newer version.",
  });
  assert.deepEqual(staleWords(true), {
    title: "Your last change wasn't saved.",
    body: "Your data was changed in another tab, on another device or by your teacher, so this page is reloading with the newer version.",
  });
  assert.doesNotMatch(staleWords(false).body, /teacher/);
  assert.doesNotMatch(staleWords(false).title, /^Not saved:/);
});
