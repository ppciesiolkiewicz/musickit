import { test } from "node:test";
import assert from "node:assert/strict";
import { AREAS } from "./concepts";
import type { PlanAnswers } from "../intake/answers";
import { startOutcome } from "./outcome";

test("startOutcome: every area in AREAS order, six topics each, unanswered is null", () => {
  const out = startOutcome({});
  assert.deepEqual(out.map((a) => a.area), AREAS.map((a) => a.id));
  assert.ok(out.every((a) => a.topics.length === 6));
  assert.ok(out.every((a) => a.topics.every((t) => t.score === null)));
});

test("startOutcome: a rung is the topic's score, 0 is kept as 0", () => {
  const out = startOutcome({ "guitar-caged": 2, "voice-pitch": 0 });
  const t = (id: string) => out.flatMap((a) => a.topics).find((x) => x.topic === id)!;
  assert.equal(t("guitar-caged").score, 2);
  assert.equal(t("guitar-caged").label, "CAGED");
  assert.equal(t("voice-pitch").score, 0);
  assert.equal(t("guitar-scales").score, null);
});

test("startOutcome: an unknown topic id in the answers is ignored", () => {
  const out = startOutcome({ nope: 3 } as PlanAnswers["topics"]);
  assert.ok(out.flatMap((a) => a.topics).every((t) => t.score === null));
});
