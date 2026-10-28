import { degreeColour } from "../../theory/scales";
import type { Dot } from "../visuals";
import { section, type CourseStage } from "../model";
import { A, C, D, E, G, MINOR_SEMIS, PATH, chords, links, neck, path, task, text, toneDot, toneDots, visual } from "../build";

const MAJOR_TRIAD = [0, 4, 7], MINOR_TRIAD = [0, 3, 7], PENT = [0, 3, 5, 7, 10];
/** Dots for given string/fret pairs, named from `root`. */
const at = (root: number, pts: [number, number][], solfege = false): Dot[] => pts.map(([s, f]) => toneDot(s, f, root, { solfege }));
/** A two-note 5th: root and 5th, labelled with their note names. */
const fifth = (root: [number, number], five: [number, number], rootName: string, fiveName: string): Dot[] => [
  { string: root[0], fret: root[1], label: rootName, fill: degreeColour(0), big: true },
  { string: five[0], fret: five[1], label: fiveName, fill: degreeColour(4) },
];

export const STAGE_1: CourseStage = {
  slug: "1", label: "1", title: "Position 1",
  intro: "Stay in the open position in E minor and G major and learn everything that lives there: chords, triads, 5ths, arpeggios, the scale, and the paths between them.",
  sections: [
    section("chords", "Chords", "caged", [
      text(
        "Position 1 is the first four frets, open strings included. Everything in this stage happens here, in one key: E minor, and its relative major, G. They share the same seven notes, E F♯ G A B C D, and the same chords.",
        "The chords of the key that live in position 1 are the ones you already know: Em, Am, C, D and G. The sixth, Bm, needs a barre, so for now B7 stands in for it. B7 is an open chord and pulls back to Em even harder than Bm does (stage 5 explains why).",
      ),
      chords("The chords of E minor / G major that live in position 1.", ["Em", "Am", "C", "D", "G", "B7"]),
      task("Play Em Am B7 Em, then G C D G, four strums each. These two loops are the backbone of the whole stage."),
      links([{ href: "/theory/caged", label: "Chords in a key", note: "every chord of E minor and G major with its simplest shape" }]),
    ]),
    section("triads", "Triads", "triads", [
      text(
        "A triad is the three notes that make a chord: root, 3rd and 5th. A full open chord just doubles some of them. On the top three strings (G, B, e) each chord of the key is a small three-note shape, and the shapes sit right next to each other.",
        "Watch the arrows: going from one chord to the next, most notes stay where they are and only one or two move by a fret or two. That's why these chords sound good together, and it's the idea behind smooth chord changes in every style.",
      ),
      neck("Em on the top three strings: all open. R = root, ♭3 = minor 3rd, 5 = 5th.", 0, 4, at(E, [[3, 0], [4, 0], [5, 0]])),
      neck("C: from Em, only the B string moves, up one fret (B → C).", 0, 4, at(C, [[3, 0], [4, 1], [5, 0]]), { paths: [path(PATH.amber, [4, 0], [4, 1])] }),
      neck("Am: from C, only the G string moves (G → A).", 0, 4, at(A, [[3, 2], [4, 1], [5, 0]]), { paths: [path(PATH.amber, [3, 0], [3, 2])] }),
      neck("G: from Em, only the high e moves (E → G).", 0, 4, at(G, [[3, 0], [4, 0], [5, 3]]), { paths: [path(PATH.amber, [5, 0], [5, 3])] }),
      neck("D: a little shape of its own on frets 2 and 3.", 0, 4, at(D, [[3, 2], [4, 3], [5, 2]])),
      task("Strum only the top three strings: Em C Am C Em, then Em G D G. Keep the fingers that don't move pressed down."),
      links([{ href: "/theory/triads", label: "Triads on every string set", note: "the same three-note shapes all over the neck" }]),
    ]),
    section("fifths", "5ths & double stops", "fifths", [
      text(
        "Take just the root and the 5th of a chord, Do and Sol, and you have a 5th: a power chord in its smallest form. It's neither major nor minor, so it fits under almost anything. Playing two strings at once like this is called a double stop.",
        "In position 1 the root and 5th of E, A and D are an open string plus the 2nd fret of the next string up. G and C put the root on the 3rd fret and borrow an open string a string further on.",
      ),
      neck("E5, A5 and D5: open string to the 2nd fret of the next string. The arrow goes root → 5th.", 0, 3, [...fifth([0, 0], [1, 2], "E", "B"), ...fifth([1, 0], [2, 2], "A", "E"), ...fifth([2, 0], [3, 2], "D", "A")], {
        paths: [path(PATH.amber, [0, 0], [1, 2]), path(PATH.sky, [1, 0], [2, 2]), path(PATH.lime, [2, 0], [3, 2])],
        legend: [{ label: "root (Do)", colour: degreeColour(0) }, { label: "5th (Sol)", colour: degreeColour(4) }],
      }),
      neck("G5 and C5: the root on the 3rd fret, the 5th on an open string, skipping the string between.", 0, 3, [...fifth([0, 3], [2, 0], "G", "D"), ...fifth([1, 3], [3, 0], "C", "G")], {
        paths: [path(PATH.amber, [0, 3], [2, 0]), path(PATH.sky, [1, 3], [3, 0])],
        legend: [{ label: "root (Do)", colour: degreeColour(0) }, { label: "5th (Sol)", colour: degreeColour(4) }],
      }),
      task("Play E5 A5 D5 E5 with all downstrums, muting the other strings with the side of your hand. Then G5 C5 D5 G5."),
    ]),
    section("power-chords", "Power chords", "fifths", [
        text(
          "A power chord is just the root and its 5th, often with the octave on top: no 3rd, so it's neither major nor minor. That makes it the sound of rock, and it works under any melody.",
          "The shape never changes. Root on the low E or A string, 5th two frets up on the next string, octave beside it. Slide it to any fret and it names the chord by its root: E5 open, G5 at the 3rd fret, A5 at the 5th.",
        ),
        chords("One shape, three chords: G5, A5 and C5. Tap to hear.", [{ name: "G5", prefer: "power" }, { name: "A5", prefer: "power" }, { name: "C5", prefer: "power" }]),
        task("Play E5 G5 A5, then G5 B♭5 C5 with the same shape: the riff of Smoke on the Water (Deep Purple). Mute the other strings with the side of your hand."),
        links([{ href: "/theory/chords?q=power", label: "Power chords", note: "every power chord shape" }]),
      ]),
    section("arpeggios", "Arpeggios", "arpeggios", [
      text(
        "An arpeggio is a chord played one note at a time. In position 1 the arpeggio of Em is just Em's own notes, low to high: E G B, E G B, E. Follow the arrows, say the names, then let the notes ring together.",
        "Each note is labelled twice: by its role in the chord (R, ♭3, 5) and in solfège from the chord's root (Do, Me, Sol). Major chords have Mi instead of Me; that one note is the whole difference between happy and sad.",
      ),
      neck("Em arpeggio, low to high: Do Me Sol, Do Me Sol, Do.", 0, 3, toneDots(E, MINOR_TRIAD, 0, 3, { solfege: true }), {
        paths: [path(PATH.amber, [0, 0], [0, 3], [1, 2], [2, 2], [3, 0], [4, 0], [5, 0])],
      }),
      neck("Am arpeggio: starts on the open A string.", 0, 3, toneDots(A, MINOR_TRIAD, 0, 3, { solfege: true }), {
        paths: [path(PATH.sky, [1, 0], [1, 3], [2, 2], [3, 2], [4, 1], [5, 0])],
      }),
      neck("G arpeggio: major, so Mi instead of Me.", 0, 3, toneDots(G, MAJOR_TRIAD, 0, 3, { solfege: true }), {
        paths: [path(PATH.lime, [0, 3], [1, 2], [2, 0], [3, 0], [4, 0], [4, 3], [5, 3])],
      }),
      task("Hold the Em chord and pick it one string at a time, low to high and back. Do the same with Am and G. Then play the arpeggios without holding the chord shape."),
      links([{ href: "/theory/arpeggios", label: "Arpeggios explorer", note: "every chord's arpeggio, anywhere on the neck" }]),
    ]),
    section("one-four-five", "1 → 4 → 5 → 1 & the circle of fifths", "paths", [
      text(
        "Most songs are built on three chords: the one on the home note (1, Do), the one a 4th up (4, Fa), and the one a 5th up (5, Sol). In G major that's G → C → D → G. Here are their roots in position 1, and they're all under your hand.",
        "The 4 feels like a step away from home. The 5 feels like it has to come back. Play the roots on their own and you can already hear the story.",
      ),
      neck("G → C → D → G: the roots of 1, 4, 5 and back to 1 in G major.", 0, 3, at(G, [[0, 3], [1, 3], [2, 0], [3, 0]]).map((d) => toneDot(d.string, d.fret, G, { style: "number", solfege: true })), {
        paths: [path(PATH.amber, [0, 3], [1, 3], [2, 0], [3, 0])],
      }),
      text(
        "The same in E minor: Em → Am → Bm → Em. The 5 of E minor is B, and the chord on it is Bm, the first chord in this course that needs a barre (that's stage 2). Until then, play B7: open, easy, and it pulls home to Em even harder.",
      ),
      neck("E → A → B → E: 1, 4, 5, 1 in E minor.", 0, 3, [[0, 0], [1, 0], [1, 2], [2, 2]].map(([s, f]) => toneDot(s, f, E, { style: "number", solfege: true })), {
        paths: [path(PATH.sky, [0, 0], [1, 0], [1, 2], [2, 2])],
      }),
      chords("The minor loop with B7 standing in for Bm.", ["Em", "Am", "B7"]),
      text(
        "Why 4 and 5? Put the twelve notes in a circle, each a 5th above the last: C G D A E B… Every key's 1 sits between its 4 (one step anticlockwise) and its 5 (one step clockwise). Pick G on the circle below: C and D are its neighbours. That's the circle of fifths, and it's the map for the rest of this course.",
      ),
      visual({ kind: "circle", caption: "Pick a key: its 4 and 5 are its neighbours on the circle; its relative minor sits inside." }),
      task("Play G C D G and Em Am B7 Em, four strums each, saying Do Fa Sol Do as you change."),
    ]),
    section("pentatonic", "E minor pentatonic", "soloing", [
      text(
        "Leave two notes out of the E minor scale (F♯ and C) and you get the E minor pentatonic: E G A B D, five notes that never clash with any chord of the key. In position 1 it lies on the open strings and the 2nd and 3rd frets.",
        "Notice how much you already know: the root, ♭3 and 5 are the Em arpeggio from before. The pentatonic just adds two passing notes, the 4 (A) and the ♭7 (D).",
      ),
      neck("E minor pentatonic in position 1, up and down. R = E, ♭3 = G, 4 = A, 5 = B, ♭7 = D.", 0, 3, toneDots(E, PENT, 0, 3, { solfege: true }), {
        paths: [path(PATH.amber, [0, 0], [0, 3], [1, 0], [1, 2], [2, 0], [2, 2], [3, 0], [3, 2], [4, 0], [4, 3], [5, 0], [5, 3])],
      }),
      task("Play the scale up and down slowly, two notes per string. Then pick any three notes in a row and loop them as a little riff."),
      links([{ href: "/theory/scales", label: "Scales explorer", note: "E minor, its pentatonic and every mode" }]),
    ]),
    section("major-pentatonic", "G major pentatonic", "soloing", [
        text(
          "Here's a trick: E minor pentatonic and G major pentatonic are the same five notes, E G A B D. What changes is the note you treat as home. Over Em it sounds minor; over G C D, land on G and it sounds major and sunny.",
          "So you already know the shape. Play it over a G chord and aim for G, B and D, the notes of the chord, at the end of each phrase.",
        ),
        neck("G major pentatonic in position 1: the same notes as E minor pentatonic, now read from G.", 0, 3, toneDots(G, [0, 2, 4, 7, 9], 0, 3)),
        task("Loop G C D G and improvise with these notes. End every phrase on a G."),
      ]),
    section("soloing", "Soloing over Em ↔ Am", "soloing", [
      text(
        "Now use it. Over an Em ↔ Am backing, the whole pentatonic works, but the notes that sound most settled are the chord's own: land on E (or G, B) while Em is playing, and on A (or C, E) when it changes to Am.",
        "The arrows show two short ideas: one that ends on E for the Em bar, and one that ends on A for the Am bar. Start with just these, then make your own.",
      ),
      neck("Landing notes: end a phrase on E over Em (amber), on A over Am (blue).", 0, 3, toneDots(E, PENT, 0, 3), {
        paths: [path(PATH.amber, [2, 0], [2, 2]), path(PATH.sky, [3, 0], [3, 2])],
      }),
      task("Record yourself strumming Em for 2 bars, Am for 2 bars, for a minute. Play it back and solo over it with only the pentatonic, landing on E and A as the chords change."),
      links([{ href: "/theory/improv", label: "Improv: play over a groove", note: "a backing track to solo over" }]),
    ]),
    section("bends-and-slides", "Bends & slides", "soloing", [
        text(
          "A bend pushes the string across the fret to raise the note: a half step sounds like the next fret, a whole step like two frets up. Use three fingers on the string, and push from the wrist, not the fingertip.",
          "A slide takes you into a note from a fret or two below without picking again. Both make single notes sing, and both work best on notes of the chord.",
        ),
        task("In the E minor pentatonic, bend the D on the B string (3rd fret) up a whole step to E. Check it against the open high e: they should match."),
        task("Slide from the 2nd to the 4th fret on the G string, then improvise over Em with one slide or bend in every phrase."),
        links([{ href: "/theory/improv", label: "Improv: play over a groove" }]),
      ]),
    section("move-it", "Move it: G minor", "caged", [
      text(
        "Everything in position 1 is a shape, and shapes move. Slide the whole E minor scale shape up three frets and every note goes up three semitones: E becomes G, and the scale is now G minor.",
        "There's a catch, and it's the key to the next stage: the open strings were doing work. Three frets up, your first finger has to press where the open strings used to ring. That finger lying across the strings is a barre.",
      ),
      neck("E natural minor in position 1 (frets 0–3).", 0, 3, toneDots(E, MINOR_SEMIS, 0, 3)),
      neck("The same shape three frets up (frets 3–6) is G natural minor. Your first finger takes the place of the open strings.", 3, 6, toneDots(G, MINOR_SEMIS, 3, 6)),
      task("Play E minor up and down in position 1, then the same fingering from the 3rd fret. Same shape, new key: that's how every movable chord and scale works."),
      links([{ href: "/course/2/bm-barre", label: "Next stage: the Bm barre", note: "the same idea, with a chord" }]),
    ]),
  ],
};
