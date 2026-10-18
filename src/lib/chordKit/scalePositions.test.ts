import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext } from "@/features/theory/theory";
import { pentatonicOf, positionLine, positionMidi, positionsFor, rootStrings, scaleCells, scaleLineMidi } from "./scalePositions";

const frets = (p: { notes: { string: number; fret: number }[] }) => [0, 1, 2, 3, 4, 5].map((s) => p.notes.filter((n) => n.string === s).map((n) => n.fret));

describe("pentatonicOf: the five-note scale inside a mode", () => {
  it("major-3rd modes keep 1 2 3 5 6", () => {
    for (const m of [0, 3, 4]) assert.equal(pentatonicOf(makeKeyContext(0, 0, m).steps).name, "Major pentatonic");
  });
  it("minor-3rd modes keep 1 b3 4 5 b7", () => {
    for (const m of [1, 2, 5]) assert.equal(pentatonicOf(makeKeyContext(0, 0, m).steps).name, "Minor pentatonic");
  });
  it("Locrian gets the same cut, named by its formula", () => {
    const p = pentatonicOf(makeKeyContext(0, 0, 6).steps);
    assert.equal(p.name, "Pentatonic R ♭3 4 ♭5 ♭7");
    assert.deepEqual(p.degrees, [0, 2, 3, 4, 6]);
  });
});

