/**
 * Sing the guitar's open strings to learn their pitches for tuning by ear, on a staff with the microphone, moved into
 * the voice's range: play it to hear the notes, tap one, then sing along a bar. Three drills: the strings one by one,
 * neighbouring pairs (the intervals a guitar is tuned by), and the 5th-fret unisons (the lower string's 5th fret, the
 * 4th on G, is the next open string).
 * @component string-singer basic
 */
export interface StringSingerProps {
  /** "strings" (default): E A D G B E up and back down; "pairs": each two neighbouring strings, low then high (fourths, a major third G to B); "fifth-fret": the lower string's 5th fret then the next open string, the same note */
  drill?: "strings" | "pairs" | "fifth-fret";
  /** voice range; default "tenor" */
  voice?: "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";
}
