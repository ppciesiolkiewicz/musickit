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
  const semis = INTERVALS.find((i) => i.short === answer)!.semis;
  return { answer, midi: [root, s.direction === "down" ? root - semis : root + semis], together: s.direction === "together" };
}

export interface Score {
  [answer: string]: { right: number; total: number };
}

export function recordScore(sc: Score, answer: string, ok: boolean): Score {
  const cur = sc[answer] ?? { right: 0, total: 0 };
  return { ...sc, [answer]: { right: cur.right + (ok ? 1 : 0), total: cur.total + 1 } };
}
