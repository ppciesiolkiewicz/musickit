/**
 * The tuner: pitch detection (`usePitch` on any analyser), what a tuner is set to (instrument, tuning, A4), its settings controls and
 * its meter (`TunerMeter`, "page" or "compact"). Shared by the /tuner page (`Tuner`: the meter with its own microphone, input picker,
 * strings and Start; the teacher studio's Tuner widget shows the same) and the looper's tuner widget (the compact meter on the engine's analyser, no microphone of its own). Imports only the theory tunings, the sound feature, the shared components and (lazily, for CREPE) tfjs.
 */
export { FRAME_MS, createSmoother, detectPitch, hzToNote, nearestString, type Pitch, type NoteReading } from "./pitch";
export { DEFAULT_CHOICE, TUNER_INSTRUMENTS, clampA4, readHz, resolveChoice, sanitiseChoice, withInstrument, type TunerChoice, type TunerRead } from "./choice";
export { default as TunerSettings, A4Field } from "./TunerSettings";
export { useTunerChoice } from "./useTunerChoice";
export { createDetector } from "./detector";
export { default as Needle } from "./Needle";
export { default as TunerMeter, readingColour } from "./TunerMeter";
export { usePitch } from "./usePitch";
export { default as Tuner, type ExternalInput } from "./Tuner";
export { default as TunerButton } from "./TunerButton";
