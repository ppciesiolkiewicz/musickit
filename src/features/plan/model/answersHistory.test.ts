import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanAnswersHistory, recordAnswers } from "./answersHistory";
import { DEFAULT_ANSWERS } from "../intake/answers";
import { EMPTY_STATE } from "./types";

test("cleanAnswersHistory keeps good entries and drops broken ones and bad rungs", () => {
  assert.deepEqual(cleanAnswersHistory("junk"), []);
  assert.deepEqual(cleanAnswersHistory([{ at: "2026-11-01", topics: { "guitar-caged": 2, nope: 1, "voice-pitch": 7 } }, { at: "", topics: {} }, { topics: {} }]),
    [{ at: "2026-11-01", topics: { "guitar-caged": 2 } }]);
});
test("cleanAnswersHistory keeps the first entry and the newest 99", () => {
  const many = Array.from({ length: 150 }, (_, i) => ({ at: `2026-01-01T00:00:00.${String(i).padStart(3, "0")}Z`, topics: {} }));
  const out = cleanAnswersHistory(many);
  assert.equal(out.length, 100);
  assert.equal(out[0].at, many[0].at);
  assert.equal(out[1].at, many[51].at);
  assert.equal(out[99].at, many[149].at);
});
test("recordAnswers appends the finished answers with their time", () => {
  const s = recordAnswers({ ...EMPTY_STATE, answersHistory: [{ at: "2026-11-01", topics: {} }] }, { ...DEFAULT_ANSWERS, topics: { "voice-pitch": 2 } }, "2026-11-15T18:00:00.000Z");
  assert.deepEqual(s.answersHistory.at(-1), { at: "2026-11-15T18:00:00.000Z", topics: { "voice-pitch": 2 } });
  assert.equal(s.answersHistory.length, 2);
});
