import { INTERVALS } from "@/lib/chordKit/intervals";

/**
 * Ear training as pure functions. Interval levels follow the usual ear-training order: the most open sounds first
 * (5th, octave), then 3rds, then the rest. Each level includes the ones before it.
 */
export const EAR_LEVELS: { n: number; label: string; semis: number[] }[] = [
  { n: 1, label: "P5, octave", semis: [7, 12] },
  { n: 2, label: "+ M3, m3", semis: [4, 3] },
  { n: 3, label: "+ P4, M2", semis: [5, 2] },
  { n: 4, label: "+ m2, M6, m6", semis: [1, 9, 8] },
  { n: 5, label: "+ m7, M7, tritone: all twelve", semis: [10, 11, 6] },
];

/** The top level. A level over it (an older link or plan asked for 6, "all twelve") is the top one: it has every interval. */
export const TOP_EAR_LEVEL = EAR_LEVELS.length;

/** The intervals of a level and every level under it, in order. */
export const levelSemis = (level: number): number[] =>
  [...new Set(EAR_LEVELS.filter((l) => l.n <= level).flatMap((l) => l.semis))].sort((a, b) => a - b);

/**
 * The chord kinds the chord quiz can ask, as semitones from the root. The first five (`DEFAULT_QUALITIES`) are what it
 * asks when nothing is chosen; the rest are asked only when a set names them (`qualities`). A 13 is voiced 1 3 ♭7 9 13.
 */
export const CHORD_QUALITIES: { id: string; label: string; semis: number[] }[] = [
  { id: "maj", label: "Major", semis: [0, 4, 7] },
  { id: "min", label: "Minor", semis: [0, 3, 7] },
  { id: "7", label: "Dominant 7", semis: [0, 4, 7, 10] },
  { id: "maj7", label: "Major 7", semis: [0, 4, 7, 11] },
  { id: "m7", label: "Minor 7", semis: [0, 3, 7, 10] },
  { id: "dim", label: "Diminished", semis: [0, 3, 6] },
  { id: "aug", label: "Augmented", semis: [0, 4, 8] },
  { id: "sus2", label: "Sus2", semis: [0, 2, 7] },
  { id: "sus4", label: "Sus4", semis: [0, 5, 7] },
  { id: "add9", label: "Add9", semis: [0, 4, 7, 14] },
  { id: "9", label: "Dominant 9", semis: [0, 4, 7, 10, 14] },
  { id: "13", label: "Dominant 13", semis: [0, 4, 10, 14, 21] },
  { id: "dim7", label: "Diminished 7", semis: [0, 3, 6, 9] },
];
/** What the chord quiz asks with no set: major, minor and the three 7th chords. */
export const DEFAULT_QUALITIES = ["maj", "min", "7", "maj7", "m7"];
export const isQuality = (v: unknown): v is string => CHORD_QUALITIES.some((c) => c.id === v);

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** A chord of a major key: its numeral as the answer buttons show it, its root above the key's home note, and its triad from that root. */
export interface KeyChord { degree: number; numeral: string; semis: number; triad: number[] }

/** The seven triads of a major key, each stacked in 3rds on its scale note: I ii iii IV V vi vii°. */
export const KEY_CHORDS: KeyChord[] = MAJOR_STEPS.map((semis, d) => {
  const up = (i: number) => (MAJOR_STEPS[(d + i) % 7] - semis + 12) % 12;
  const triad = [0, up(2), up(4)];
  const numeral = (triad[1] === 3 ? ROMAN[d].toLowerCase() : ROMAN[d]) + (triad[2] === 6 ? "°" : "");
  return { degree: d + 1, numeral, semis, triad };
});

/**
 * Chord-change levels: the home chord (I) plays, then one other chord of the key, and the answer is its numeral. The two
 * other major chords first, then the minor ones. Each level includes the ones before it.
 */
export const CHANGE_LEVELS: { n: number; label: string; degrees: number[] }[] = [
  { n: 1, label: "IV, V", degrees: [4, 5] },
  { n: 2, label: "+ vi", degrees: [6] },
  { n: 3, label: "+ ii", degrees: [2] },
  { n: 4, label: "+ iii", degrees: [3] },
  { n: 5, label: "+ vii°: every chord of the key", degrees: [7] },
];

/** The chords of a change level and every level under it, in key order. */
export const levelChords = (level: number): KeyChord[] => {
  const degrees = new Set(CHANGE_LEVELS.filter((l) => l.n <= level).flatMap((l) => l.degrees));
  return KEY_CHORDS.filter((c) => degrees.has(c.degree));
};

export type Direction = "up" | "down" | "together";
export type EarKind = "interval" | "chord" | "change";

export interface EarSettings {
  level: number;
  /** an explicit interval set (semitones) that replaces the level */
  custom: number[] | null;
  direction: Direction;
  /** what is asked: an interval, a chord's kind, or a chord change (I, then another chord of the key) */
  kind: EarKind;
  /** intervals may span more than an octave (a 9th is played for a 2nd); off: always inside one octave */
  wide: boolean;
  /** for the chord kind: the chord kinds to ask (ids of `CHORD_QUALITIES`) in place of the default five */
  qualities: string[] | null;
}

/** The kind a settings query asks for. */
export const earKindOf = (query: string): EarKind => {
  const k = new URLSearchParams(query).get("kind");
  return k === "chord" || k === "change" ? k : "interval";
};

