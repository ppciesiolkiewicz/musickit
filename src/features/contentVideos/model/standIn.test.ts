import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGES, VIDEO_PLANS } from "./scripts";
import { stepsOfTool } from "./slot";
import { cueAt, plainSay, scriptCues, standInFile, standInSeed } from "./standIn";

test("a scripted tool's seed is a row for every level, with its captions", () => {
  const seed = standInSeed("picking-drill", "id-1")!;
  assert.equal(seed.madeFor, "tool:picking-drill");
  assert.deepEqual(seed.steps, stepsOfTool("picking-drill"));
  assert.equal(seed.title, VIDEO_PLANS["picking-drill"].title);
  assert.ok(seed.cues.length > 0 && seed.seconds >= seed.cues.at(-1)!.end);
  assert.equal(standInSeed("staff", "x"), null);
  assert.equal(standInSeed("__proto__", "x"), null);
});

test("every staged tool has a seed, and a file name with no colon", () => {
  for (const tool of STAGES.flatMap((s) => s.tools)) assert.ok(standInSeed(tool, "x"));
  assert.equal(standInFile("guitar-play-along:riff"), "guitar-play-along--riff.json");
});

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
