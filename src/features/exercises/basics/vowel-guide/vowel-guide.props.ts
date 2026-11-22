/**
 * Vowels on a held note, with the mic: a plain drawn mouth shows the shape of the vowel to sing ("ah", "eh", "ee", "oh",
 * "oo") and how that shape opens a little, the wide vowels narrowing and the round ones opening out, as the note climbs.
 * The note plays, the student holds it on the vowel shown, and a ring round the mouth fills over `seconds` while the
 * voice is on the note; then the mouth moves to the next vowel, and after the last vowel to the next note up. Off the
 * note the ring drains slowly; a breath pauses it. The mic checks the pitch only: the tool cannot hear which vowel is
 * sung, so the text never says the app checks the vowel. The notes are placed in the student's own range, never near
 * its top. No key, no score. A singing exercise, for keeping a note steady while the vowel changes.
 * @component vowel-guide basic
 */
export interface VowelGuideProps {
  /** how far the notes climb, in one word; it sets `climb` where you leave it out. "new" and "beginner": one-note, every vowel on one easy note low in the voice. "intermediate": to-break, four notes from that easy note up to the first break. "advanced": across-break, four notes from the first break up to the second, where head voice starts */
  level?: "new" | "beginner" | "intermediate" | "advanced";
  /** the notes: "one-note" (default; one easy note a 5th over the bottom of the range, a tenor's G3), "to-break" (from it up to the first break: a tenor's G3, A3, C4, D4) or "across-break" (from the first break up to the second: a tenor's D4, E4, F4, G4). Every vowel is sung on a note before the next note up */
  climb?: "one-note" | "to-break" | "across-break";
  /** the vowels, in the order sung on each note; default all five: ["ah", "eh", "ee", "oh", "oo"]. Fewer make a shorter drill: ["ee", "oo"] */
  vowels?: ("ah" | "eh" | "ee" | "oh" | "oo")[];
  /** how long each vowel is held, 2-6 seconds; default 3 */
  seconds?: number;
  /** voice range; default "tenor" */
  voice?: "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";
}