export function parseEarSettings(q: URLSearchParams): EarSettings {
  const lv = Number(q.get("level"));
  const set = (q.get("set") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
  const dir = q.get("dir");
  const kind = q.get("kind");
  const qualities = CHORD_QUALITIES.map((c) => c.id).filter((id) => (q.get("qualities") ?? "").split(",").includes(id));
  return {
    level: Number.isInteger(lv) && lv >= 1 && lv <= 6 ? Math.min(lv, TOP_EAR_LEVEL) : 1,
    custom: set.length ? [...new Set(set)] : null,
    direction: dir === "down" || dir === "together" ? dir : "up",
    kind: kind === "chord" || kind === "change" ? kind : "interval",
    wide: q.get("wide") === "1",
    qualities: qualities.length ? qualities : null,
  };
}

const shortOf = (semis: number) => INTERVALS.find((i) => i.semis === semis)!.short;

/** The answers on offer: interval names (P5, m3 …) for the interval kind, chord ids for the chord kind, numerals (IV, V, vi …) for the change kind. */
export function activeAnswers(s: EarSettings): string[] {
  if (s.kind === "chord") return s.qualities ?? DEFAULT_QUALITIES;
  if (s.kind === "change") return levelChords(s.level).map((c) => c.numeral);
  const semis = s.custom ?? levelSemis(s.level);
  return [...semis].sort((a, b) => a - b).map(shortOf);
}

export interface EarQuestion {
  answer: string;
  /** every note of the question, first note first: what is played, unless `chords` says more */
  midi: number[];
  together: boolean;
  /** chords played one after another (a chord change): each one's notes, the first chord first; `midi` is all of them in a row */
  chords?: number[][];
}

/** Where questions sit: no note under G3, which a phone speaker barely plays, and none over C6. */
const LOWEST = 55;
const HIGHEST = 84;
/** the lowest note is picked from about an octave and a half, so the questions don't all start in one place */
const SPREAD = 17;

/** The lowest note of a question spanning `span` semitones: random, at least G3, with the top still at or under C6. */
const lowNote = (span: number, rand: () => number) => LOWEST + Math.floor(rand() * Math.max(1, Math.min(SPREAD, HIGHEST - span - LOWEST + 1)));

/** A random question: its notes between G3 and C6, and an answer that differs from the last one when there is a choice. */
export function nextEarQuestion(s: EarSettings, rand: () => number, prev?: EarQuestion): EarQuestion {
  const answers = activeAnswers(s);
  const pool = answers.length > 1 && prev ? answers.filter((a) => a !== prev.answer) : answers;
  const answer = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  if (s.kind === "chord") {
    const c = CHORD_QUALITIES.find((x) => x.id === answer)!;
    const root = lowNote(Math.max(...c.semis), rand);
    return { answer, midi: c.semis.map((v) => root + v), together: true };
  }
  if (s.kind === "change") {
    // both triads in root position over a new home note each time: the second chord's root sits above the home note
    const c = KEY_CHORDS.find((x) => x.numeral === answer)!;
    const home = lowNote(c.semis + c.triad[2], rand);
    const chords = [KEY_CHORDS[0].triad.map((v) => home + v), c.triad.map((v) => home + c.semis + v)];
    return { answer, midi: chords.flat(), together: true, chords };
  }
  const simple = INTERVALS.find((i) => i.short === answer)!.semis;
  // wide: sometimes an octave more, still named as the simple interval
  const wide = s.wide && simple < 12 && rand() < 0.5;
  const semis = wide ? simple + 12 : simple;
  const low = lowNote(semis, rand);
  return { answer, midi: s.direction === "down" ? [low + semis, low] : [low, low + semis], together: s.direction === "together" };
}

/**
 * The sound of another answer, set beside a question: the same first note (an interval), root (a chord) or key (a chord
 * change), played the same way, so the two can be compared by ear. An interval keeps the question's direction and its
 * extra octave. An answer that is no interval, chord kind or numeral gives the question back.
 */
export function soundOfAnswer(q: EarQuestion, answer: string): EarQuestion {
  if (answer === q.answer) return q;
  if (q.chords) {
    const c = KEY_CHORDS.find((x) => x.numeral === answer);
    if (!c) return q;
    const home = q.chords[0][0];
    const chords = [q.chords[0], c.triad.map((v) => home + c.semis + v)];
    return { answer, midi: chords.flat(), together: true, chords };
  }
  const quality = CHORD_QUALITIES.find((x) => x.id === answer);
  if (quality) return { answer, midi: quality.semis.map((v) => q.midi[0] + v), together: true };
  const simple = INTERVALS.find((i) => i.short === answer)?.semis;
  if (simple === undefined || q.midi.length !== 2) return q;
  const [first, second] = q.midi;
  const semis = Math.abs(second - first) > 12 && simple < 12 ? simple + 12 : simple;
  return { answer, midi: [first, second < first ? first - semis : first + semis], together: q.together };
}

export interface Score {
  [answer: string]: { right: number; total: number };
}

export function recordScore(sc: Score, answer: string, ok: boolean): Score {
  const cur = sc[answer] ?? { right: 0, total: 0 };
  return { ...sc, [answer]: { right: cur.right + (ok ? 1 : 0), total: cur.total + 1 } };
}
