import type { Dot } from "../visuals";
import { section, type CourseStage } from "../model";
import { C, D, E, G, PATH, chords, links, neck, path, songs, task, text, toneDot, toneDots } from "../build";

/** A chord from its fret list, low E to high e (null = not played), as dots named from its root. */
const shape = (root: number, frets: (number | null)[]): Dot[] => frets.flatMap((f, s) => (f === null ? [] : [toneDot(s, f, root)]));

export const STAGE_3: CourseStage = {
  slug: "3", label: "7", title: "Position 1 flavours",
  intro: "Back home in position 1, with colour: 6, 7, sus and add9 chords on the same paths you already know.",
  sections: [
    section("six-chords", "6 chords", "colour", [
      text(
        "Add the 6th note of the scale to a chord and it turns sweet and old-fashioned: the sound of swing, bossa nova and the last chord of a lot of 50s songs. In position 1 it's often one finger off the chord you know: G6 is G with the high e left open, C6 is C with the G string's A added on top.",
        "The 6th is La in the chord's own solfège. Labels below: R, 3 (or ♭3), 5 and 6.",
      ),
      neck("G6: 3 2 0 0 0 0. The open high e is the 6th (E).", 0, 3, shape(G, [3, 2, 0, 0, 0, 0])),
      neck("C6: x 3 2 2 1 0. The G string's 2nd fret adds the 6th (A).", 0, 3, shape(C, [null, 3, 2, 2, 1, 0])),
      neck("Em6: 0 2 2 0 2 0. The B string's 2nd fret is the 6th (C♯), the note from E Dorian (stage 9).", 0, 3, shape(E, [0, 2, 2, 0, 2, 0])),
      neck("D6: x x 0 2 0 2. Open B string as the 6th.", 0, 3, shape(D, [null, null, 0, 2, 0, 2])),
      task("Play G G6 G G6, then end a G C D G loop on G6 instead of G. Hear how it sounds finished, but with a smile."),
    ]),
    section("sevenths", "maj7 & 7", "colour", [
      text(
        "Seventh chords add the 7th note above the root. There are two kinds you'll meet here. A maj7 adds the note one fret below the root (Ti): dreamy, soft. A 7 (dominant 7th) adds the note two frets below (Te): bluesy, restless, it wants to move on.",
        "In the key of G, only D gets a dominant 7th naturally (D7, the 5 chord); G and C get maj7s; Em and Am get minor 7ths (m7), which add the same Te to a minor chord. B7 is the borrowed one you met in stage 5.",
      ),
      chords("The 7th chords of the key in position 1, plus B7.", ["Gmaj7", "Cmaj7", "D7", "Em7", "Am7", "B7"]),
      task("Play Gmaj7 Cmaj7 Gmaj7 Cmaj7, then Em7 Am7 D7 Gmaj7. Compare with the plain chords: same changes, new colour."),
    ]),
    section("twelve-bar", "The 12-bar blues", "colour", [
        text(
          "Twelve bars, three chords, and the shape of a thousand songs. In E: four bars of E7, two of A7, two of E7, then B7 A7 E7 and a turnaround. Every chord is a 7th, which is what gives the blues its pull.",
          "Count the bars out loud the first few times. After that, your ear will tell you when to change.",
        ),
        chords("The blues 7ths in position 1. Tap to hear.", ["E7", "A7", "B7", "D7"]),
        songs(
          { title: "Hound Dog", artist: "Elvis Presley (12-bar blues in E)", chords: ["E7", "A7", "B7"], progression: "E7 ×4 · A7 ×2 E7 ×2 · B7 A7 E7 ×2" },
          { title: "12-bar blues in A", artist: "the blues form (Johnny B. Goode and many more)", chords: ["A7", "D7", "E7"], progression: "A7 ×4 · D7 ×2 A7 ×2 · E7 D7 A7 E7" },
        ),
      ]),
    section("blues-solo", "Soloing over a 12-bar", "soloing", [
        text(
          "The E minor pentatonic you already know is the blues scale's backbone. Over a 12-bar in E it never sounds wrong, and it sounds best when your phrases end on E, or on the root of the chord under you.",
          "Short phrases and space between them beat a stream of notes. Play two bars, rest two bars.",
        ),
        neck("E minor pentatonic in position 1, over a 12-bar in E.", 0, 3, toneDots(E, [0, 3, 5, 7, 10], 0, 3)),
        task("Loop the 12-bar in E. Play only on the E7 bars, and rest on A7 and B7. Then fill everything."),
        links([{ href: "/theory/improv", label: "Improv: play over a groove" }]),
      ]),
    section("sus-add9", "sus & add9", "colour", [
      text(
        "A sus chord swaps the 3rd for its neighbour: the 2nd (sus2) or the 4th (sus4). Without the 3rd it's neither major nor minor, just open and waiting, and it usually goes back to the plain chord. An add9 keeps the 3rd and adds the 2nd an octave up: Cadd9 is the shimmering C of countless acoustic songs.",
        "Most of these are one finger away from the open chord you know, which makes them easy to drop into songs: D Dsus4 D, A Asus2 A, G Cadd9.",
      ),
      chords("sus and add9 chords in position 1.", ["Dsus2", "Dsus4", "Asus2", "Cadd9", "Esus4"]),
      task("Play D Dsus4 D Dsus2 D with the island strum, moving only one finger. Then G Cadd9 G Cadd9."),
    ]),
    section("colour-songs", "Songs with colour chords", "colour", [
        text("Songs where the colour chords carry the sound. Each needs only one finger moved from a chord you know."),
        songs(
          { title: "Good Riddance (Time of Your Life)", artist: "Green Day", chords: ["G", "Cadd9", "D", "Em", "C"], progression: "G Cadd9 D · Em D C G" },
          { title: "Free Fallin'", artist: "Tom Petty", chords: ["D", "Dsus4", "A"], progression: "D Dsus4 D A" },
        ),
        task("One minute each: C ↔ Fmaj7, Em ↔ B7, G ↔ Cadd9."),
      ]),
    section("hearing-sevenths", "Hearing 7th chords", "three-views", [
        text(
          "A maj7 sounds dreamy, a 7 sounds bluesy and wants to move, an m7 sounds soft and minor. The difference is the 7th on top: a half step below the root, or a whole step.",
          "Play Cmaj7 then C7, and Am7 then Am, and listen for the top note.",
        ),
        task("Play Gmaj7, G7 and Em7 in a random order with your eyes closed, then name each by its sound."),
        links([], [{ href: "/theory/ears?kind=chord", label: "Chord quality with 7ths" }]),
      ]),
    section("colour-paths", "The same paths with colour", "paths", [
      text(
        "The 1 → 4 → 5 → 1 path from stage 5 hasn't changed: the roots still go G → C → D → G. Only the colour on top is new. Play Gmaj7 → Cmaj7 → D7 → G and the 7ths make a little tune of their own on the top strings.",
        "Follow the blue arrows: Gmaj7's F♯ drops to Cmaj7's B, then climbs to D7's C, which pulls down to G's B. That C → B is the sound of D7 going home.",
      ),
      neck("Roots (amber): G → C → D → G. The 7ths on top (blue): F♯ → B → C, which resolves down to B in G.", 0, 3, [
        ...[[0, 3], [1, 3], [2, 0], [3, 0]].map(([s, f]) => toneDot(s, f, G, { style: "number", solfege: true })),
        { ...toneDot(5, 2, G), label: "F♯" }, { ...toneDot(4, 0, C), label: "B" }, { ...toneDot(4, 1, D), label: "C" },
      ], {
        paths: [path(PATH.amber, [0, 3], [1, 3], [2, 0], [3, 0]), path(PATH.sky, [5, 2], [4, 0], [4, 1])],
        legend: [{ label: "roots: 1 4 5 1", colour: PATH.amber }, { label: "7ths: F♯ B C", colour: PATH.sky }],
      }),
      chords("The colour version of 1 → 4 → 5 → 1.", ["Gmaj7", "Cmaj7", "D7", "G"]),
      task("Play the loop slowly and sing the top note of each chord: F♯, B, C, B. Then the plain G C D G for comparison."),
    ]),
  ],
};
