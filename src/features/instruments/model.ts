/**
 * The instruments' sound and maths, with no React: what the looper engine (`src/lib/looper`) may import. UI and the page players are in
 * `./index.ts`.
 */
export * from "./drone/drone";
export * from "./click/click";
export * from "./sequencer/pattern";
export * from "./sequencer/grooves";
export { BASS, DEFAULT_KEY, DRONE, DRONE_ID, DRUMS, INSTRUMENTS, Sequencer, bassRootMidi, lanesIn, type Instrument, type Lane, type SequencerState } from "./sequencer/sequencer";
export * from "./effects/effects";
export * from "./effects/choices";
export { EffectChain } from "./effects/chain";
export { MAX_BPM, MIN_BPM } from "./jam/clock";
export type { GridFollower, GridHost } from "./jam/rig";
export { LoopDeck, type LoopDeckSnapshot } from "./loops/deck";
export { LOOP_CHANNELS, MAX_LOOP_EFFECTS, cleanConfig, type AppInput, type InputDevice, type LoopChannel, type LoopConfig, type LoopState, type LoopView } from "./loops/loops";
export { DEFAULT_LOOP_BARS, LOOP_BARS, MAX_LOOPS, clampBars, loopOffset } from "./loops/take";
export { VIEW_SHOW, applySetup, hasHostSetup, resolveShow, restoreBand, type BandConfig, type BandPart, type BandView, type ShowFlag } from "./band/config";
