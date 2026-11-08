/**
 * Backing tracks: drums, bass and chords played from a chord progression, in any key, mode and style, the tempo changed live.
 *
 *   model/   pure and tested, no audio: numerals → chords (tonal), the curated progressions, styles as data, the arranger
 *            (progression + style → notes in beats), the tempo map, the song (arrangements taking over on a bar line), settings
 *   audio/   Band (a scheduler on the AudioContext clock) and its voices (drums, synth bass, sampled keys)
 *   ui/      BackingTrack (the page's player) and useBand (the band, its save and the audio focus)
 *
 * Rules: `CLAUDE.md` in this folder.
 */
export { default as BackingTrack } from "./ui/BackingTrack";
export { Band, type BandDeps, type BandSnapshot } from "./audio/band";
export { arrange, type Arrangement, type NoteEvent, type Part } from "./model/arrange";
export { PROGRESSIONS, MODES, type Progression, type ModeId } from "./model/progressions";
export { STYLES, type Style } from "./model/styles";
export { chordFromNumeral, chordsFromNumerals } from "./model/numerals";
