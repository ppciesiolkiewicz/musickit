/**
 * A whole song's chords and form as a chart, played by the band: each section (verse, chorus, bridge) under its name,
 * one box per bar, four bars to a row, every change on a bar line. After one bar of count-in clicks the drums, bass and
 * keys play the form from the top, and the bar playing is lit under its section, so the student always sees where they
 * are in the song. Use it when the form is the lesson: playing a song's chords through with no gaps, following a verse
 * and a chorus, hearing where the chords change. Write each section once in `sections` and the order they are played in
 * as `form`. Leave "keys" out of `parts` when the student plays the chords themselves. With `hide` the chord names
 * start hidden, for working a song's chords out by ear. A chord the band has no notes for stays on the chart, marked:
 * the band rests in its bar and the chart says so. For a short progression that loops, use backing-track; for strumming
 * with the strums shown, strum-along.
 *
 * Write a progression of your own. Never a real song: not its title, its words, or its chords presented as that song.
 *
 * Example: `{ "type": "song-chart", "key": "g", "bpm": 90, "sections": [{ "name": "Verse", "bars": ["G", "G", "C", "G"] }, { "name": "Chorus", "bars": ["C", "D", "G", "Em"] }], "form": ["Verse", "Verse", "Chorus", "Verse"], "repeat": 2 }`
 * plays 16 bars twice: verse, verse, chorus, verse.
 * @component song-chart basic
 */
export interface SongChartProps {
  /** the key's root note, the I (the i of a song in a minor key): "g", "a", "f-sharp", "b-flat". It may be left out: the first chord's root */
  key?: string;
  /** the sections, each written once, up to 8: a `name` the chart shows ("Verse", "Chorus", "Bridge", "Intro") and its `bars`, up to 16, one chord a bar ("G"), or two chords with a space between them for a change in the middle of the bar ("C G"); repeat a chord to hold it longer: ["G", "G", "C", "D"] */
  sections: { name: string; bars: string[] }[];
  /** the order the sections are played in, by name, up to 24 sections and 96 bars: ["Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus"]. Absent: the sections as written, once each */
  form?: string[];
  /** times through the whole form, 1-8; the band then stops by itself. Absent: the form goes round until the student stops it */
  repeat?: number;
  /** how the band plays it (default "pop"): "pop", "rock", "ballad", "swing", "shuffle", "bossa", "funk", "reggae", "waltz" (3/4: one chord a bar) */
  style?: string;
  /** tempo, 40-220 (default: the style's usual tempo) */
  bpm?: number;
  /**
   * the parts offered, "drums", "bass", "keys", each with how it starts: "on" (playing, the student can mute it), "off" (muted,
   * the student can unmute it), "always" (playing, no mute). A part left out is not played and has no row. Absent: all three
   * "on". A student playing the chords leaves "keys" out; one working the chords out by ear keeps "keys": "always"
   */
  parts?: { drums?: "on" | "off" | "always"; bass?: "on" | "off" | "always"; keys?: "on" | "off" | "always" };
  /** true: the chord names start hidden and every bar shows only its number, so the student listens for the chords; the Show chords button on the tool shows them to check. Default: the chords are shown */
  hide?: boolean;
}
