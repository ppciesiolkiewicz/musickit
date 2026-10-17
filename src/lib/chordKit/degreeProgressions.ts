import { placedChordName, shapesForChord, type ChordShapeChoice } from "./chordShapes";
import { shapeMidi, shapeSemitones } from "./shapeTools";
import { MAJOR, type KeyContext } from "@/features/theory/theory";
import { modeChords } from "@/features/theory/scales";

const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

/**
 * The scale degrees (0-based) that give the mode its own sound: where it differs from plain major (when its 3rd is major)
 * or plain minor (when its 3rd is minor). Major itself leans on its 7th, the leading tone; minor on its ♭6, against Dorian.
 */
export function colourDegrees(ctx: KeyContext): number[] {
  const ref = ctx.steps[2] === 4 ? MAJOR : AEOLIAN;
  const diff = ctx.steps.map((s, i) => (s !== ref[i] ? i : -1)).filter((i) => i >= 0);
  if (diff.length) return diff;
  return ref === MAJOR ? [6] : ctx.steps.map((s, i) => (s !== DORIAN[i] ? i : -1)).filter((i) => i >= 0);
}

/** Scale-degree label of a mode degree against the major scale: "♭2", "♯4", "6". */
export function degreeName(ctx: KeyContext, i: number): string {
  const d = ctx.steps[i] - MAJOR[i];
  return (d < 0 ? "♭".repeat(-d) : "♯".repeat(Math.max(0, d))) + (i + 1);
}

const triadDegrees = (d: number) => [d, (d + 2) % 7, (d + 4) % 7];
const holdsColour = (d: number, colour: number[]) => d !== 0 && triadDegrees(d).some((x) => colour.includes(x));

/** Root motion between two chords of the mode, in semitones up from a to b (0..11). */
const rootUp = (ctx: KeyContext, a: number, b: number) => (ctx.steps[b] - ctx.steps[a] + 12) % 12;

/** How well a four-chord loop shows off the mode: colour chords, smooth moves, a strong way home. */
function loopScore(ctx: KeyContext, degs: number[], colour: number[], degree: number): number {
  let s = 0;
  degs.forEach((d, i) => {
    const next = degs[(i + 1) % 4];
    if (holdsColour(d, colour)) s += 2;
    const tri = ctx.chords[d].tri;
    if ((tri === "dim" || tri === "aug" || tri === "other") && d !== degree) s -= 3;
    const shared = triadDegrees(d).filter((x) => triadDegrees(next).includes(x)).length;
    const up = rootUp(ctx, d, next);
    if (up === 5) s += 1.2; // root falls a fifth
    else if (up === 7) s += 0.6;
    else if (up === 1 || up === 11 || up === 2 || up === 10) s += 0.8; // step: the modal cadence
    s += shared === 1 ? 0.4 : shared === 2 ? 0.2 : 0;
  });
  // the chord that leads home carries the colour, so the mode is heard at the cadence
  if (holdsColour(degs[3], colour)) s += 1.5;
  return s;
}

/** Every loop that starts at home and holds `degree`, four different chords. */
function candidateLoops(degree: number): number[][] {
  const out: number[][] = [];
  for (let a = 1; a < 7; a++)
    for (let b = 1; b < 7; b++)
      for (let c = 1; c < 7; c++) {
        const l = [0, a, b, c];
        if (new Set(l).size === 4 && l.includes(degree)) out.push(l);
      }
  return out;
}

/** The best loop for each degree. Two degrees may share a loop when it is the best one for both. */
function loopsFor(ctx: KeyContext): number[][] {
  const colour = colourDegrees(ctx);
  return [0, 1, 2, 3, 4, 5, 6].map(
    (d) =>
      candidateLoops(d)
        .map((l) => ({ l, s: loopScore(ctx, l, colour, d) }))
        .sort((x, y) => y.s - x.s || x.l.join().localeCompare(y.l.join()))[0].l,
  );
}

/* ---------------------------------------------------------------- voicings */

/** How a placed shape sits on the neck: its notes and the middle of the frets it uses. */
interface Voicing {
  choice: ChordShapeChoice;
  midi: number[];
  centre: number;
  cost: number;
}

function voicing(ctx: KeyContext, degree: number, choice: ChordShapeChoice, colourPcs: Set<number>): Voicing {
  const { shape, fret, rootPc } = choice;
  const notes = modeChords(ctx)[degree].notes;
  const [third, fifth, seventh] = [notes[1].semis, notes[2].semis, notes[3].semis];
  const tones = new Set(shapeSemitones(shape).filter((v): v is number => v !== null));
  const abs = shape.f.map((v) => (v === null ? null : fret + v));
  const fretted = abs.filter((v): v is number => v !== null && v > 0);
  const centre = fretted.length ? fretted.reduce((a, b) => a + b, 0) / fretted.length : 0;
  let cost = shape.diff === "easy" ? 0 : shape.diff === "medium" ? 0.8 : 2.5;
  if (shape.at !== undefined) cost -= 0.6;
  // extensions that sit well: 9, 13, ♯11 on a major chord, 11 on a minor one; ♭9, ♯9, ♭13 and the 4th over a major 3rd rub
  const smooth = third === 4 ? [2, 6, 9] : [2, 5, 9];
  if ([...tones].some((t) => t !== 0 && t !== third && t !== fifth && t !== seventh && !smooth.includes(t))) cost += 2.5;
  if (fifth !== 7 && !tones.has(fifth)) cost += 2; // a ♭5 or ♯5 is what makes the chord diminished or augmented
  if (!tones.has(seventh) && ![...tones].some((t) => t !== 0 && t !== third && t !== fifth)) cost += 0.4; // bare triad: little colour
  if ([...tones].some((t) => t !== 0 && colourPcs.has((rootPc + t) % 12))) cost -= 0.8; // sounds the mode's colour note
  const added = [...tones].filter((t) => t !== 0 && t !== third && t !== fifth && t !== seventh);
  if (added.some((t) => t === 5 || t === 6)) cost += 1; // 11ths blur the chord
  if (degree === 0 && added.some((t) => t !== 2)) cost += 1.5; // home should sound settled: at most a 9th
  if (shapeSemitones(shape).find((v) => v !== null) !== 0) cost += 1.2; // root not in the bass
  cost += Math.max(0, centre - 7) * 0.25; // lower on the neck is easier to reach from open chords
  return { choice, midi: shapeMidi(shape, fret), centre, cost };
}

