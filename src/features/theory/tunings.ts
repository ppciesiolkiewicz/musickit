/** Instruments, their open-string tunings and A4 reference pitches. Used by the tuner, the Tunings page and the creator. */

const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface TunerString { name: string; octave: number; midi: number }

export interface Tuning {
  id: string;
  name: string;
  /** Open strings, lowest (thickest) first, except re-entrant tunings which keep the physical order. */
  strings: TunerString[];
  note?: string;
}

export type InstrumentId = "chromatic" | "guitar" | "bass" | "ukulele" | "violin" | "viola" | "cello" | "mandolin" | "banjo";

export interface Instrument {
  id: InstrumentId;
  name: string;
  tunings: Tuning[];
  /** Lowest pitch the detector should look for, in Hz. */
  minHz: number;
}

/** "E2 A2 D3" → strings. Sharps only (C#, not Db). */
const s = (spec: string): TunerString[] =>
  spec.split(" ").map((n) => {
    const m = /^([A-G]#?)(-?\d)$/.exec(n);
    if (!m) throw new Error(`bad note ${n}`);
    const octave = Number(m[2]);
    return { name: m[1], octave, midi: (octave + 1) * 12 + SHARPS.indexOf(m[1]) };
  });

const t = (id: string, name: string, spec: string, note?: string): Tuning => ({ id, name, strings: s(spec), note });

export const INSTRUMENTS: Instrument[] = [
  { id: "chromatic", name: "Chromatic", minHz: 40, tunings: [] },
  {
    id: "guitar", name: "Guitar", minHz: 50, tunings: [
      t("standard", "Standard", "E2 A2 D3 G3 B3 E4", "The default: fourths between strings, a major third between G and B."),
      t("half-down", "Half step down", "D#2 G#2 C#3 F#3 A#3 D#4", "Standard shifted down a semitone. Easier bends, darker sound; Hendrix, SRV, Van Halen."),
      t("d-standard", "D standard", "D2 G2 C3 F3 A3 D4", "Standard shifted down a whole tone. Heavy rock and metal."),
      t("drop-d", "Drop D", "D2 A2 D3 G3 B3 E4", "Low E down to D. One-finger power chords and a deeper low end."),
      t("drop-c", "Drop C", "C2 G2 C3 F3 A3 D4", "D standard with the low string dropped another tone."),
      t("dadgad", "DADGAD", "D2 A2 D3 G3 A3 D4", "Modal and open-sounding; Celtic and folk fingerstyle."),
      t("open-g", "Open G", "D2 G2 D3 G3 B3 D4", "Strums a G major chord open. Slide and Keith Richards riffs."),
      t("open-d", "Open D", "D2 A2 D3 F#3 A3 D4", "Strums a D major chord open. Slide and folk."),
      t("open-e", "Open E", "E2 B2 E3 G#3 B3 E4", "Strums an E major chord open. Slide blues."),
      t("open-c", "Open C", "C2 G2 C3 G3 C4 E4", "Wide, resonant open C major."),
    ],
  },
  {
    id: "bass", name: "Bass", minHz: 25, tunings: [
      t("standard", "Standard (4)", "E1 A1 D2 G2", "An octave below the guitar's four lowest strings."),
      t("drop-d", "Drop D", "D1 A1 D2 G2"),
      t("five", "5-string", "B0 E1 A1 D2 G2", "Adds a low B below standard."),
      t("half-down", "Half step down", "D#1 G#1 C#2 F#2"),
    ],
  },
  {
    id: "ukulele", name: "Ukulele", minHz: 100, tunings: [
      t("standard", "Standard (high G)", "G4 C4 E4 A4", "Re-entrant: the G string is higher than the C next to it, the 'my dog has fleas' sound."),
      t("low-g", "Low G", "G3 C4 E4 A4", "Linear tuning with a low G for a fuller range."),
      t("d-tuning", "D tuning", "A4 D4 F#4 B4", "Old-style, a tone higher than standard."),
      t("baritone", "Baritone", "D3 G3 B3 E4", "Same as the top four strings of a guitar."),
    ],
  },
  { id: "violin", name: "Violin", minHz: 150, tunings: [t("standard", "Standard", "G3 D4 A4 E5", "Perfect fifths.")] },
  { id: "viola", name: "Viola", minHz: 100, tunings: [t("standard", "Standard", "C3 G3 D4 A4", "A fifth below the violin.")] },
  { id: "cello", name: "Cello", minHz: 50, tunings: [t("standard", "Standard", "C2 G2 D3 A3", "An octave below the viola.")] },
  { id: "mandolin", name: "Mandolin", minHz: 150, tunings: [t("standard", "Standard", "G3 D4 A4 E5", "Like the violin, in four pairs of strings.")] },
  {
    id: "banjo", name: "Banjo", minHz: 100, tunings: [
      t("open-g", "Open G (5-string)", "G4 D3 G3 B3 D4", "The short fifth string is the high drone G, played by the thumb."),
      t("double-c", "Double C", "G4 C3 G3 C4 D4"),
    ],
  },
];

export const instrumentById = (id: string | null | undefined): Instrument | undefined => INSTRUMENTS.find((i) => i.id === id);

/** Frequency of a MIDI note for a given A4 reference. */
export const midiToHz = (midi: number, a4 = 440) => a4 * 2 ** ((midi - 69) / 12);

/** Common A4 reference pitches. */
export const A4_PRESETS = [
  { hz: 415, label: "415", note: "Baroque" },
  { hz: 432, label: "432", note: "Alternative" },
  { hz: 440, label: "440", note: "Standard" },
  { hz: 442, label: "442", note: "Orchestral" },
  { hz: 444, label: "444", note: "Bright orchestral" },
];
