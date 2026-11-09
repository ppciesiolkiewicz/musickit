import { EMPTY_STAGE, type Stage, type Subject } from "@/features/stage";

/** A minor: tonic A (pitch class 9) in the major family's Aeolian mode (index 5). */
const A_MINOR = { tonicPc: 9, family: 0, mode: 5 };

/** A stage of widgets in reading order, laid out as the notes creator does with One per row on. */
function note(parts: [string, Subject][]): Stage {
  const layers = parts.map(([id, subject], z) => ({ id, subject, rect: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }, visible: true, z }));
  return { ...EMPTY_STAGE, layers, key: A_MINOR, layout: "grid", order: layers.map((l) => l.id), gridAuto: true };
}

const keyed = { key: A_MINOR };

/**
 * Notes made ahead, opened at `/note/<slug>`: what a pitch can link to. Each is a stage like any shared note (its link is the same
 * page, read as an article), but its address is a plain word and the note is kept here, in code, where it can be read and changed.
 */
export const PRESET_NOTES: Record<string, { stage: Stage }> = {
  "minor-pentatonic": {
    stage: note([
      ["t1", { kind: "text", text: "# A minor pentatonic in five minutes\n\nFive notes — A, C, D, E, G — are enough for most rock, blues and pop solos. Start with one box, hear it, then join the others." }],
      ["p1", { kind: "position", positionKind: "pentatonic", index: 0, ...keyed }],
      ["t2", { kind: "text", text: "## Box 1\n\nThe root A sits on the 5th fret of the low E and high e strings, with the box between frets 5 and 8. Press a dot to hear its note, then play the box up and down." }],
      ["n1", { kind: "neck", ...keyed }],
      ["t3", { kind: "text", text: "## The whole neck\n\nThe same notes everywhere. The five boxes are this picture cut into pieces you can hold in one hand." }],
      ["s1", { kind: "section", section: "chords", ...keyed }],
      ["t4", { kind: "text", text: "## Chords under it\n\nA minor, D minor and E minor are the chords of the key that the scale sits on top of. Play one and solo over it." }],
      ["b1", { kind: "band", ...keyed }],
    ]),
  },
};

/** The preset note behind a slug, or null when there is none. */
export const presetNote = (slug: string) => (Object.hasOwn(PRESET_NOTES, slug) ? PRESET_NOTES[slug] : null);