/** Cost of moving from one voicing to the next: notes that change, how far they move, and how far the hand jumps. */
function moveCost(a: Voicing, b: Voicing): number {
  const changed = b.midi.filter((n) => !a.midi.includes(n)).length;
  const travel = b.midi.reduce((sum, n) => sum + Math.min(...a.midi.map((m) => Math.abs(m - n))), 0) / b.midi.length;
  return changed * 0.5 + travel * 0.35 + Math.abs(a.centre - b.centre) * 0.4;
}

/** One voicing per chord of the loop, chosen together so the hand barely moves and notes ring on between chords. */
function voiceLoop(ctx: KeyContext, degs: number[]): (ChordShapeChoice | null)[] {
  const colourPcs = new Set(colourDegrees(ctx).map((i) => (ctx.tonic.pc + ctx.steps[i]) % 12));
  const opts = degs.map((d) => shapesForChord(ctx, d).slice(0, 40).map((c) => voicing(ctx, d, c, colourPcs)));
  if (opts.some((o) => !o.length)) return degs.map((_, i) => opts[i][0]?.choice ?? null);
  const move = opts.map((o, i) => o.map((a) => opts[(i + 1) % 4].map((b) => moveCost(a, b))));
  let best = Infinity;
  let pick = [0, 0, 0, 0];
  opts[0].forEach((v0, i0) =>
    opts[1].forEach((v1, i1) => {
      const head = v0.cost + v1.cost + move[0][i0][i1];
      if (head >= best) return;
      opts[2].forEach((v2, i2) => {
        const mid = head + v2.cost + move[1][i1][i2];
        if (mid >= best) return;
        opts[3].forEach((v3, i3) => {
          const total = mid + v3.cost + move[2][i2][i3] + move[3][i3][i0];
          if (total < best) {
            best = total;
            pick = [i0, i1, i2, i3];
          }
        });
      });
    }),
  );
  return pick.map((p, i) => opts[i][p].choice);
}

/* ---------------------------------------------------------------- the loop for a degree */

export interface DegreeProgressionChord {
  degree: number;
  roman: string;
  /** the chord the chosen shape plays, e.g. Cmaj9 or Bm7♭5 */
  name: string;
  /** true when this chord holds the mode's colour note */
  colour: boolean;
  /** guitar shape for this chord, voiced to move smoothly from the chord before; null when the library has none */
  pick: ChordShapeChoice | null;
}

export interface DegreeProgression {
  note: string;
  chords: DegreeProgressionChord[];
}

function homeMove(ctx: KeyContext, from: number): string {
  const up = rootUp(ctx, from, 0);
  const r = ctx.chords[from].roman;
  if (up === 5) return `${r} falls a fifth into home.`;
  if (up === 7) return `${r} rises a fifth into home.`;
  if (up === 1) return `${r} rises a half step into home.`;
  if (up === 11) return `${r} slides down a half step into home.`;
  if (up === 2) return `${r} steps up a whole tone into home.`;
  if (up === 10) return `${r} steps down a whole tone into home.`;
  return `${r} shares two notes with home, so the return is soft.`;
}

/** The four-chord loop built for the chord on `degree` of the mode, voiced on guitar so the chords flow into each other. */
export function progressionForDegree(ctx: KeyContext, degree: number): DegreeProgression {
  const degs = loopsFor(ctx)[((degree % 7) + 7) % 7];
  const colour = colourDegrees(ctx);
  const picks = voiceLoop(ctx, degs);
  const chords = degs.map((d, i) => ({
    degree: d,
    roman: ctx.chords[d].roman,
    name: picks[i] ? placedChordName(ctx, d, picks[i]!.shape) : ctx.chords[d].seventhName,
    colour: holdsColour(d, colour),
    pick: picks[i],
  }));
  const colourText = colour.map((i) => `${degreeName(ctx, i)} (${ctx.names[i]})`).join(" and ");
  const holders = chords.filter((c) => c.colour).map((c) => c.roman);
  const note =
    `The ${colourText} ${colour.length > 1 ? "are" : "is"} what makes ${ctx.modeName} sound like ${ctx.modeName}` +
    (holders.length ? `; ${holders.join(" and ")} ${holders.length > 1 ? "carry" : "carries"} it. ` : ". ") +
    homeMove(ctx, degs[3]) +
    " Shapes are picked so notes ring on from chord to chord.";
  return { note, chords };
}
