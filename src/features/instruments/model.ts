/**
 * The instruments' sound and maths, with no React: what the looper engine (`src/lib/looper`) may import. UI and the page players are in
 * `./index.ts`.
 */
export * from "./drone/drone";
export * from "./click/click";
export * from "./sequencer/pattern";
export { BASS, DEFAULT_KEY, DRONE, DRONE_ID, DRUMS, INSTRUMENTS, Sequencer, bassRootMidi, lanesIn, type Instrument, type Lane, type SequencerState } from "./sequencer/sequencer";
export * from "./effects/effects";
export * from "./effects/choices";
export { EffectChain } from "./effects/chain";
export { MAX_BPM, MIN_BPM } from "./jam/clock";
