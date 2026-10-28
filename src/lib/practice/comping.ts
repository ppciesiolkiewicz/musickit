/**
 * Ways to play a chord over a bar, as pure functions: the notes of one chord shape (low to high) and a pattern give
 * events in beats. Used by the plan's "comp" tool, where a progression is played as arpeggios or as comping.
 */
export const COMP_PATTERNS = [
  { id: "block", label: "Block chords", desc: "the whole chord on every beat" },
  { id: "strum", label: "Strum", desc: "down, down-up, up-down-up in eighths" },
  { id: "bass-chord", label: "Bass + chord", desc: "bass note on 1 and 3, chord on 2 and 4" },
  { id: "arp-up", label: "Arpeggio up", desc: "low to high in eighths, round again" },
  { id: "arp-down", label: "Arpeggio down", desc: "high to low in eighths, round again" },
  { id: "arp-updown", label: "Arpeggio up and down", desc: "low to high and back in eighths" },
  { id: "fingerstyle", label: "Fingerstyle", desc: "bass, middle, top, middle in eighths" },
] as const;

export type CompPattern = (typeof COMP_PATTERNS)[number]["id"];
export const isCompPattern = (v: unknown): v is CompPattern => COMP_PATTERNS.some((p) => p.id === v);

export interface CompEvent {
  /** beats from the start of the bar */
  beat: number;
  midi: number[];
  /** beats it rings */
  len: number;
  /** ms between the notes of the event when it is strummed (0: together) */
  gapMs: number;
}

/** What one bar of `beats` beats plays: `notes` is the chord, low to high. */
export function compEvents(notes: number[], pattern: CompPattern, beats = 4): CompEvent[] {
  if (!notes.length) return [];
  const n = notes.length;
  const slots = beats * 2; // eighths
  const one = (slot: number, midi: number[], len = 0.5, gapMs = 0): CompEvent => ({ beat: slot / 2, midi, len, gapMs });
  const run = (order: number[]) => Array.from({ length: slots }, (_, i) => one(i, [notes[order[i % order.length]]], 0.9));
  switch (pattern) {
    case "block":
      return Array.from({ length: beats }, (_, b) => ({ beat: b, midi: notes, len: 0.95, gapMs: 0 }));
    case "strum": {
      const hits = [0, 2, 3, 5, 6, 7].filter((s) => s < slots); // D, D U, U D U (eighth slots)
      return hits.map((s) => ({ beat: s / 2, midi: s % 2 ? [...notes].reverse() : notes, len: 0.5, gapMs: 25 }));
    }
    case "bass-chord":
      return Array.from({ length: beats }, (_, b) =>
        b % 2 === 0 ? { beat: b, midi: [notes[0]], len: 1.9, gapMs: 0 } : { beat: b, midi: notes.slice(1).length ? notes.slice(1) : notes, len: 0.95, gapMs: 20 });
    case "arp-up":
      return run(notes.map((_, i) => i));
    case "arp-down":
      return run(notes.map((_, i) => n - 1 - i));
    case "arp-updown": {
      const up = notes.map((_, i) => i);
      return run(n > 2 ? [...up, ...up.slice(1, -1).reverse()] : up);
    }
    case "fingerstyle": {
      const mid = Math.floor(n / 2);
      return run([0, mid, n - 1, mid]);
    }
  }
}
