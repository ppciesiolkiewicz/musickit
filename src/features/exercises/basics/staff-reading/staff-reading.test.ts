import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { place } from "@/features/theory/piano/staff";
import { HIGH_STEP, LETTERS, LOW_STEP, READING_SETS, TRAIL, answerLine, isAnswer, isHeard, isMiddleC, letterPc, nextNote, notesOf, placeOf, withAsked } from "./reading";

const letters = (clef: "treble" | "bass", set: (typeof READING_SETS)[number]) => notesOf(clef, set).map((n) => n.letter).join(" ");
const midis = (clef: "treble" | "bass", set: (typeof READING_SETS)[number]) => notesOf(clef, set).map((n) => n.midi);

describe("staff-reading: the notes of a set", () => {
  it("treble clef: lines E G B D F from E4, spaces F A C E", () => {
    assert.equal(letters("treble", "lines"), "E G B D F");
    assert.deepEqual(midis("treble", "lines"), [64, 67, 71, 74, 77]);
    assert.equal(letters("treble", "spaces"), "F A C E");
    assert.deepEqual(midis("treble", "spaces"), [65, 69, 72, 76]);
  });
  it("bass clef: lines G B D F A from G2, spaces A C E G", () => {
    assert.equal(letters("bass", "lines"), "G B D F A");
    assert.deepEqual(midis("bass", "lines"), [43, 47, 50, 53, 57]);
    assert.equal(letters("bass", "spaces"), "A C E G");
    assert.deepEqual(midis("bass", "spaces"), [45, 48, 52, 55]);
  });
  it("the staff is the lines and the spaces together, low to high", () => {
    assert.equal(letters("treble", "staff"), "E F G A B C D E F");
    assert.deepEqual(midis("treble", "staff"), [...midis("treble", "lines"), ...midis("treble", "spaces")].sort((a, b) => a - b));
  });
  it("ledger: four notes under the staff and four above it, middle C on the first ledger line", () => {
    assert.equal(letters("treble", "ledger"), "A B C D G A B C");
    assert.deepEqual(midis("treble", "ledger"), [57, 59, 60, 62, 79, 81, 83, 84]);
    assert.equal(letters("bass", "ledger"), "C D E F B C D E");
    const c = notesOf("treble", "ledger").find(isMiddleC)!;
    assert.equal(c.step, -2);
    assert.equal(notesOf("bass", "ledger").find(isMiddleC)!.step, 10);
  });
  it("all is every step from the lowest to the highest, each once, natural notes only", () => {
    for (const clef of ["treble", "bass"] as const) {
      const all = notesOf(clef, "all");
      assert.deepEqual(all.map((n) => n.step), Array.from({ length: HIGH_STEP - LOW_STEP + 1 }, (_, i) => LOW_STEP + i));
      assert.deepEqual(all.map((n) => n.midi).sort((a, b) => a - b), [...midis(clef, "staff"), ...midis(clef, "ledger")].sort((a, b) => a - b));
      for (const n of all) {
        assert.equal(n.spelled.alter, 0);
        assert.equal(letterPc(n.letter), n.midi % 12);
        // the step is the staff's own, and the staff draws no accidental for it
        const p = place(n.spelled, 0, clef);
        assert.equal(p.step, n.step);
        assert.equal(p.accidental, null);
        assert.equal(p.ledgers.length > 0, n.step <= -2 || n.step >= 10);
      }
    }
  });
});

describe("staff-reading: asking and answering", () => {
  const pool = notesOf("treble", "lines");
  it("the next note is from the pool and never the one just asked", () => {
    let prev = nextNote(pool, () => 0);
    assert.equal(prev.letter, "E");
    for (let i = 0; i < 200; i++) {
      const n = nextNote(pool, Math.random, prev);
      assert.ok(pool.includes(n));
      assert.notEqual(n.midi, prev.midi);
      prev = n;
    }
    assert.equal(nextNote(pool, () => 0.999999, pool[4]).letter, "D");
    assert.equal(nextNote(pool, () => 1, pool[0]).letter, "F");
    // a pool of one note asks it again
    assert.equal(nextNote([pool[2]], Math.random, pool[2]), pool[2]);
  });
  it("a letter is right when it is the note's; the mic is right in any octave", () => {
    const g = pool[1];
    assert.ok(isAnswer(g, "G"));
    for (const l of LETTERS) assert.equal(isAnswer(g, l), l === "G");
    assert.ok(isHeard(g, 7));
    assert.ok(isHeard(g, 7 + 24));
    assert.ok(!isHeard(g, 6));
    assert.ok(!isHeard(g, null));
  });
  it("says where a note sits, counted from the bottom", () => {
    assert.deepEqual([0, 2, 4, 6, 8].map(placeOf), ["on the bottom line", "on the second line", "on the middle line", "on the fourth line", "on the top line"]);
    assert.deepEqual([1, 3, 5, 7].map(placeOf), ["in the bottom space", "in the second space", "in the third space", "in the top space"]);
    assert.deepEqual([-1, -2, -3, -4].map(placeOf), ["just under the staff", "on the first ledger line under the staff", "just under the first ledger line under the staff", "on the second ledger line under the staff"]);
    assert.deepEqual([9, 10, 11, 12].map(placeOf), ["just above the staff", "on the first ledger line above the staff", "just above the first ledger line above the staff", "on the second ledger line above the staff"]);
  });
  it("every answer says the note and where it sits: right, wrong, heard or skipped", () => {
    const g = pool[1];
    assert.equal(answerLine(g, "G"), "Yes, G, on the second line.");
    assert.equal(answerLine(g, "heard"), "Yes, G, on the second line.");
    assert.equal(answerLine(g, "A"), "Not A. It was G, on the second line.");
    assert.equal(answerLine(g, null), "It was G, on the second line.");
    const c = notesOf("treble", "ledger").find(isMiddleC)!;
    assert.equal(answerLine(c, "C"), "Yes, middle C, on the first ledger line under the staff.");
    assert.equal(answerLine(c, "D"), "Not D. It was middle C, on the first ledger line under the staff.");
  });
  it("the staff holds the last answered notes and the asked one, never more than TRAIL", () => {
    let trail: typeof pool = [];
    for (let i = 0; i < 20; i++) {
      const asked = pool[i % pool.length];
      const shown = withAsked(trail, asked);
      assert.ok(shown.length <= TRAIL);
      assert.equal(shown[shown.length - 1], asked);
      trail = shown;
    }
    assert.equal(trail.length, TRAIL);
  });
});
