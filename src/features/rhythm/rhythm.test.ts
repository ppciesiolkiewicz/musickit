import { test } from "node:test";
import assert from "node:assert/strict";
import { PATTERNS, buildRound, isPatternId, patternById } from "./patterns";
import { createJudge, gradeFor } from "./judge";
import { createOnsetDetector } from "./onset";

test("a round: a bar of count-in, then the pattern from beat 1 of the next bar", () => {
  const r = buildRound(patternById("offbeats"), 120, 2, 10);
  assert.equal(r.beat, 0.5);
  assert.equal(r.clicks.length, 12);
  assert.deepEqual(r.clicks.slice(0, 5).map((c) => c.countIn), [true, true, true, true, false]);
  assert.deepEqual(r.clicks.filter((c) => c.accent).map((c) => c.time), [10, 12, 14]);
  assert.deepEqual(r.targets, [12.25, 12.75, 13.25, 13.75, 14.25, 14.75, 15.25, 15.75]);
  assert.equal(r.end, 16);
});

test("sixteenths: four even hits on every beat of the bar", () => {
  const p = patternById("sixteenths");
  assert.equal(p.id, "sixteenths");
  assert.equal(p.beats.length, 16);
  assert.deepEqual(p.beats.slice(0, 5), [0, 0.25, 0.5, 0.75, 1]);
  const r = buildRound(p, 60, 1, 0);
  assert.equal(r.targets.length, 16);
  assert.deepEqual(r.targets.slice(0, 3), [4, 4.25, 4.5]);
  assert.equal(r.targets[15], 7.75);
});

test("every pattern has its own id, sits inside one bar and runs forwards", () => {
  assert.equal(new Set(PATTERNS.map((p) => p.id)).size, PATTERNS.length);
  for (const p of PATTERNS) {
    assert.ok(p.beats.length > 0, p.id);
    p.beats.forEach((b, i) => assert.ok(b >= 0 && b < 4 && (i === 0 || b > p.beats[i - 1]), `${p.id}: ${b}`));
  }
  assert.ok(isPatternId("push"));
  assert.ok(!isPatternId("waltz"));
  assert.equal(patternById("waltz").id, "quarters");
});

test("grades by distance from the beat, early or late alike", () => {
  assert.equal(gradeFor(0.02), "perfect");
  assert.equal(gradeFor(-0.05), "good");
  assert.equal(gradeFor(0.1), "ok");
  assert.equal(gradeFor(-0.2), "miss");
});

test("a hit takes the nearest open note; a stray hit is extra and keeps the streak", () => {
  const j = createJudge([1, 1.5, 2]);
  assert.deepEqual(j.hit(1.48), { index: 1, grade: "perfect", offset: 1.48 - 1.5 });
  assert.equal(j.hit(1.25), null); // between notes, outside every window
  assert.equal(j.streak, 1);
  // a second hit near the same note goes to nothing: the note is taken
  assert.equal(j.hit(1.52), null);
  assert.equal(j.hit(2.06)?.grade, "good");
  assert.equal(j.streak, 2);
});

test("notes left unhit expire as misses, ending the streak", () => {
  const j = createJudge([1, 2, 3]);
  j.hit(1);
  assert.deepEqual(j.expire(2.05), []); // still inside 2's window
  assert.deepEqual(j.expire(2.2), [{ index: 1, grade: "miss", offset: null }]);
  assert.equal(j.streak, 0);
  j.hit(3.01);
  const s = j.summary();
  assert.equal(s.perfect, 2);
  assert.equal(s.miss, 1);
  assert.equal(s.score, 67);
  assert.equal(s.bestStreak, 1);
  assert.ok(Math.abs((s.meanOffset ?? 0) - 0.005) < 1e-9);
});

test("the summary counts notes never reached as misses", () => {
  const j = createJudge([1, 2]);
  j.hit(1);
  assert.equal(j.summary().miss, 1);
});

/** A fake strum: a ringing G with a burst of pick noise that dies away fast, over quiet noise, at the given times, fed in odd-sized blocks like a worklet's. */
function strums(sr: number, seconds: number, at: number[], noise = 0) {
  const x = new Float32Array(Math.round(sr * seconds));
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < x.length; i++) {
    const t = i / sr;
    let v = noise * rand();
    for (const s of at) if (t >= s) v += 0.4 * Math.exp(-(t - s) / 0.4) * Math.sin(2 * Math.PI * 196 * t) + 0.3 * Math.exp(-(t - s) / 0.03) * rand();
    x[i] = v;
  }
  return x;
}

test("hears each strum once, within a step of when it starts", () => {
  const sr = 44100;
  const at = [0.3, 0.8, 1.05, 1.6];
  const x = strums(sr, 2, at, 0.0005);
  const d = createOnsetDetector(sr);
  const found: number[] = [];
  for (let i = 0; i < x.length; i += 300) found.push(...d.push(x.subarray(i, i + 300), 5 + i / sr));
  assert.equal(found.length, at.length, `found ${found.map((f) => (f - 5).toFixed(3))}`);
  found.forEach((f, i) => assert.ok(Math.abs(f - 5 - at[i]) < 0.012, `${f - 5} vs ${at[i]}`));
});

test("steady noise and a ringing chord are not strums", () => {
  const sr = 44100;
  const x = strums(sr, 2, [], 0.01);
  const d = createOnsetDetector(sr);
  assert.deepEqual(d.push(x, 0), []);
});