describe("five positions, named by the strings the root is on", () => {
  const aMinor = makeKeyContext(9, 0, 5);
  const ROOTS = [[0, 2, 5], [2, 4], [1, 4], [1, 3], [0, 3, 5]]; // E D e · D B · A B · A G · E G e

  it("A minor pentatonic: the classic five boxes, climbing from the 5th fret", () => {
    const boxes = positionsFor(aMinor, "pentatonic");
    assert.deepEqual(boxes.map((b) => `${b.from}-${b.to}`), ["5-8", "7-10", "9-13", "12-15", "14-17"]);
    assert.deepEqual(frets(boxes[0]), [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]]);
    assert.deepEqual(boxes.map(rootStrings), ROOTS);
  });

  it("A minor scale position 1 is the 5th-position shape", () => {
    assert.deepEqual(frets(positionsFor(aMinor, "scale")[0]), [[5, 7, 8], [5, 7, 8], [5, 7], [4, 5, 7], [5, 6, 8], [5, 7, 8]]);
  });

  it("major and minor pentatonic keep the root pattern in every key, and stay at two notes per string away from the nut", () => {
    for (let pc = 0; pc < 12; pc++) for (const m of [0, 1, 2, 3, 4, 5]) {
      positionsFor(makeKeyContext(pc, 0, m), "pentatonic").forEach((p, i) => {
        assert.ok(ROOTS[i].every((s) => rootStrings(p).includes(s)), `${pc} ${m} position ${i + 1}`);
        if (p.from > 2) for (let s = 0; s < 6; s++) assert.equal(p.notes.filter((n) => n.string === s).length, 2);
      });
    }
  });

  it("E major box 1 is the open position: the notes that would fall below the nut move a string down, to the 4th fret", () => {
    const [p1, p2] = positionsFor(makeKeyContext(4, 0, 0), "pentatonic");
    assert.deepEqual(frets(p1), [[0, 2, 4], [2, 4], [2, 4], [1], [0, 2], [0, 2]]);
    assert.deepEqual(frets(p2), [[2, 4], [2, 4], [2, 4], [1, 4], [2, 5], [2, 4]]);
  });

  it("position 1 in E starts on the open strings in every mode, for the pentatonic and the full scale", () => {
    for (let f = 0; f < 3; f++) for (let m = 0; m < 7; m++) for (const kind of ["pentatonic", "scale"] as const) {
      const [p1] = positionsFor(makeKeyContext(4, f, m), kind);
      const tag = `E ${f} ${m} ${kind}`;
      assert.equal(p1.from, 0, `${tag} starts at fret ${p1.from}`);
      assert.ok(p1.notes.some((n) => n.string === 0 && n.fret === 0), `${tag} has no open low E`);
      assert.ok(p1.notes.some((n) => n.string === 5 && n.fret === 0), `${tag} has no open high e`);
      assert.ok(p1.to <= 5, `${tag} runs to fret ${p1.to}`);
    }
  });

  it("keys a fret above E keep position 1 low too: F major box 1 starts at the nut", () => {
    assert.equal(positionsFor(makeKeyContext(5, 0, 0), "pentatonic")[0].from, 0);
  });

  it("E minor box 1 is the open position", () => {
    assert.deepEqual(frets(positionsFor(makeKeyContext(4, 0, 5), "pentatonic")[0]), [[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]]);
  });

  it("C major pentatonic: the classic boxes, box 1 at the 7th fret with the root on E, D and e", () => {
    const boxes = positionsFor(makeKeyContext(0, 0, 0), "pentatonic");
    assert.deepEqual(boxes.map((b) => `${b.from}-${b.to}`), ["7-10", "9-13", "12-15", "14-17", "5-8"]);
  });

  it("every mode is laid out on the major or minor pentatonic boxes: G Phrygian dominant position 1 keeps B and C on the A string", () => {
    const [p1] = positionsFor(makeKeyContext(7, 1, 4), "scale");
    assert.deepEqual(frets(p1), [[3, 4], [2, 3, 5], [1, 3, 5], [1, 4, 5], [3, 4, 6], [3, 4]]);
    const [pent] = positionsFor(makeKeyContext(7, 1, 4), "pentatonic");
    assert.deepEqual(frets(pent), [[3, 4], [2, 5, 6], [5], [1, 4], [3, 4], [3, 4]], "E♭ on the A string next to D, not 4 frets below G on the D string");
  });

  it("in every key and mode: five different positions, frets 0-17, at most a 5-fret span, the root pattern, every note", () => {
    for (let pc = 0; pc < 12; pc++) for (let f = 0; f < 3; f++) for (let m = 0; m < 7; m++) {
      const ctx = makeKeyContext(pc, f, m);
      for (const kind of ["pentatonic", "scale"] as const) {
        const ps = positionsFor(ctx, kind);
        const tag = `${pc} ${f} ${m} ${kind}`;
        assert.equal(ps.length, 5, tag);
        const places = ps.map((p) => p.notes.map((n) => `${n.string}-${n.fret}`).join(" "));
        assert.equal(new Set(places).size, 5, `${tag} two positions are the same`);
        ps.forEach((p, i) => {
          assert.ok(p.from >= 0 && p.to <= 17, tag);
          assert.ok(p.to - p.from <= 5, `${tag} spans ${p.from}-${p.to}`);
          assert.ok(ROOTS[i].every((s) => rootStrings(p).includes(s)), `${tag} position ${i + 1} roots ${rootStrings(p)}`);
          assert.equal(new Set(positionLine(p).map((n) => n.degree)).size, kind === "scale" ? 7 : 5, `${tag} position ${i + 1} misses a note`);
          const line = positionLine(p);
          for (let k = 1; k < line.length; k++) assert.ok(line[k].midi > line[k - 1].midi, tag);
        });
      }
    }
  });

  it("a position plays up and back down", () => {
    const m = positionMidi(positionsFor(aMinor, "pentatonic")[0]);
    assert.equal(m.length, 23);
    assert.equal(m[0], 45);
    assert.equal(m[m.length - 1], 45);
  });
});

