import { test } from "node:test";
import assert from "node:assert/strict";
import { videoTools } from "./coverage";
import { LATER_PLANS, NO_VIDEO, STAGES, VIDEO_PLANS, blocksUsing, minutesLeft, recordPlan } from "./recordPlan";

test("every tool is in the first videos, the later ones or the ones with no video, and only one of them", () => {
  const tools = videoTools();
  const sets = [VIDEO_PLANS, LATER_PLANS, NO_VIDEO];
  for (const t of tools) assert.equal(sets.filter((s) => Object.hasOwn(s, t)).length, 1, t);
  for (const t of sets.flatMap((s) => Object.keys(s))) assert.equal(tools.includes(t), true, `${t} is not a tool`);
});

test("the stages hold every scripted video once, and nothing else", () => {
  const ordered = STAGES.flatMap((s) => s.tools);
  assert.deepEqual([...ordered].sort(), Object.keys(VIDEO_PLANS).sort());
  assert.equal(new Set(ordered).size, ordered.length);
  assert.equal(ordered.length, 20);
});

test("every script has a title, a length and parts with something to show and to say, the last one inviting", () => {
  for (const [t, p] of Object.entries(VIDEO_PLANS)) {
    assert.ok(p.title.trim(), t);
    assert.ok(p.minutes >= 2 && p.minutes <= 10, t);
    assert.ok(p.script.length >= 4 && p.script.length <= 7, t);
    for (const b of p.script) {
      assert.match(b.show, /\.$/, `${t}: ${b.show}`);
      assert.match(b.say, /[.?_]$/, `${t}: ${b.say}`);
      assert.doesNotMatch(b.say, /!/, `${t}: ${b.say}`);
    }
    assert.match(p.script.at(-1)!.say, /^Try things with it\./, t);
  }
});

test("every later video has a title and notes", () => {
  for (const [t, p] of Object.entries(LATER_PLANS)) {
    assert.ok(p.title.trim(), t);
    assert.ok(p.notes.length >= 3, t);
  }
});

test("the plan numbers the first videos in stage order and lists the later ones most used first", () => {
  const tools = videoTools();
  const use = { "key-chords": { "": ["a"] }, "song-chart": { none: ["a", "b"] }, "strum-along": { "": ["a"] } };
  const plan = recordPlan(tools, [{ id: "v", tool: "strum-along", steps: null }], use);
  const first = plan.stages.flatMap((s) => s.rows);
  assert.deepEqual(first.map((r) => r.n), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual(first.slice(0, 2).map((r) => r.tool), ["chord-shapes", "strum-along"]);
  assert.deepEqual([first[1].covered, first[1].of, first[1].blocks], [1, 1, 1]);
  assert.deepEqual(plan.later.slice(0, 2).map((r) => r.tool), ["song-chart", "key-chords"]);
  assert.deepEqual(plan.none.map((r) => r.tool).sort(), ["backing-band", "backing-track", "staff"]);
  assert.equal(minutesLeft(first), first.reduce((m, r) => m + r.plan.minutes, 0) - VIDEO_PLANS["strum-along"].minutes);
});

test("a block that uses a tool at two levels counts once", () => {
  assert.equal(blocksUsing("picking-drill", { "picking-drill": { "picking-drill:new": ["a", "b"], none: ["a"] } }), 2);
  assert.equal(blocksUsing("triads", {}), 0);
});
