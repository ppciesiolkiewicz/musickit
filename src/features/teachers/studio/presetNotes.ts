import type { Stage, Subject } from "@/features/stage";
import { noteOf } from "./notes";

/** A minor: tonic A (pitch class 9) in the major family's Aeolian mode (index 5). */
const A_MINOR = { tonicPc: 9, family: 0, mode: 5 };

/** A preset's widgets in reading order, in A minor. */
const note = (parts: Subject[]): Stage => noteOf(parts, A_MINOR);

const keyed = { key: A_MINOR };

/** C major: Do is C, so Do Re Mi Sol La are C D E G A, the five notes of A minor pentatonic. */
const C = 0;
/** A singer tool whose key is its own: the note's key (A minor) never moves it. */
const sung = (tool: Extract<Subject, { kind: "tool" }>["tool"]): Subject => ({ kind: "tool", tool, pinned: ["tonic"] });

/**
 * Tunes and a run from the singing books, by their number there (`BOOK`, `RUNS` in theory/singingMelodies). The texts beside them
 * name their notes, so a test checks each number is still the tune written here.
 */
export const PRESET_TUNES = {
  /** Do Re Mi 5: "3 1 2 3 | 2h 1h | 3 2 1 2 | 1w" */
  doReMi: 6,
  /** Sol La Sol 1: "5 6 5 3 | 1w" */
  solLaSol: 36,
  /** Pentatonic runs 1: "1's 6s 5s 3s 5s 3s 2s 1s 2h | 1w" */
  pentatonicRun: 108,
};

/**
 * Notes made ahead, opened at `/note/<slug>`: what a pitch can link to. Each is a stage like any shared note (its link is the same
 * page, read as an article), but its address is a plain word and the note is kept here, in code, where it can be read and changed.
 * It opens with its `# ` title, the same as `PRESET_INFO`'s; a heading and its words come before the widget they are about.
 */
export const PRESET_NOTES: Record<string, { stage: Stage }> = {
  "minor-pentatonic": {
    stage: note([
      { kind: "text", text: "# A minor pentatonic: play it, then sing it\n\nFive notes are enough for most rock, blues and pop solos: A, C, D, E and G. Find them on the neck first, then sing them, so your ears know the notes your fingers play." },
      { kind: "text", text: "### Position 1\n\nStart here. The root A is on fret 5 of both E strings. Tap a dot below to hear its note, then play the position up and down until your fingers find the notes without looking." },
      { kind: "position", positionKind: "pentatonic", index: 0, ...keyed },
      { kind: "text", text: "### The whole neck\n\nThis is all of A minor. Your five notes run the whole way up, with two more between them, B and F, that the pentatonic leaves out. Find position 1 in it, then follow A, C, D, E and G up the neck." },
      { kind: "neck", ...keyed },
      { kind: "text", text: "### The chords under it\n\nThese are the chords of A minor, the key the scale belongs to. Am, Dm and Em are the three to start with." },
      { kind: "section", section: "chords", ...keyed },
      { kind: "text", text: "### Play over the band\n\nPress ALL at the top of the band below to start it, then play position 1 over it. Land on A when a phrase ends: it is the note that sounds like home." },
      { kind: "band", ...keyed },
      { kind: "text", text: "### Sing the same notes\n\nNow put the guitar down. Call C Do, and three of your five notes are Do, Re and Mi: C, D and E. Press Play above the staff to hear the melody, then sing it back. Play starts the microphone too, and the staff marks the note you are on." },
      sung({ type: "melody-singer", tune: PRESET_TUNES.doReMi, key: C, voice: "baritone" }),
      { kind: "text", text: "### Up to Sol and La\n\nThe other two notes are Sol and La: G and A. This melody starts on Sol, steps up to La and comes home to Do. Sing it until the step up feels easy, then press Next melody above the staff for another one." },
      sung({ type: "melody-singer", tune: PRESET_TUNES.solLaSol, key: C, voice: "baritone" }),
      { kind: "text", text: "### A pentatonic run\n\nA run is a quick line through the pentatonic, the kind soul and pop singers use. This one falls from the high Do to the low one, then comes round again with Do a semitone higher, through five keys. Press Play above the staff, listen to the first pass and join in on the next. If it is too quick, hum along and catch the long Do that ends each pass." },
      { kind: "tool", tool: { type: "run-singer", run: PRESET_TUNES.pentatonicRun, voice: "baritone" } },
      { kind: "text", text: "### Make it yours\n\nSing a short line of your own with these five notes. Then find it in position 1 and play it back." },
    ]),
  },
};

/** The preset note behind a slug, or null when there is none. */
export const presetNote = (slug: string) => (Object.hasOwn(PRESET_NOTES, slug) ? PRESET_NOTES[slug] : null);

/**
 * Dev demo: a preset as the notes creator last left it (`?edit=true` keeps every change here as it is made). In this tab's memory only, so
 * moving between the note and its creator shows the changes and a reload brings the preset back. Nothing is stored or sent.
 */
const saved = new Map<string, Stage>();
export const savePresetDraft = (slug: string, stage: Stage): void => void saved.set(slug, { ...stage, selected: null });
/** The preset as the page shows it: its saved draft if this tab has one, else the note in code; null for an unknown slug. */
export const presetStage = (slug: string): Stage | null => saved.get(slug) ?? presetNote(slug)?.stage ?? null;
