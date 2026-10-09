/**
 * The sound module: one engine for every sound in the app (the keyboards, the chord, scale and arpeggio pages,
 * the improvisation games and the looper's instruments).
 *
 *   engine/    AudioContext and output, sample loading, instruments, players (a voice with an instrument)
 *   playback/  timed notes: sequences, melodies, strums
 *   keyboard/  the piano component, MIDI input and the scale highlighting it needs
 */
export { getAudioContext, getOutputBus } from "./engine/context";
export { INSTRUMENTS, INSTRUMENT_OPTIONS, OSCILLATOR_ID } from "./engine/instruments";
export { createPlayer, type Player, type PlayerOptions, type Voice } from "./engine/player";
export { midiToHz, midiToName, noteToMidi, type NoteLike } from "./engine/notes";
export { preloadInstrument } from "./engine/samples";
export { getSharedPiano, playMelody, playSequence, silence, strum, type Step } from "./playback/sequence";
