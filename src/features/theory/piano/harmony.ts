/**
 * What a set of sounding notes is in a key: the notes spelled, the chord name with its Roman numeral,
 * or the interval when only two notes sound. Pure maths on top of tonal (tested).
 */
import { Chord, Interval, Note } from "@tonaljs/tonal";
import { spellAs, spellNote, type KeyContext, type Spelled } from "./key";

export interface ChordName {
  /** "D", "Am7", "C/E" */
  symbol: string;
  /** "I", "♭VII", "V7", "I/3"; null without a key (chromatic) */
  numeral: string | null;
  /** a second name that fits as well ("Am7/C" for C6) */
  alt: string | null;
}

export interface Sounding {
  /** low to high, one per key */
  notes: Spelled[];
  chord: ChordName | null;
  /** the interval when exactly two pitch classes sound ("P5") */
  dyad: string | null;
}

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
/** chord types worth naming; anything else tonal finds (Em#5 for C/E) only shows when nothing here fits */
const COMMON = new Set(["M", "m", "7", "maj7", "m7", "dim", "dim7", "m7b5", "aug", "sus4", "sus2", "7sus4", "6", "m6", "add9", "madd9", "9", "maj9", "m9", "mMaj7", "69", "11", "13"]);

const mod = (n: number, m: number) => ((n % m) + m) % m;
const tonalName = (n: Spelled) => n.letter + (n.alter > 0 ? "#".repeat(n.alter) : "b".repeat(-n.alter)) + n.octave;
const pretty = (s: string) => s.replace(/#/g, "♯").replace(/b(?=\d|5)/g, "♭");

/** "M3", "m3", "P4", "TT", "M10"; a descending interval gets a trailing ↓ */
export function intervalName(from: Spelled, to: Spelled): string {
  const iv = Interval.get(Interval.distance(tonalName(from), tonalName(to)));
  const num = Math.abs(iv.num ?? 1);
  const down = iv.dir === -1 ? "↓" : "";
  if (Math.abs(iv.semitones ?? 0) === 6 && (num === 4 || num === 5)) return `TT${down}`;
  return `${iv.q}${num}${down}`;
}

interface Candidate { root: number; type: string; bass: number; order: number }

function parse(symbol: string, order: number, bassPc: number): Candidate | null {
  const [main, slash] = symbol.split("/");
  const m = /^([A-G][#b]*)(.*)$/.exec(main);
  if (!m) return null;
  const root = Note.chroma(m[1]);
  const bass = slash ? Note.chroma(slash) : root;
  if (!slash && root !== bassPc) return null;
  return { root, type: m[2], bass, order };
}

function rank(cands: Candidate[], key: KeyContext): Candidate[] {
  const keyPcs = new Set(key.reference.map((n) => Note.chroma(n)));
  const inKey = (pc: number) => keyPcs.has(pc);
  const score = (c: Candidate) => [COMMON.has(c.type) ? 0 : 1, c.root === c.bass ? 0 : 1, inKey(c.root) ? 0 : 1, c.order];
  return [...cands].sort((a, b) => {
    const sa = score(a), sb = score(b);
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i];
    return 0;
  });
}

/** suffix shown after the root letter */
function shownType(type: string): string {
  if (type === "M") return "";
  if (type === "dim") return "°";
  if (type === "dim7") return "°7";
  if (type === "aug") return "+";
  return pretty(type);
}

/** the numeral's quality mark and extension: "", "7", "°", "ø7", "+", "maj7", "sus4" */
function numeralTail(type: string): string {
  if (type === "dim") return "°";
  if (type === "dim7") return "°7";
  if (type === "m7b5") return "ø7";
  if (type === "aug") return "+";
  if (type === "M" || type === "m") return "";
  if (type.startsWith("m") && !type.startsWith("maj")) return pretty(type.slice(1).replace(/^Maj/, "maj"));
  return pretty(type);
}

function nameChord(key: KeyContext, notes: Spelled[], c: Candidate): { name: ChordName; spelledByPc: Map<number, Spelled["letter"]> } {
  const root = spellNote(key, 60 + c.root);
  const intervals = Chord.get(`C${c.type}`).intervals;
  const rootLi = LETTERS.indexOf(root.letter);
  const letters = new Map<number, Spelled["letter"]>();
  const memberNo = new Map<number, number>();
  for (const iv of intervals) {
    const i = Interval.get(iv);
    const pc = mod(c.root + (i.semitones ?? 0), 12);
    letters.set(pc, LETTERS[mod(rootLi + (i.step ?? 0), 7)]);
    memberNo.set(pc, ((i.num ?? 1) - 1) % 7 + 1);
  }
  const bass = notes[0];
  const bassName = spellAs(key, bass.midi, letters.get(mod(bass.midi, 12)) ?? bass.letter).name;
  const symbol = root.name + shownType(c.type) + (c.bass !== c.root ? `/${bassName}` : "");
  let numeral: string | null = null;
  if (key.scale !== "chromatic") {
    const num = Number(root.degree.replace(/\D/g, ""));
    const acc = root.degree.replace(/\d/g, "");
    const quality = Chord.get(`C${c.type}`).quality;
    const lower = quality === "Minor" || quality === "Diminished";
    const roman = lower ? ROMAN[num - 1].toLowerCase() : ROMAN[num - 1];
    numeral = acc + roman + numeralTail(c.type) + (c.bass !== c.root ? `/${memberNo.get(c.bass) ?? ""}` : "");
  }
  return { name: { symbol, numeral, alt: null }, spelledByPc: letters };
}

export function describe(key: KeyContext, midis: number[]): Sounding {
  const unique = [...new Set(midis)].sort((a, b) => a - b);
  let notes = unique.map((m) => spellNote(key, m));
  const pcs = [...new Set(unique.map((m) => mod(m, 12)))];
  if (pcs.length === 2) return { notes, chord: null, dyad: intervalName(notes[0], notes[notes.length - 1]) };
  if (pcs.length < 3) return { notes, chord: null, dyad: null };
  const bassPc = mod(unique[0], 12);
  const found = Chord.detect(pcs.map((pc) => NAMES[pc]))
    .map((s, i) => parse(s, i, bassPc))
    .filter((c): c is Candidate => !!c && c.bass === bassPc && Chord.get(`C${c.type}`).intervals.length > 0);
  if (!found.length) return { notes, chord: null, dyad: null };
  const [best, next] = rank(found, key);
  const { name, spelledByPc } = nameChord(key, notes, best);
  notes = unique.map((m) => {
    const letter = spelledByPc.get(mod(m, 12));
    return letter ? spellAs(key, m, letter) : spellNote(key, m);
  });
  if (next && COMMON.has(next.type)) name.alt = nameChord(key, notes, next).name.symbol;
  return { notes, chord: name, dyad: null };
}
