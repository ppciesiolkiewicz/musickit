/**
 * A warm-up for the voice with the mic: the student holds one easy sound (a hum, "oo" or "ee") in one part of their
 * voice while a ball on a hill shows it. "low": the ball rolls down into the hollow as the voice goes low; "high": it
 * climbs to the top as the voice goes up, light and easy; "middle": it rests in a valley between two marks. Held there,
 * a ring fills over `seconds`; each full ring is one hold, then a breath, `reps` holds in all. Off the place, sung, the
 * ring drains slowly; a breath pauses it. Play note sounds the note at the place's edge. No key and no notes to read.
 * A singing exercise, for a warm-up or for finding the low and the light high voice.
 * @component voice-hill basic
 */
export interface VoiceHillProps {
  /** where in the voice: "low" (default; the bottom of the voice: each hold a semitone lower, a tenor's E3 and under down to C3 and under, the new note played in the breath between), "middle" (a few notes over it, a tenor's F3 to B♭3) or "high" (head voice, over the second break: a tenor's G4 and over; keep it light) */
  where?: "low" | "middle" | "high";
  /** the sound to hold: "hum" (default), "oo" or "ee". "oo" suits the low and the high voice, a hum any place */
  sound?: "hum" | "oo" | "ee";
  /** how long each hold lasts, 2-10 seconds; default 3 */
  seconds?: number;
  /** how many holds, 1-8; default 5 */
  reps?: number;
  /** voice range; default "tenor" */
  voice?: "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";
}
