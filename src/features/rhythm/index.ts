/**
 * The rhythm game: hit notes on the beat with Space, a tap or a strum into the microphone. Pure parts (patterns and rounds, the
 * judge that grades hits, the strum detector) are tested on their own; mic.ts and clock.ts tie them to the audio clock.
 */
export { default as RhythmGame } from "./RhythmGame";
export { PATTERNS, buildRound, patternById, type Pattern, type Round } from "./patterns";
export { WINDOWS, createJudge, gradeFor, type Grade, type Judged, type Summary } from "./judge";
export { createOnsetDetector, type OnsetOptions } from "./onset";
