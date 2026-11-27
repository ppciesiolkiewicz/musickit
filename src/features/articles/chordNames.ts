import { chordShapeFor } from "@/features/exercises/cues/voicing";

/** A run of article text split at chord names: plain text, or a chord the reader can point at to see its chord box. */
export type ChordPart = string | { chord: string };

/** A chord's quality after its letter, as articles write it: Am, Fmaj7, B7, C9, Bm7♭5, Dsus4. */
const QUALITY = "(?:maj7|maj9|m7♭5|m7|m9|m6|m|7|9|6|5|sus2|sus4|dim7|dim|aug|add9)?";
const NAME = new RegExp(`(?<![\\w♯♭#{-])[A-G][♯♭#]?${QUALITY}(?![\\w♯♭#])`, "g");

/**
 * Whether a letter at `at` names something other than a chord: a string ("the A string", "the low E"), a key or scale
 * ("the C minor pentatonic scale"), a note being named ("E, the 7th"), or "A" the word ("A fill", "A 9 chord").
 */
const notChord = (text: string, found: string, at: number) => {
  const after = text.slice(at + found.length);
  if (/\b(?:low|high)\s+$/i.test(text.slice(0, at))) return true;
  if (/^\s+strings?\b/.test(after)) return true;
  if (/^\s+(?:major|minor|pentatonic|blues|scale|key|dorian|mixolydian)\b/i.test(after)) return true;
  if (/^[A-G][♯♭#]?$/.test(found) && /^,\s+the\b/.test(after)) return true;
  return found === "A" && /^\s+[a-z0-9]/.test(after);
};

/** Splits one run of text at the chord names the app has a shape for, leaving `{{…}}` notes and chords whole. */
export function splitChords(text: string): ChordPart[] {
  const out: ChordPart[] = [];
  const push = (s: string) => {
    if (!s) return;
    if (typeof out[out.length - 1] === "string") out[out.length - 1] += s;
    else out.push(s);
  };
  for (const seg of text.split(/(\{\{[^}]*\}\})/)) {
    if (seg.startsWith("{{")) {
      push(seg);
      continue;
    }
    let last = 0;
    for (const m of seg.matchAll(NAME)) {
      if (notChord(seg, m[0], m.index) || !chordShapeFor(m[0].replace("♯", "#").replace("♭", "b"), "open")) continue;
      push(seg.slice(last, m.index));
      out.push({ chord: m[0] });
      last = m.index + m[0].length;
    }
    push(seg.slice(last));
  }
  return out;
}
