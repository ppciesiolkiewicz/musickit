import { test } from "node:test";
import assert from "node:assert/strict";
import { isVideoId } from "@/features/videos/server/rules";
import { STAGES, VIDEO_PLANS } from "./scripts";
import { cueAt, isStandIn, plainSay, scriptCues, standInFor, standInId, standInPlan } from "./standIn";

test("a scripted tool has a stand-in, another tool none", () => {
  assert.equal(standInFor("chord-shapes"), "script:chord-shapes");
  assert.equal(standInFor("staff"), null);
  assert.equal(standInFor("__proto__"), null);
});

test("every staged tool has a stand-in that reads its plan back", () => {
  for (const tool of STAGES.flatMap((s) => s.tools)) {
    const id = standInFor(tool)!;
    assert.ok(isStandIn(id));
    assert.equal(standInPlan(id), VIDEO_PLANS[tool]);
  }
  assert.equal(standInPlan("script:nope"), null);
  assert.equal(standInPlan("chord-shapes"), null);
});

test("a stand-in id is never a video id", () => assert.equal(isVideoId(standInId("chord-shapes")), false));

test("brackets come off", () => assert.equal(plainSay("Play [the chord] slowly. "), "Play the chord slowly."));

test("each said line is a cue, timed in order, with its part's show", () => {
  const { cues, seconds } = scriptCues([
    { show: "A", say: "One two three four five six seven eight nine ten.\nShort." },
    { show: "B", say: "Last line here." },
  ]);
  assert.deepEqual(cues.map((c) => [c.show, c.say, c.start, c.end]), [
    ["A", "One two three four five six seven eight nine ten.", 0, 4],
    ["A", "Short.", 4, 7],
    ["B", "Last line here.", 8, 11],
  ]);
  assert.equal(seconds, 11);
  assert.equal(cueAt(cues, 7.5)?.say, "Short.");
  assert.equal(cueAt(cues, 9)?.say, "Last line here.");
  assert.equal(cueAt(cues, -1)?.say, cues[0].say);
  assert.equal(cueAt([], 0), null);
});

test("every planned video fits a stand-in of a few minutes", () => {
  for (const plan of Object.values(VIDEO_PLANS)) {
    const { seconds, cues } = scriptCues(plan.script);
    assert.ok(cues.length > 0 && seconds > 30 && seconds < 600, plan.title);
  }
});
