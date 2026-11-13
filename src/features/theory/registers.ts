import { VOICES, type Voice } from "./singing";

/**
 * Where each voice type typically changes register, as MIDI notes. Chest voice runs up to the first break (`primo`, the
 * primo passaggio); between the two breaks is the middle (mixed) voice; head voice starts at the second break (`secondo`).
 * Typical values for an untrained voice of each type, after Richard Miller's passaggio tables: every voice differs by a
 * few semitones, so tools use them for where an exercise sits, never to judge a singer.
 */
export interface Registers {
  /** the first break: chest voice up to here */
  primo: number;
  /** the second break: head voice from here up */
  secondo: number;
}

export const REGISTERS: Record<Voice, Registers> = {
  soprano: { primo: 64, secondo: 78 }, // E4, F♯5
  mezzo: { primo: 64, secondo: 76 }, // E4, E5
  alto: { primo: 65, secondo: 74 }, // F4, D5
  tenor: { primo: 62, secondo: 67 }, // D4, G4
  baritone: { primo: 59, secondo: 64 }, // B3, E4
  bass: { primo: 57, secondo: 62 }, // A3, D4
};

/** The voice's range and registers together: low, high (its comfortable two octaves), primo and secondo. */
export const voiceMap = (voice: Voice) => ({ ...VOICES[voice], ...REGISTERS[voice] });
