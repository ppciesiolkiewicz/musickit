/**
 * The tuner: pitch detection, what a tuner is set to (instrument, tuning, A4) and its settings controls. Shared by the /tuner page
 * and the looper's tuner widget. Imports only the theory tunings, the sound feature and the shared components.
 */
export { detectPitch, hzToNote, nearestString, type Pitch, type NoteReading } from "./pitch";
export { DEFAULT_CHOICE, TUNER_INSTRUMENTS, clampA4, readHz, resolveChoice, sanitiseChoice, withInstrument, type TunerChoice, type TunerRead } from "./choice";
export { default as TunerSettings, A4Field } from "./TunerSettings";
export { useTunerChoice } from "./useTunerChoice";
export { createSmoother } from "./smooth";
export { FRAME_MS, useThrottled } from "./useThrottled";
