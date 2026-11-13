import { parseBlock } from "@/features/plan/model/config";
import type { Block } from "@/features/plan/model/types";

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
  pentatonicRun: 122,
};

/** A video still to record, saying what goes there: a preset shows a teacher what a note can hold. */
const video = { type: "tool", tool: { type: "video", ref: { source: "placeholder", text: "A teacher records their own videos for a note and can use each one again anywhere in it." } } };
const text = (t: string) => ({ type: "text", text: t });
const tool = (t: Record<string, unknown>) => ({ type: "tool", tool: t });
const section = (heading: string, ...cells: unknown[]) => ({ type: "section", heading, cells });
/** A singer whose key is its own: the note's key (A minor) never moves it. */
const sung = (t: Record<string, unknown>) => tool({ ...t, pinned: ["key"] });

/**
 * Notes made ahead, opened at `/note/<slug>`: what a pitch can link to. Each is a block like any shared note, written as its JSON
 * and read by the same parser. It opens with its title and the line about it, the same as `PRESET_INFO`'s (the page draws them as
 * its header); each heading is a section holding the words and the widget it is about.
 */
const RAW: Record<string, unknown> = {
  "minor-pentatonic": {
    title: "A minor pentatonic: play it, then sing it",
    choice: { open: { key: "a", scale: "natural-minor-aeolian" } },
    cells: [
      text("Find the five notes of A minor pentatonic in position 1, play them over a band, then sing the same notes."),
      { type: "notice", notice: "headphones" },
      text("Five notes are enough for most rock, blues and pop solos: A, C, D, E and G. Find them on the neck first, then sing them, so your ears know the notes your fingers play."),
      video,
      section("Position 1",
        text("Start here. The root A is on fret 5 of both E strings. Tap a note below to hear it, then play the position up and down until your fingers find the notes without looking."),
        // the pentatonic is its own scale: the note's key (A natural minor) moves its root only
        tool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", boxes: [1], pinned: ["scale"] }),
        video),
      section("The whole neck",
        text("This is all of A minor. Find position 1 in it, then follow your five notes up the neck.\nThe two notes the pentatonic leaves out, B and F, belong to A minor too: your five notes keep clear of them, so almost nothing clashes."),
        tool({ type: "scale-neck", scale: "natural-minor-aeolian", key: "a", neck: true, positions: false })),
      section("The chords under it",
        text("These are the chords of A minor, the key the pentatonic comes from. Songs in A minor are built from them, and your five notes fit over all of them.\nPlay Am, Dm and Em, one slow strum each, until the changes feel smooth."),
        tool({ type: "key-chords", key: "a", scale: "natural-minor-aeolian" })),
      section("Over a rock groove",
        text("The band plays Am, F, G and Am, one bar each, as a rock groove: the snare hits on beats 2 and 4, and the bass plays the root of each chord, two notes to a beat. Press Play below to start the band, then play position 1 over it.\nLand on A when a phrase ends: it is the note that sounds like home.\nIf the groove feels fast, play one note on beat 1 of each bar, then add more as it settles."),
        tool({ type: "backing-track", progression: "aeolian", key: "a", style: "rock", bpm: 100 })),
      section("Sing the same notes",
        text("Now put the guitar down. Call C Do, and three of your five notes are Do, Re and Mi: C, D and E. Press Play below to hear the tune: the mic starts with it, and your line shows on the staff. Sing along on the note names until they come without thinking."),
        sung({ type: "melody-singer", tune: PRESET_TUNES.doReMi, key: "c", voice: "baritone" })),
      section("Up to Sol and La",
        text("The other two notes are Sol and La: G and A. This tune starts on Sol, steps up to La and comes home to Do. Press Play below to hear it: the mic starts with it. Sing along on the note names until the step up feels easy, then press Next melody below for another one."),
        sung({ type: "melody-singer", tune: PRESET_TUNES.solLaSol, key: "c", voice: "baritone" })),
      section("A pentatonic run",
        text("A run is a quick line through the pentatonic, the kind soul and pop singers use. This one falls from the high Do to the low one, and each pass starts a semitone higher, through five keys. Press Play below to hear it: the mic starts with it. Listen to the first pass, then join in on \"oo\".\nIf a pass is too quick, hum along and catch the long Do that ends it. If a pass climbs out of reach, don't reach for high notes: sit it out and come back in on the next one."),
        tool({ type: "run-singer", run: PRESET_TUNES.pentatonicRun, voice: "baritone" })),
      section("Make it yours",
        text("Make up a short line from your five notes and sing it on \"la\". Then find it in position 1 and play it back.")),
    ],
  },
  "three-chords-in-g": {
    title: "G, C and D: three chords, one band",
    choice: { open: { key: "g", scale: "major-ionian" } },
    cells: [
      text("Learn the G, C and D chords, change between them in time, then play them with a band."),
      text("G, C and D are chords I, IV and V of G major. With these three you can play along with a lot of folk, rock and pop songs."),
      video,
      section("The three shapes",
        text("Press a chord box below to hear it. Strum each chord slowly and let every string ring.\nIf a string sounds dead, press closer to the fret and keep your fingertips up off the strings next to it."),
        tool({ type: "chord-shapes", chords: ["G", "C", "D"] }),
        video),
      section("The chords in G",
        text("These are all the chords of G major. Find G, C and D among them: the other four belong to the key too, so you can add them later."),
        tool({ type: "key-chords", key: "g", scale: "major-ionian" })),
      section("With the band",
        text("The band plays G, G, C and D, one bar each, as a slow rock groove. Press Play below to start the band, then strum down once on each beat.\nStart moving to the next chord on beat 4, so it lands on beat 1.\nIf a change comes late, keep your strumming hand going and catch the next beat 1."),
        tool({ type: "backing-track", progression: "three-chord", key: "g", style: "rock", bpm: 70 })),
      section("Make it yours",
        text("Put the three chords in your own order, two bars each, and play them until the changes feel smooth. Then hum a short tune over them.")),
    ],
  },
};

/** The preset notes, parsed as any note is (`presetNotes.test.ts` checks nothing is left out). */
export const PRESET_NOTES: Record<string, Block> = Object.fromEntries(Object.entries(RAW).map(([slug, raw]) => [slug, parseBlock(raw).block]));

/** The warnings a preset's JSON gives, for its test. */
export const presetWarnings = (slug: string): string[] => parseBlock(RAW[slug]).warnings;

/**
 * Dev demo: a preset as the notes creator last left it (`?edit=true` keeps every change here as it is made). In this tab's memory
 * only, so moving between the note and its creator shows the changes and a reload brings the preset back. Nothing is stored or sent.
 */
const drafts = new Map<string, Block>();
export const savePresetDraft = (slug: string, block: Block): void => void drafts.set(slug, block);
/** The preset as the page shows it: its draft if this tab has one, else the note in code; null for an unknown slug. */
export const presetBlock = (slug: string): Block | null => drafts.get(slug) ?? (Object.hasOwn(PRESET_NOTES, slug) ? PRESET_NOTES[slug] : null);
