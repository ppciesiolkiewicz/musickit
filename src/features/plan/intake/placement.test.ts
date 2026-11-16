import { test } from "node:test";
import assert from "node:assert/strict";
import { conceptById } from "../model/concepts";
import { placeTrack, placement } from "./placement";

test("a rung starts each track of the topic at its first step of that level", () => {
  const got = placement({ "guitar-caged": 2 });
  assert.deepEqual(got.map((p) => p.concept), ["double-stops", "triads", "caged", "arpeggios"]);
  // double stops: new, two beginner steps, then intermediate at the 4th
  assert.deepEqual(got[0], { concept: "double-stops", state: "on", step: 3 });
  // triads: three beginner steps, then intermediate from the 4th
  assert.deepEqual(got[1], { concept: "triads", state: "on", step: 3 });
  assert.deepEqual(got[2], { concept: "caged", state: "on", step: 0 });
});

test("a track all under the player's level is done; one starting above it is ahead, at its first step", () => {
  const open = conceptById("open-chords")!; // new to intermediate
  assert.deepEqual(placeTrack(open, 3), { concept: "open-chords", state: "done", step: null });
  const caged = conceptById("caged")!; // starts at intermediate
  assert.deepEqual(placeTrack(caged, 0), { concept: "caged", state: "ahead", step: 0 });
  assert.deepEqual(placeTrack(caged, 1), { concept: "caged", state: "ahead", step: 0 });
});

test("unanswered and unknown topics place nothing", () => {
  assert.deepEqual(placement({}), []);
  assert.deepEqual(placement({ nope: 2 } as never), []);
  assert.equal(placement({ "voice-pitch": 0, "theory-modes": 1 }).length, 3);
});
