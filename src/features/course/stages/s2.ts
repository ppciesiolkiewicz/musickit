import { section, type CourseStage } from "../model";
import { A, B, G, MAJOR_SEMIS, PATH, chords, links, neck, path, task, text, toneDot, toneDots } from "../build";

const MAJOR_TRIAD = [0, 4, 7], MINOR_TRIAD = [0, 3, 7];
const AM_OPEN: [number, number][] = [[1, 0], [2, 2], [3, 2], [4, 1], [5, 0]];
const BM_BARRE: [number, number][] = [[1, 2], [2, 4], [3, 4], [4, 3], [5, 2]];

export const STAGE_2: CourseStage = {
  slug: "2", label: "2", title: "Position 2",
  intro: "Frets 2 to 5. Bm is the hard chord of the key: here is the barre, the easier ways round it, and the drop 3 chords that build the hand for barres.",
  sections: [
    section("bm-barre", "The Bm barre", "barre-drop3", [
      text(
        "Bm is the 5 of E minor, and the one chord of the key that won't play in the open position. Its shape is your Am, moved up two frets, exactly like the G minor scale was E minor moved up three. Your first finger lies across the strings at the 2nd fret and does the job the open strings did.",
        "Barres are hard. Most players take weeks before every string rings, and it hurts a little at first. That's normal. Keep the first finger straight and close to the fret, roll it slightly onto its bony side, and let the arm's weight do the pressing rather than squeezing with the thumb.",
      ),
      neck("Am (outlined) moved up two frets is Bm (filled). Every finger moves two frets; the first finger barres where the open strings were.", 0, 5, [
        ...AM_OPEN.map(([s, f]) => ({ ...toneDot(s, f, A), outline: true })),
        ...BM_BARRE.map(([s, f]) => toneDot(s, f, B)),
      ], { paths: AM_OPEN.map(([s, f]) => path(PATH.amber, [s, f], [s, f + 2])) }),
      chords("Bm as an A-shape barre at the 2nd fret. Tap to hear.", [{ name: "Bm", prefer: "barre", tag: "barre" }]),
      task("Don't wait for it to be perfect. Play Em Am Bm Em slowly every day for a minute; pick each string of Bm to find the one that's buzzing, and fix only that one."),
    ]),
    section("easier-bm", "Easier Bm", "barre-drop3", [
      text(
        "While the barre is coming along, there are easier chords that do Bm's job. Bm7 adds one note (A) and lets two strings ring open, so no barre at all. B7 is the open chord you already used in stage 1. And the small Bm on the top four strings is the real Bm in miniature, with no barre either.",
        "Use whichever sounds right in the song. Bm7 is softer, B7 pulls harder towards Em, the small Bm is the real Bm in miniature.",
      ),
      chords("Bm7 and B7: no barre needed.", ["Bm7", "B7"]),
      neck("The small Bm (x x 4 4 3 2): 1st finger on the high e at the 2nd fret, 2nd on the B at the 3rd, 3rd and 4th on the G and D at the 4th.", 0, 5, [[2, 4], [3, 4], [4, 3], [5, 2]].map(([s, f]) => toneDot(s, f, B))),
      task("Play Em Am Bm7 Em, then Em Am B7 Em, then with the small Bm. Which one sounds best to you?"),
    ]),
    section("drop-3", "Drop 3 chords", "barre-drop3", [
      text(
        "Here's a way into the neck that's easier than barres and sounds great: drop 3 chords, the four-note shapes of jazz and bossa nova. The root sits on the low E string, the A string is muted, and the 7th, 3rd and 5th go on the D, G and B strings. No barre, just four fingers.",
        "You already know one: the open Em7 (0 x 0 0 0 x) is a drop 3 shape. Slide the same kind of shape up the 6th string and you get the 7th chords of the key one after another. They train the finger strength and independence a barre needs, so they make barres easier too.",
        "Mute the A string with the underside of the finger on the low E. That muted string is part of the sound.",
      ),
      chords("Drop 3 chords of E minor / G major on the 6th string, from the open Em7 up to Am7 at the 5th fret.", [
        { name: "Em7", voicing: "drop 3", rootString: 6 }, { name: "F♯m7♭5", voicing: "drop 3", rootString: 6 },
        { name: "Gmaj7", voicing: "drop 3", rootString: 6 }, { name: "G7", voicing: "drop 3", rootString: 6 },
        { name: "Am7", voicing: "drop 3", rootString: 6 },
      ]),
      text(
        "Their cousins have the root on the A string and no muted string: Am7 (x 0 2 0 1 x), Bm7 (x 2 4 2 3 x) and Cmaj7 (x 3 5 4 5 x). These are drop 2 voicings, just as easy and just as bossa. Mix both families and you can play the whole key in positions 1 and 2 without a single barre.",
      ),
      chords("The drop 2 cousins, root on the A string.", [
        { name: "Am7", voicing: "drop 3", rootString: 5, tag: "drop 2" }, { name: "Bm7", voicing: "drop 3", rootString: 5, tag: "drop 2" },
        { name: "Cmaj7", voicing: "drop 3", rootString: 5, tag: "drop 2" },
      ]),
      task("Climb the 6th string: Em7 F♯m7♭5 Gmaj7 Am7 and back down, thumb on the root, fingers plucking the other three notes together. Then Gmaj7 Cmaj7 Bm7 Em7 mixing both families, with a gentle bossa feel."),
    ]),
    section("arpeggios", "Arpeggios in position 2", "arpeggios", [
      text(
        "Position 2 has its own arpeggios. Bm's sits right inside the barre shape. G's comes from the E-shaped G barre at the 3rd fret, which is CAGED's E shape (stage 4 has the full story).",
      ),
      neck("Bm arpeggio in position 2, from the root on the A string.", 2, 5, toneDots(B, MINOR_TRIAD, 2, 5, { solfege: true }), {
        paths: [path(PATH.amber, [1, 2], [1, 5], [2, 4], [3, 4], [4, 3], [5, 2])],
      }),
      neck("G arpeggio from the E shape at the 3rd fret.", 2, 5, toneDots(G, MAJOR_TRIAD, 2, 5, { solfege: true }), {
        paths: [path(PATH.sky, [0, 3], [1, 2], [1, 5], [2, 5], [3, 4], [4, 3], [5, 3])],
      }),
      task("Play the Bm arpeggio, then Em's from stage 1, back and forth: the 5 to the 1 of E minor, one note at a time."),
    ]),
    section("joining", "Joining positions 1 and 2", "box-2", [
      text(
        "Positions 1 and 2 overlap on frets 2 and 3, so the G major scale runs straight from one into the other. Follow the arrows: start in the open position on the D string, slide your hand up, and finish in position 2.",
        "This is how the neck stops being separate boxes: the same notes, reached from a different spot. Stage 4 does the same with the other three positions.",
      ),
      neck("G major across positions 1 and 2. Position 2 (frets 2–5) is shaded.", 0, 5, toneDots(G, MAJOR_SEMIS, 0, 5), {
        window: { from: 2, to: 5 },
        paths: [path(PATH.amber, [2, 0], [2, 2], [2, 4], [2, 5], [3, 2], [3, 4], [3, 5])],
      }),
      task("Play the path up and back. Then improvise with the E minor pentatonic in position 1 and let one phrase wander up into position 2."),
      links([{ href: "/theory/caged", label: "CAGED", note: "how the positions join across the whole neck" }]),
    ]),
  ],
};
