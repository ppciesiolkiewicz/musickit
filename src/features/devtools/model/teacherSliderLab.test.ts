import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "@/features/plan/model/schedule";
import { labSliders, receive, sampleStudents } from "./teacherSliderLab";

const samples = sampleStudents();

test("three samples: brand new, a few weeks in, many ratings", () => {
  assert.deepEqual(samples.map((s) => s.id), ["new", "weeks", "many"]);
  const n = samples.map((s) => s.entries.length);
  assert.equal(n[0], 0);
  assert.ok(n[1] > 0 && n[2] > n[1], `ratings ${n}`);
});

test("now is the day after the newest rating, so the page and its tests do not move with the clock", () => {
  for (const s of samples.filter((x) => x.entries.length)) {
    const newest = s.entries.map((e) => e.at.slice(0, 10)).sort().at(-1)!;
    assert.equal(s.asOf, addDays(newest, 1));
  }
  assert.equal(sampleStudents()[2].asOf, samples[2].asOf);
});

test("a slider opens at the score today, with the start-of-plan tick a week back", () => {
  for (const s of samples) {
    const rows = labSliders(s);
    assert.ok(rows.length > 0);
    for (const r of rows) {
      assert.ok(r.now >= 0 && r.now <= 3);
      assert.ok(r.atStart !== null && r.atStart <= r.now + 1e-9, `${r.topic} ${r.atStart} > ${r.now}`);
    }
  }
});

const rowOf = (s: (typeof samples)[number], topic: string, value: number) => receive(s, { [topic]: value }).find((r) => r.topic === topic)!;

test("moving a topic to 2.4 gives rung 2 and a score of at least 2.4, on every sample", () => {
  for (const s of samples) {
    const r = rowOf(s, labSliders(s)[0].topic, 2.4);
    assert.equal(r.moved, true);
    assert.equal(r.rungAfter, 2, s.id);
    assert.ok(r.scoreAfter !== null && r.scoreAfter >= 2.4, `${s.id} ${r.scoreAfter}`);
  }
});

test("moving a topic below its level lowers the rung", () => {
  for (const s of samples) {
    const lowered = labSliders(s).map((t) => rowOf(s, t.topic, 0)).find((r) => r.rungBefore > 0);
    assert.ok(lowered, `${s.id} has a topic above new`);
    assert.ok(lowered.rungAfter < lowered.rungBefore, s.id);
  }
});

test("a topic that was not moved stays as it was, and nothing moved changes nothing", () => {
  for (const s of samples) {
    const [a, ...rest] = labSliders(s);
    for (const r of receive(s, { [a.topic]: 3 }).filter((x) => x.topic !== a.topic)) {
      assert.equal(r.moved, false);
      assert.equal(r.rungAfter, r.rungBefore);
      assert.equal(r.scoreAfter, r.scoreBefore);
    }
    assert.ok(rest.length > 0);
    assert.ok(receive(s, {}).every((r) => !r.moved && r.rungAfter === r.rungBefore && r.scoreAfter === r.scoreBefore));
  }
});
