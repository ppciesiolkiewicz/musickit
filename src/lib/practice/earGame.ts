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
  { n: 5, label: "+ m7, M7, tritone", semis: [10, 11, 6] },
  { n: 6, label: "All twelve", semis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
];

export const CHORD_QUALITIES: { id: string; label: string; semis: number[] }[] = [
  { id: "maj", label: "Major", semis: [0, 4, 7] },
  { id: "min", label: "Minor", semis: [0, 3, 7] },
  { id: "7", label: "Dominant 7", semis: [0, 4, 7, 10] },
  { id: "maj7", label: "Major 7", semis: [0, 4, 7, 11] },
  { id: "m7", label: "Minor 7", semis: [0, 3, 7, 10] },
];

export type Direction = "up" | "down" | "together";

export interface EarSettings {
  level: number;
  /** an explicit interval set (semitones) that replaces the level */
  custom: number[] | null;
  direction: Direction;
  kind: "interval" | "chord";
  /** intervals may span more than an octave (a 9th is played for a 2nd); off: always inside one octave */
  wide: boolean;
}

export function parseEarSettings(q: URLSearchParams): EarSettings {
  const lv = Number(q.get("level"));
  const set = (q.get("set") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
  const dir = q.get("dir");
  return {
    level: Number.isInteger(lv) && lv >= 1 && lv <= 6 ? lv : 1,
    custom: set.length ? [...new Set(set)] : null,
    direction: dir === "down" || dir === "together" ? dir : "up",
    kind: q.get("kind") === "chord" ? "chord" : "interval",
    wide: q.get("wide") === "1",
  };
}

const shortOf = (semis: number) => INTERVALS.find((i) => i.semis === semis)!.short;

/** The answers on offer: interval names (P5, m3 …) for the interval kind, chord ids for the chord kind. */
export function activeAnswers(s: EarSettings): string[] {
  if (s.kind === "chord") return CHORD_QUALITIES.map((c) => c.id);
  const semis = s.custom ?? [...new Set(EAR_LEVELS.filter((l) => l.n <= s.level).flatMap((l) => l.semis))];
  return [...semis].sort((a, b) => a - b).map(shortOf);
}

export interface EarQuestion {
  answer: string;
  /** the notes to play, first note first */
  midi: number[];
  together: boolean;
}

/** A random question: a random root (MIDI 48-64) and an answer that differs from the last one when there is a choice. */
export function nextEarQuestion(s: EarSettings, rand: () => number, prev?: EarQuestion): EarQuestion {
  const answers = activeAnswers(s);
  const pool = answers.length > 1 && prev ? answers.filter((a) => a !== prev.answer) : answers;
  const answer = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  const root = 48 + Math.floor(rand() * 17);
  if (s.kind === "chord") {
    const c = CHORD_QUALITIES.find((x) => x.id === answer)!;
    return { answer, midi: c.semis.map((v) => root + v), together: true };
  }
  const simple = INTERVALS.find((i) => i.short === answer)!.semis;
  // wide: sometimes an octave more, still named as the simple interval
  const semis = s.wide && simple < 12 && rand() < 0.5 ? simple + 12 : simple;
  return { answer, midi: [root, s.direction === "down" ? root - semis : root + semis], together: s.direction === "together" };
}

export interface Score {
  [answer: string]: { right: number; total: number };
}

export function recordScore(sc: Score, answer: string, ok: boolean): Score {
  const cur = sc[answer] ?? { right: 0, total: 0 };
  return { ...sc, [answer]: { right: cur.right + (ok ? 1 : 0), total: cur.total + 1 } };
}

/**
 * Reading an interval played on an instrument: the notes a stream of mic readings adds up to. A note counts once it has held for
 * `HOLD_MS`, which skips the wobble of a pluck. A new note must differ from the one before, since a string rings on after it counts.
 * While `gated` (the question is sounding, or already answered) nothing counts, and whatever is ringing at that moment stays
 * ignored until it stops or changes, so a string left ringing cannot become the first note of the next answer.
 */
export interface PlayedNotes { notes: number[]; candidate: number | null; since: number; ignore: number | null }
const HOLD_MS = 130;
export const playedNotes = {
  initial: { notes: [], candidate: null, since: 0, ignore: null } as PlayedNotes,
  step(state: PlayedNotes, midi: number | null, t: number, gated = false): PlayedNotes {
    if (gated) return { notes: [], candidate: null, since: t, ignore: midi ?? state.ignore };
    const ignore = midi === state.ignore ? state.ignore : null;
    if (midi === null || midi === ignore) return { ...state, candidate: null, ignore };
    if (midi !== state.candidate) return { ...state, candidate: midi, since: t, ignore };
    if (t - state.since < HOLD_MS || midi === state.notes[state.notes.length - 1]) return { ...state, ignore };
    return { ...state, notes: [...state.notes, midi], ignore };
  },
};

/** The name of the gap between two played notes, up or down. Wider than an octave counts as the simple interval, as the wide questions do. */
export function playedInterval(a: number, b: number): string {
  const gap = Math.abs(a - b);
  return shortOf(gap <= 12 ? gap : ((gap - 1) % 12) + 1);
}
