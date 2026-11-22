/**
 * The rhythm game: hit notes on the beat with Space, a tap or a strum into the microphone. Pure parts (patterns and rounds, the
 * judge that grades hits, the strum detector) are tested on their own; mic.ts and clock.ts tie them to the audio clock.
 * The plan draws it as the `clap-along` tool (`src/features/exercises/basics/clap-along`): `RhythmGame` with `bare` and
 * the pattern, tempo and bars as props. The plan's model imports `./patterns` alone, which is pure.
 */
export { default as RhythmGame, type RhythmGameProps, type RhythmInput } from "./RhythmGame";
export { MAX_BARS, MAX_BPM, MIN_BPM, PATTERNS, buildRound, isPatternId, patternById, type Pattern, type Round } from "./patterns";
export { WINDOWS, createJudge, gradeFor, type Grade, type Judged, type Summary } from "./judge";
export { createOnsetDetector, type OnsetOptions } from "./onset";
