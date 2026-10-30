import type { CompPattern } from "@/lib/practice/comping";
import type { Degree, DegreesFrom, Place, Voicing } from "../timeline/types";

/** Inputs every shape takes: `bpm` (30-240) and `repeats` (how many times the whole timeline loops, 1-50). */
export interface ShapeCommon {
  bpm: number;
  repeats?: number;
}

/**
 * A chord progression, by chord names or by numerals in a key, cycled to fill `bars`. Optional `steps` repeat over
 * each chord's beats, one beat each ("strum" or a degree). Degrees are major-relative semitones ("3" is always 4),
 * counted from the chord root (`degreesFrom: "chord"`, default) or the key. `backing` lists comping patterns, the
 * first plays first. `place` gives each chord a box and part, in order. Also takes `bpm` and `repeats`.
 *
 * Example: `{ "shape": "progression", "key": "g", "numerals": ["I","IV","V"], "steps": ["1","3","5"], "bars": 4, "bpm": 70, "repeats": 6 }`
 * @component progression shape
 */
export interface ProgressionShape extends ShapeCommon {
  shape: "progression";
  /** key as a note: "g", "f-sharp", "b-flat" */
  key: string;
  /** I ii iii IV V vi vii°, bVII, V7 (major-key degrees; lower case = minor) */
  numerals?: string[];
  /** chord names, used when numerals are absent: "G", "Em7" */
  chords?: string[];
  /** total bars; chords cycle to fill them */
  bars: number;
  /** beats per chord, default 4 */
  beatsPerChord?: 2 | 4;
  /** repeated step template: "strum" or a degree like "1", "b3" */
  steps?: ("strum" | Degree)[];
  /** what the step degrees count from: "chord" (default) or "key" */
  degreesFrom?: DegreesFrom;
  /** "open" (default) or "barre" */
  voicing?: Voicing;
  /** comping patterns the student can pick, first one plays first */
  backing?: CompPattern[];
  /** box and part per chord, in order: [{ "box": 1, "part": "lower" }] */
  place?: Place[];
}

/**
 * Play in one scale, then switch to another at a bar (default halfway), same click throughout. Each side has its own
 * key. Also takes `bpm` and `repeats`.
 *
 * Example: `{ "shape": "two-scales", "a": { "key": "a", "scale": "minor-pentatonic" }, "b": { "key": "a", "scale": "dorian" }, "bars": 8, "bpm": 80 }`
 * @component two-scales shape
 */
export interface TwoScalesShape extends ShapeCommon {
  shape: "two-scales";
  /** first scale: key ("a") and scale slug ("minor-pentatonic", "dorian", "major-ionian") */
  a: { key: string; scale: string };
  /** second scale, same form */
  b: { key: string; scale: string };
  /** total bars, at least 2 */
  bars: number;
  /** bar the switch happens at (0-based), default half of bars, kept within 1..bars-1 */
  switchBar?: number;
  /** optional chord to hold underneath: "Am" */
  backingChord?: string;
}

/**
 * Per chord, a list of steps, one beat each: "strum" or a degree. Each chord takes one bar, more when its steps need
 * them. Degrees are major-relative semitones from the chord root (default) or the key (when `key` is given). `guide`
 * gives a cue per step, in order. Also takes `bpm` and `repeats`.
 *
 * Example: `{ "shape": "chord-steps", "voicing": "barre", "chords": [{ "chord": "G", "steps": ["strum","1","6","1"] }, { "chord": "D", "steps": ["strum","4","5","4"] }], "bpm": 70 }`
 * @component chord-steps shape
 */
export interface ChordStepsShape extends ShapeCommon {
  shape: "chord-steps";
  /** optional key ("g"); needed for degreesFrom "key" */
  key?: string;
  /** chords in order, each with its steps and optional box/part */
  chords: { chord: string; steps: ("strum" | Degree)[]; place?: Place }[];
  /** "chord" (default) or "key" */
  degreesFrom?: DegreesFrom;
  /** "open" (default) or "barre" */
  voicing?: Voicing;
  /** cue text per step, in order; missing ones get a default cue on a box change */
  guide?: string[];
}

/**
 * Part of an arpeggio (for example 1-3, or 1-3-5) over a chord or a progression; chords cycle to fill `bars`, the
 * degrees repeat one per beat. `place` gives each chord a box and part; `across` connects one arpeggio from one box
 * part to the next. Also takes `bpm` and `repeats`.
 *
 * Example: `{ "shape": "arpeggio-part", "chords": ["C","Am","F","G"], "degrees": ["1","3","5"], "bars": 4, "place": [{ "box": 1, "part": "lower" }, { "box": 1, "part": "upper" }, { "box": 2, "part": "lower" }, { "box": 2, "part": "upper" }], "bpm": 70 }`
 * @component arpeggio-part shape
 */
export interface ArpeggioPartShape extends ShapeCommon {
  shape: "arpeggio-part";
  /** optional key as a note ("c") */
  key?: string;
  /** chord names: "C", "Am7" */
  chords: string[];
  /** arpeggio degrees from the chord root: ["1","3","5"] */
  degrees: Degree[];
  /** cross from one box part to another: { "from": { "box": 1, "part": "upper" }, "to": { "box": 2, "part": "upper" } } */
  across?: { from: Place; to: Place };
  /** box and part per chord, in order */
  place?: Place[];
  /** total bars */
  bars: number;
  /** cue text per step, in order */
  guide?: string[];
}

/**
 * A tune from the singing book, by number, in a key. Also takes `bpm` and `repeats`.
 *
 * Example: `{ "shape": "melody", "tune": 3, "key": "d", "bpm": 80 }`
 * @component melody shape
 */
export interface MelodyShape extends ShapeCommon {
  shape: "melody";
  /** melody book number (1-based) */
  tune: number;
  /** key as a note: "c", "f-sharp" */
  key: string;
}

/**
 * Improvise over chords: per chord an optional scale (named from the chord root), target chord tones shown
 * highlighted (degrees, major-relative), and an optional `approach` hint. The code plays the backing; no fixed
 * notes, nothing graded. Each chord takes `bars` bars (default 1). Also takes `bpm` and `repeats`.
 *
 * Example: `{ "shape": "solo-over", "key": "g", "chords": [{ "chord": "Am7", "scale": "dorian", "target": ["1","b3"] }, { "chord": "D7", "scale": "mixolydian", "target": ["3"], "approach": "land on the 3rd on beat 1" }], "bpm": 90 }`
 * @component solo-over shape
 */
export interface SoloOverShape extends ShapeCommon {
  shape: "solo-over";
  /** key as a note: "g" */
  key: string;
  /** chords in order with scale slug, target degrees and optional hint */
  chords: { chord: string; scale?: string; target: Degree[]; approach?: string }[];
  /** bars per chord, default 1 */
  bars?: number;
  /** comping pattern for the backing */
  backing?: CompPattern;
}

export type Shape = ProgressionShape | TwoScalesShape | ChordStepsShape | ArpeggioPartShape | MelodyShape | SoloOverShape;