describe("notes sit close together: no jump of 4 frets (three empty frets) along a string when another string has the note nearby", () => {
  /** On each string, every pair of neighbouring notes that are 4 frets or more apart. */
  const stretches = (p: { notes: { string: number; fret: number }[] }) =>
    frets(p).flatMap((fr, s) => fr.slice(1).map((f, k) => ({ s, from: fr[k], to: f })).filter((x) => x.to - x.from >= 4));

  it("E Ionian ♯5 pentatonic position 2: C sits on the B string at the 1st fret, beside C♯, not at the 5th fret of the G string", () => {
    const p2 = positionsFor(makeKeyContext(4, 1, 2), "pentatonic")[1];
    assert.deepEqual(frets(p2)[3], [1]);
    assert.deepEqual(frets(p2)[4], [1, 2, 5]);
    assert.ok(p2.notes.some((n) => n.string === 4 && n.fret === 1 && n.name === "B♯"));
    assert.deepEqual(stretches(p2), []);
  });

  it("every full scale in every key and mode: neighbouring notes on a string are at most 3 frets apart", () => {
    for (let pc = 0; pc < 12; pc++) for (let f = 0; f < 3; f++) for (let m = 0; m < 7; m++) {
      positionsFor(makeKeyContext(pc, f, m), "scale").forEach((p) => assert.deepEqual(stretches(p), [], `${pc} ${f} ${m} position ${p.number}`));
    }
  });

  it("major and minor pentatonic boxes in every key (the six major modes but Locrian): at most 3 frets between neighbours", () => {
    for (let pc = 0; pc < 12; pc++) for (let m = 0; m < 6; m++) {
      positionsFor(makeKeyContext(pc, 0, m), "pentatonic").forEach((p) => assert.deepEqual(stretches(p), [], `${pc} ${m} position ${p.number}`));
    }
  });

  it("in every key and mode, a note left 4 frets from the rest of its string has no free spot beside the notes of another string", () => {
    for (let pc = 0; pc < 12; pc++) for (let f = 0; f < 3; f++) for (let m = 0; m < 7; m++) for (const kind of ["pentatonic", "scale"] as const) {
      const ctx = makeKeyContext(pc, f, m);
      const cells = scaleCells(ctx, 17);
      positionsFor(ctx, kind).forEach((p) => {
        for (const { s, from, to } of stretches(p)) {
          for (const fret of [from, to]) {
            const n = p.notes.find((x) => x.string === s && x.fret === fret)!;
            const others = p.notes.filter((x) => x.string === s && x !== n);
            if (others.some((x) => Math.abs(x.fret - fret) < 4)) continue; // close to another note on its string
            if (n.degree === 0) continue; // roots stay put: they name the position
            const better = cells.find((c) => c.midi === n.midi && c.string !== s && c.fret >= p.from && c.fret <= p.to
              && p.notes.some((x) => x.string === c.string && Math.abs(x.fret - c.fret) < 4)
              && !p.notes.some((x) => x.midi === c.midi && x.string === c.string));
            assert.equal(better, undefined, `${pc} ${f} ${m} ${kind} position ${p.number}: ${n.name} at string ${s} fret ${fret} could be at string ${better?.string} fret ${better?.fret}`);
          }
        }
      });
    }
  });
});

describe("scaleCells and scaleLineMidi", () => {
  it("lists every scale note with its degree and spelling", () => {
    const cells = scaleCells(makeKeyContext(7, 0, 0), 12);
    const f = cells.find((c) => c.string === 0 && c.fret === 2)!;
    assert.equal(f.name, "F♯");
    assert.equal(f.degree, 6);
  });
  it("plays the scale up an octave and back", () => {
    assert.deepEqual(scaleLineMidi(makeKeyContext(0, 0, 0)), [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60]);
  });
});

describe("three notes per string", () => {
  it("G major: seven patterns up the neck, the open one first, three notes on every string", () => {
    const ps = positionsFor(makeKeyContext(7, 0, 0), "3nps");
    assert.equal(ps.length, 7);
    assert.deepEqual(ps.map((p) => p.from), [...ps.map((p) => p.from)].sort((a, b) => a - b));
    // starts on the open E (the 6th of G): E F♯ G on the low E, then A B C, D E F♯, G A B, C D E, F♯ G A
    assert.deepEqual(frets(ps[0]), [[0, 2, 3], [0, 2, 3], [0, 2, 4], [0, 2, 4], [1, 3, 5], [2, 3, 5]]);
    assert.equal(ps[0].startDegree, 5);
  });
  it("every pattern in every key climbs the scale in order, three notes a string, inside the 17 frets", () => {
    for (let pc = 0; pc < 12; pc++) for (const [f, m] of [[0, 0], [0, 3], [0, 5], [1, 4], [2, 6]]) {
      const ctx = makeKeyContext(pc, f, m);
      for (const p of positionsFor(ctx, "3nps")) {
        assert.deepEqual(frets(p).map((x) => x.length), [3, 3, 3, 3, 3, 3]);
        const midis = p.notes.map((n) => n.midi);
        assert.deepEqual(midis, [...midis].sort((a, b) => a - b));
        assert.equal(new Set(p.notes.map((n) => n.degree)).size, 7);
        assert.ok(p.from >= 0 && p.to <= 17, `${pc} ${f} ${m} position ${p.number}: ${p.from}-${p.to}`);
      }
    }
  });
});
