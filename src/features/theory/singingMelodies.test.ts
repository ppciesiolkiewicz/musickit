import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BOOK, DIFFICULTIES, RUNS, STAGES, dueNote, effortOf, parseTune, placeRun, placeTune, restBeats, runPasses } from "./singingMelodies";
import { VOICES, buildLadder, tuneLadderFor, withNotesUnder, type Range } from "./singing";

describe("the melody book", () => {
  it("reads the tune notation", () => {
    assert.deepEqual(parseTune("1 2e 3e 5,q. 1'e | 1w"), [
      { step: 0, beats: 1, at: 0 },
      { step: 1, beats: 0.5, at: 1 },
      { step: 2, beats: 0.5, at: 1.5 },
      { step: -3, beats: 1.5, at: 2 },
      { step: 7, beats: 0.5, at: 3.5 },
      { step: 0, beats: 4, at: 4 },
    ]);
    assert.throws(() => parseTune("1 8"));
  });

  for (const t of BOOK)
    it(`#${t.n} (${t.stage.title}): whole bars, ends on a whole-note Do reached by step`, () => {
      for (const n of t.notes) assert.equal(Math.floor(n.at / 4), Math.floor((n.at + n.beats - 0.001) / 4), `note at ${n.at} crosses a barline`);
      const end = t.notes.at(-1)!;
      assert.equal(end.beats, 4);
      assert.equal(end.at % 4, 0);
      assert.ok(end.step === 0 || end.step === 7);
      assert.equal(Math.abs(t.notes.at(-2)!.step - end.step) <= 2, true);
      assert.ok([2, 4].includes((end.at + 4) / 4));
    });

  it("each stage stays with the notes it has reached", () => {
    const reach: Record<string, number[]> = { "do-re": [0, 1], mi: [0, 1, 2], fa: [0, 1, 2, 3], sol: [0, 1, 2, 3, 4], skips: [0, 1, 2, 3, 4], thirds: [0, 1, 2, 3, 4] };
    for (const s of STAGES.filter((s) => reach[s.id]))
      for (const n of BOOK.filter((t) => t.stage === s).flatMap((t) => t.notes)) assert.ok(reach[s.id].includes(n.step), `${s.id} uses step ${n.step}`);
  });

  it("past Do and Re, every tune uses at least three notes", () => {
    for (const t of BOOK.filter((t) => t.stage !== STAGES[0])) assert.ok(new Set(t.notes.map((n) => n.step)).size >= 3, `#${t.n}`);
  });

  it("steps first, the widest leaps last", () => {
    const widest = STAGES.map((s) => Math.max(...BOOK.filter((t) => t.stage === s).flatMap((t) => t.notes.slice(1).map((n, i) => Math.abs(n.step - t.notes[i].step)))));
    assert.equal(widest[0], 1);
    assert.ok(widest.slice(0, 4).every((w) => w <= 2));
    assert.ok(widest.at(-2)! > Math.max(...widest.slice(0, -2)) - 1);
    assert.ok(widest.at(-1)! >= 7);
  });

  it("both lengths come up in every stage past Do and Re", () => {
    for (const s of STAGES.slice(1)) {
      const ls = new Set(BOOK.filter((t) => t.stage === s).map((t) => t.length));
      assert.deepEqual([...ls].sort(), ["long", "short"], s.id);
    }
  });

  it("places a tune in the voice: one dipping under Do starts from the Do an octave up", () => {
    const l = buildLadder("major-ionian", 0, VOICES.tenor)!; // C3 to C5
    const up = placeTune(parseTune("5, 1 2 7, | 1w"), l, VOICES.tenor);
    assert.deepEqual(up.map((n) => n.spelled.name), ["G", "C", "D", "B", "C"]);
    assert.equal(up[1].midi, 60);
    const low = placeTune(parseTune("1 2 3 2 | 1w"), l, VOICES.tenor);
    assert.equal(low[0].midi, 48);
    for (const t of BOOK) for (const n of placeTune(t.notes, l, VOICES.tenor)) assert.ok(n.midi >= 48 && n.midi <= 72);
  });

  it("sits a tune low in the voice, using the notes under the lowest Do", () => {
    const g = withNotesUnder(buildLadder("major-ionian", 7, VOICES.tenor)!, VOICES.tenor); // C3 up, Do on G3
    assert.equal(g.notes[0].spelled.name, "C");
    assert.equal(g.notes[0].midi, 48);
    assert.equal(placeTune(parseTune("1 2 3 2 | 1w"), g, VOICES.tenor)[0].midi, 55);
    const under = placeTune(parseTune("5, 1 2 7, | 1w"), g, VOICES.tenor);
    assert.deepEqual(under.map((n) => n.midi), [50, 55, 57, 54, 55]);
    for (const t of BOOK) for (const n of placeTune(t.notes, g, VOICES.tenor)) assert.ok(n.midi >= 48 && n.midi <= 72);
  });
});

