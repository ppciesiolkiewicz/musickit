/**
 * The backing tracks' ids and data, with no audio and no React: what pure code (the plan's tool parser) may import.
 * The players are in `./index.ts`.
 */
export { PROGRESSIONS, MODES, findProgression, type Progression, type ModeId } from "./model/progressions";
export { STYLES, findStyle, type Style } from "./model/styles";
export { TONICS, MAX_NUMERALS, cleanNumerals } from "./model/settings";
export { numeralOfChord } from "./model/numerals";
export { PARTS, type Part } from "./model/arrange";
export { MAX_BPM, MIN_BPM } from "./model/clock";
