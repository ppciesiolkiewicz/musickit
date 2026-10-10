/**
 * The sound module: one engine for every sound in the app (the keyboards, the chord, scale and arpeggio pages,
 * the improvisation games and the looper's instruments).
 *
 *   engine/    AudioContext and output, sample loading, instruments, players (a voice with an instrument)
 *   playback/  timed notes: sequences, melodies, strums
 *   keyboard/  the two keyboards that play it: Piano (chromatic, MIDI input, scale highlighting) and ScalePiano
 *              (the computer keys locked to a key and scale). Both play the sampled instruments by default.
 */
export { getAudioContext, getOutputBus } from "./engine/context";
export { INSTRUMENTS, INSTRUMENT_OPTIONS, OSCILLATOR_ID } from "./engine/instruments";
export { allInstrumentOptions } from "./engine/instruments";
export { useInstrumentOptions } from "./engine/useInstrumentOptions";
export { registerRuntimeInstrument, replaceRuntimeInstruments, unregisterRuntimeInstrument, type RuntimeInstrument } from "./engine/runtime";
export { createPlayer, type Player, type PlayerOptions, type Voice } from "./engine/player";
export { midiToHz, midiToName, noteToMidi, type NoteLike } from "./engine/notes";
export { preloadInstrument } from "./engine/samples";
export { getSharedPiano, playMelody, playSequence, silence, strum, type Step } from "./playback/sequence";
export { default as Piano } from "./keyboard/Piano";
export { default as ScalePiano, type ScalePianoProps, type ScaleVoice } from "./keyboard/ScalePiano";
export { SCALES, NOTE_NAMES, KEY_ROWS, MIN_OCTAVE, MAX_OCTAVE, buildKeyMap, clampState as clampScalePiano, scalePitchClasses, type ScalePianoState, type KeyNote } from "./keyboard/scaleKeys";