describe("difficulty", () => {
  const e = (t: string) => effortOf(parseTune(t));

  it("starting on Do is easier than starting off it", () => {
    assert.ok(e("1 2 1 2 | 1w") < e("2 1 2 2 | 1w"));
    assert.ok(e("1 2 3 2 | 1w") < e("3 2 3 2 | 1w"));
  });

  it("a leap through the home chord is easier than the same leap outside it", () => {
    assert.ok(e("1 3 5 3 | 1w") < e("2 4 6 4 | 2 1h. | 1w"));
    assert.ok(e("1 5 3 2 | 1w") < e("2 6 3 2 | 1w"));
    assert.ok(e("1 3 5 1' | 1'w") < e("1 3 5 7 | 1'w"));
  });

  it("two leaps the same way that don't make a chord are awkward", () => {
    assert.ok(e("2 4 6 5 | 3 2 1h | 1w") > e("2 4 3 5 | 3 2 1h | 1w"));
  });

  it("eighths, dotted notes and length add to it", () => {
    assert.ok(e("1 2 3 2 | 1w") < e("1 2q. 3e 2 | 1w"));
    assert.ok(e("1 2 3 2 | 1w") < e("1 2 3 2 | 1 2 3 2 | 1 2 3 2 | 1w"));
  });

  it("every band has tunes, and the first and last stages sit at opposite ends", () => {
    DIFFICULTIES.forEach((_, i) => assert.ok(BOOK.filter((t) => t.difficulty === i).length >= 5, DIFFICULTIES[i].title));
    for (const t of BOOK.filter((t) => t.stage === STAGES[0])) assert.ok(t.difficulty <= 1, `#${t.n}`);
    assert.ok(BOOK.filter((t) => t.stage === STAGES.at(-1)).some((t) => t.difficulty === DIFFICULTIES.length - 1));
  });

  it("the runs: whole bars, numbered on after the melodies, each ending on a whole-note Do reached by step, all quick notes", () => {
    assert.equal(RUNS[0].n, BOOK.length + 1);
    for (const t of RUNS) {
      for (const n of t.notes) assert.equal(Math.floor(n.at / 4), Math.floor((n.at + n.beats - 0.001) / 4), `#${t.n} crosses a barline`);
      const end = t.notes.at(-1)!;
      assert.ok(end.beats === 4 && end.at % 4 === 0 && (end.step === 0 || end.step === 7), `#${t.n}`);
      assert.ok(Math.abs(t.notes.at(-2)!.step - end.step) <= 2, `#${t.n}`);
      assert.ok(t.notes.some((n) => n.beats < 1), `#${t.n}`);
    }
  });

  it("places a run through the keys, a semitone up each pass, spelled in each key", () => {
    const ladderIn = (pc: number, r: { low: number; high: number }) => buildLadder("major-ionian", pc, r)!;
    const tune = parseTune("1 2 3 2 | 1w");
    const run = placeRun(tune, 0, 3, ladderIn, VOICES.tenor);
    assert.equal(run.length, 15);
    assert.deepEqual(run.filter((_, i) => i % 5 === 0).map((n) => n.midi - run[0].midi), [0, 1, 2]);
    assert.deepEqual(run.slice(5, 10).map((n) => n.spelled.name), ["D♭", "E♭", "F", "E♭", "D♭"]);
    assert.deepEqual(run.slice(10).map((n) => n.at), [16, 17, 18, 19, 20]);
  });
});

describe("a run's passes", () => {
  const ladderIn = (pc: number, r: Range) => tuneLadderFor(buildLadder("major-ionian", pc, r)!, pc, r);

  it("places a run as it always has, every pass ending on a whole-note Do", () => {
    const run = placeRun(RUNS[0].notes, 0, RUNS[0].keys!, ladderIn, VOICES.soprano);
    assert.deepEqual(run.map((n) => [n.midi, n.at, n.beats]), [[60,0,0.5],[62,0.5,0.5],[64,1,0.5],[65,1.5,0.5],[67,2,0.5],[65,2.5,0.5],[64,3,0.5],[62,3.5,0.5],[60,4,4],[61,8,0.5],[63,8.5,0.5],[65,9,0.5],[66,9.5,0.5],[68,10,0.5],[66,10.5,0.5],[65,11,0.5],[63,11.5,0.5],[61,12,4],[62,16,0.5],[64,16.5,0.5],[66,17,0.5],[67,17.5,0.5],[69,18,0.5],[67,18.5,0.5],[66,19,0.5],[64,19.5,0.5],[62,20,4],[63,24,0.5],[65,24.5,0.5],[67,25,0.5],[68,25.5,0.5],[70,26,0.5],[68,26.5,0.5],[67,27,0.5],[65,27.5,0.5],[63,28,4],[64,32,0.5],[66,32.5,0.5],[68,33,0.5],[69,33.5,0.5],[71,34,0.5],[69,34.5,0.5],[68,35,0.5],[66,35.5,0.5],[64,36,4]]);
  });

  it("keeps each pass's ladder beside its notes", () => {
    const passes = runPasses(RUNS[0].notes, 0, 3, ladderIn, VOICES.soprano);
    assert.equal(passes.length, 3);
    assert.deepEqual(passes.map((p) => p.notes[0].at), [0, 8, 16]);
    assert.deepEqual(passes.map((p) => p.ladder.notes.find((n) => n.midi % 12 === p.notes[0].midi % 12)!.spelled.name), ["C", "D♭", "D"]);
  });
});

describe("rests and the note due", () => {
  // a run pass cut for its key change: the quarter-note Do on beat 5, then the next pass on beat 8
  const notes = [...parseTune("1e 2e 3e 4e 5e 4e 3e 2e | 1"), ...parseTune("1e 2e 3e 4e 5e 4e 3e 2e | 1w").map((n) => ({ ...n, at: n.at + 8 }))];

  it("finds the whole beats no note covers", () => {
    assert.deepEqual(restBeats(notes, 16), [5, 6, 7]);
    assert.deepEqual(restBeats(parseTune("1 2 3 2 | 1w"), 8), []);
  });

  it("has nothing due in a rest", () => {
    assert.equal(dueNote(notes, 4.5), 8);
    assert.equal(dueNote(notes, 5.5), -1);
    assert.equal(dueNote(notes, 8), 9);
    assert.equal(dueNote(notes, -0.5), -1);
  });
});
