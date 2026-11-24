import { Chord, Interval, Note } from "@tonaljs/tonal";
import { chordLabel } from "./chordSearch";

/** A chord named from the notes held together: its name ("E9", "C/E"; a rootless grip with an extension lowest has no slash),its root and a label for each note ("R", "3", "♭7", "9"). */
export interface GripName { name: string; rootPc: number; labels: string[] }

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** "3M" → "3", "7m" → "♭7", "5d" → "♭5", "11A" → "♯11", "1P" → "R". */
function intervalText(iv: string): string {
  const num = Interval.num(iv), q = Interval.quality(iv);
  if (num === 1 || num === 8) return "R";
  return (q === "m" || q === "d" ? "♭" : q === "A" ? "♯" : "") + num;
}

/**
 * Names the chord that `midi` (low to high, the bass first) spells, or null when it spells none: tonal's first reading,
 * with a missing fifth taken for granted, so a rootless or fifthless grip still gets its usual name. `known`, a chord
 * symbol the caller already has, wins when it holds every note.
 */
export function gripName(midi: number[], known?: string): GripName | null {
  if (midi.length < 2) return null;
  const pcs = midi.map(mod12);
  const read = (sym: string) => {
    const ch = Chord.get(sym.replace(/♯/g, "#").replace(/♭/g, "b"));
    if (ch.empty || !ch.tonic) return null;
    const rootPc = Note.chroma(ch.tonic)!;
    const bySemi = new Map(ch.intervals.map((iv) => [mod12(Interval.semitones(iv) ?? 0), intervalText(iv)]));
    const labels = pcs.map((pc) => bySemi.get(mod12(pc - rootPc)));
    if (labels.some((l) => l === undefined)) return null;
    return { rootPc, labels: labels as string[] };
  };
  const given = known ? read(known.replace(/\/.*$/, "")) : null;
  if (known && given) return { name: chordLabel(known), ...given };
  const found = Chord.detect(pcs.map((pc) => SHARP[pc]), { assumePerfectFifth: true });
  // tonal reads a C/E as "Em#5" first: take the plainest reading it offers
  const sym = found.find((s) => !/no5|#5/.test(s)) ?? found.find((s) => !/no5/.test(s)) ?? found[0];
  if (!sym) return null;
  const [head, bass] = sym.split("/");
  const got = read(head);
  if (!got) return null;
  // a rootless grip with its 9th, 11th or 13th lowest keeps its plain name (E9, not E9/F♯), as players call it
  const slash = bass && !/^[♭♯]?(9|11|13)$/.test(got.labels[0]);
  const name = chordLabel(head) + (slash ? `/${chordLabel(bass)}` : "");
  return { name, ...got };
}
