/**
 * A full backing track to play or sing over: drums, bass and keys playing a chord progression in a style, looping until
 * stopped. It shows the chords as boxes (the one playing lit), the key's scale, and a mixer, so the student can mute a part
 * to play it themselves. The student can change the progression, key, style and tempo. Use it to improvise or comp over a
 * whole band (a 12-bar blues shuffle, a minor vamp, a jazz ii-V-I). For hearing a progression on the guitar's own shapes
 * use guitar-play-along; for chords alone under a singer, chord-backing; for a beat or a drone without chords, backing-band.
 *
 * Example: `{ "type": "backing-track", "progression": "blues", "key": "a", "style": "shuffle", "bpm": 90 }` plays a
 * 12-bar blues in A as a shuffle: A7 D7 A7 A7 D7 D7 A7 A7 E7 D7 A7 E7
 * @component backing-track basic
 */
export interface BackingTrackProps {
  /** the progression, by id. Major: "pop" (I V vi IV), "fifties" (I vi IV V), "three-chord" (I I IV V), "canon" (I V vi iii IV I IV V), "ii-v-i" (ii7 V7 Imaj7 Imaj7), "turnaround" (Imaj7 vi7 ii7 V7), "blues" (12-bar: I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7), "bossa" (Imaj7 Imaj7 ii7 V7), "waltz" (I IV V7 I, 3/4), "reggae" (I IV). Minor: "andalusian" (i bVII bVI V), "minor-pop" (i bVI bIII bVII), "minor-ii-v" (iiø7 V7 i7 i7), "minor-blues" (12-bar: i7 iv7 i7 i7 iv7 iv7 i7 i7 bVI7 V7 i7 V7), "aeolian" (i bVI bVII i). Modes: "dorian" (i7 IV7), "phrygian" (i bII), "lydian" (Imaj7 II), "mixolydian" (I bVII IV I) */
  progression: string;
  /** the key's root note, the I (or the i of a minor or modal progression): "a" with "minor-blues" is A minor; "c", "f-sharp", "b-flat" */
  key: string;
  /** how the band plays it (default: the progression's own): "pop", "rock", "ballad", "swing", "shuffle", "bossa", "funk", "reggae", "waltz" (3/4) */
  style?: string;
  /** tempo, 40-220 (default: the style's usual tempo) */
  bpm?: number;
}
