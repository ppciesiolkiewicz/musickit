/**
 * Backing tracks: drums, bass and chords played from a chord progression, in any key, mode and style, the tempo changed live.
 *
 *   model/   pure and tested, no audio: numerals → chords (tonal), the curated progressions, styles as data, the arranger
 *            (progression + style → notes in beats), the tempo map, the song (arrangements taking over on a bar line), settings
 *   audio/   Band (a scheduler on the AudioContext clock) and its voices (drums, synth bass, sampled keys)
 *   ui/      BackingTrack (the page's player), BackingPlayer (the same player for a band a host holds, as a plan does) and
 *            useBand (the band and, optionally, its save)
 *
 * Pure code imports `./model.ts` instead (the ids and data, no audio). Rules: `CLAUDE.md` in this folder.
 */
export { default as BackingTrack, BackingPlayer } from "./ui/BackingTrack";
export { useBand, type UseBandOptions } from "./ui/useBand";
export { TONICS, type BandSettings } from "./model/settings";
export { Band, type BandDeps, type BandSnapshot } from "./audio/band";
export { arrange, type Arrangement, type NoteEvent, type Part } from "./model/arrange";
export { PROGRESSIONS, MODES, findProgression, type Progression, type ModeId } from "./model/progressions";
export { STYLES, findStyle, type Style } from "./model/styles";
export { chordFromNumeral, chordsFromNumerals } from "./model/numerals";
