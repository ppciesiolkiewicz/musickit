/**
 * Instruments shared by the looper and the theory pages: the Drone and the step sequencers (drum machine, bass synth).
 *
 *   model.ts     sound and maths, no React (the looper engine imports only this)
 *   drone/       the drone voice, its controls (DroneControls) and pictures (DroneScope)
 *   sequencer/   the Sequencer, its instruments and patterns, and StepGrid / PatternBar (the pattern editor)
 *   jam/         JamRig (drone, drums and bass on one clock, the bass in the drone's key), useJamRig; JamPage, the metronome-drone page (the full band and its loops)
 *   loops/       LoopDeck: the looper on its own, recording loops on a rig's clock (it follows a JamRig as a GridFollower); Loops, its rows
 *   click/       ClickTrack, a page's metronome click (the looper keeps its own, tied to its transport)
 *   band/        PracticeBand: the one play-along band, a rig drawn by a `view` and set up by a `config` (`VIEW_SHOW`, `restoreBand`):
 *                `full` the jam page's cards, `pocket` a page's settings bar (PocketLine and POCKET_BUTTON for a host's own line),
 *                `bar` one folded line (a practice-plan exercise), `inline` its parts started by the host's own control (the staff)
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
export { default as JamPage } from "./jam/JamPage";
export { default as Loops } from "./loops/LoopList";
export { default as useLoopDeck, APP_INPUT } from "./loops/useLoopDeck";
export { PocketLine, POCKET_BUTTON, POCKET_LIT, type PocketStatus } from "./band/views/pocketParts";
export { default as PracticeBand, type PracticeBandProps } from "./band/PracticeBand";
export type { BandPart } from "./band/config";
export { default as EffectControls } from "./effects/EffectControls";
