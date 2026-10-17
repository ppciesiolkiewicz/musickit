/**
 * Instruments shared by the looper and the theory pages: the Drone and the step sequencers (drum machine, bass synth).
 *
 *   model.ts     sound and maths, no React (the looper engine imports only this)
 *   drone/       the drone voice, its controls (DroneControls) and pictures (DroneScope)
 *   sequencer/   the Sequencer, its instruments and patterns, and StepGrid / PatternBar (the pattern editor)
 *   jam/         Jam: drone, drums and bass on one clock for a page, the bass in the drone's key
 *   click/       ClickTrack, a page's metronome click (the looper keeps its own, tied to its transport)
 *   pocket/      PocketTools: a one-line metronome and drone for a page's settings bar
 *   effects/     the effects (reverb, delay, the NAM amp slot…) of the looper and the jam's loop inputs, and their controls
 *
 * The controls take values and callbacks and own no audio, so each host decides how it starts and stops: the looper from its stage
 * circle on the beat (no play button in its panels), a page from its own play buttons. Imports only the sound feature and shared
 * components; never the looper.
 */
export * from "./model";
export { default as DroneControls } from "./drone/DroneControls";
export { default as DroneScope } from "./drone/DroneScope";
export { default as StepGrid, PatternBar } from "./sequencer/StepGrid";
export { default as PartLevel } from "./sequencer/PartLevel";
export { default as Jam } from "./jam/Jam";
export { default as PocketTools } from "./pocket/PocketTools";
export { default as EffectControls } from "./effects/EffectControls";
