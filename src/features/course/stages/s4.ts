import { section, type CourseStage } from "../model";
import { naturalDots, type Dot } from "../visuals";
import { C, D, E, G, MAJOR_SEMIS, PATH, links, melody, neck, path, task, text, toneDot, toneDots, tune } from "../build";

const MAJOR_TRIAD = [0, 4, 7];
const at = (root: number, pts: [number, number][]): Dot[] => pts.map(([s, f]) => toneDot(s, f, root));

export const STAGE_4: CourseStage = {
  slug: "8", label: "8", title: "Up the neck",
  intro: "The three remaining CAGED shapes of G, then one arpeggio and the triads followed across the whole neck.",
  sections: [
    section("d-c-a-shapes", "D, C and A shapes", "caged", "The D, C and A shapes of CAGED, filling in the rest of the neck.", [
      text(
        "Positions 1 and 2 were two of the five CAGED shapes of G: the G shape (open position) and the E shape (from the 3rd fret). Three more fill the rest of the neck, each named after the open chord it looks like: D, C and A. After the A shape comes the G shape again, twelve frets up.",
        "Each box holds the same seven notes of G major. Learn where the roots (the big dots) sit in each one, and the rest of the box hangs off them.",
      ),
      neck("The D shape of G (frets 4–8): root on the D string, 5th fret.", 3, 9, toneDots(G, MAJOR_SEMIS, 4, 8), { window: { from: 4, to: 8 } }),
      neck("The C shape of G (frets 7–10): root on the A string, 10th fret, reaching back.", 6, 11, toneDots(G, MAJOR_SEMIS, 7, 10), { window: { from: 7, to: 10 } }),
      neck("The A shape of G (frets 9–13): the A-shape barre at the 10th fret.", 8, 14, toneDots(G, MAJOR_SEMIS, 9, 13), { window: { from: 9, to: 13 } }),
      task("Play G major up and down in each box, starting and ending on a root. Then find the G chord inside each box."),
      links([{ href: "/theory/caged", label: "CAGED explorer", note: "the five shapes of any chord, joined across the neck" }]),
    ]),
    section("pentatonic-boxes", "The pentatonic in five boxes", "caged", "The pentatonic scale in five boxes that tile the whole neck.", [
        text(
          "The five pentatonic boxes tile the neck, one inside each CAGED shape. Box 1 is the one you know at the nut; the others take over as you climb, each sharing its top notes with the next one's bottom.",
          "Join them with slides along one string and you can solo from the nut to the 15th fret without stopping.",
        ),
        neck("E minor / G major pentatonic over the whole neck. Position 1 is shaded; the other four boxes join on either side.", 0, 15, toneDots(E, [0, 3, 5, 7, 10], 0, 15), { window: { from: 0, to: 3 } }),
        task("Play box 1, slide up on the G string into box 2, and come back down. Then the same from box 2 to box 3."),
        links([{ href: "/theory/scales/natural-minor-aeolian", label: "Pentatonic boxes on the scale page" }]),
      ]),
    section("one-arpeggio", "One arpeggio through all five shapes", "arpeggios", "One arpeggio, G B D, followed through all five CAGED shapes.", [
      text(
        "Here's the G arpeggio, G B D, across the whole neck, with one path per CAGED shape. Each shape is the arpeggio you'd play from that position, and neighbouring shapes share notes, which is how they lock together.",
        "Same three notes everywhere: Do, Mi, Sol. Once you see that, the neck is one big G chord with five handholds.",
      ),
      neck("G arpeggio in all five shapes: G shape (amber), E shape (blue), D shape (lime), C shape (rose), A shape (violet).", 0, 15, toneDots(G, MAJOR_TRIAD, 0, 15), {
        paths: [
          path(PATH.amber, [0, 3], [1, 2], [2, 0], [3, 0], [4, 0], [5, 3]),
          path(PATH.sky, [1, 5], [2, 5], [3, 4], [4, 3]),
          path(PATH.lime, [2, 5], [3, 7], [4, 8], [5, 7]),
          path(PATH.rose, [1, 10], [2, 9], [3, 7], [4, 8]),
          path(PATH.violet, [1, 10], [2, 12], [3, 12], [4, 12], [5, 10]),
        ],
      }),
      task("Play the arpeggio in one shape, then slide to the next and play it again, all the way up the neck and back."),
      links([{ href: "/theory/arpeggios", label: "Arpeggios explorer" }]),
    ]),
    section("do-mi-sol-shapes", "Do–Mi–Sol in every shape", "caged", "Finding the major chord's three notes inside each of the five CAGED shapes, all the way up the neck."),
    section("triads-everywhere", "Triads on every string set", "triads", "Triads on every set of three neighbouring strings.", [
      text(
        "Triads aren't only on the top three strings. Any three neighbouring strings hold a G triad somewhere: E–A–D, A–D–G, D–G–B and G–B–e. Each set gives the same chord a different shape and a different register.",
        "On the top strings, G, C and D triads sit a few frets apart, and moving between them takes one or two fingers, just like the triads in position 1.",
      ),
      neck("A G triad on each string set, low to high.", 0, 12, at(G, [[0, 3], [1, 2], [2, 0], [2, 5], [3, 4], [4, 3], [1, 10], [2, 9], [3, 7], [4, 8], [5, 7]]), {
        paths: [
          path(PATH.amber, [0, 3], [1, 2], [2, 0]),
          path(PATH.sky, [2, 5], [3, 4], [4, 3]),
          path(PATH.lime, [1, 10], [2, 9], [3, 7]),
          path(PATH.rose, [3, 7], [4, 8], [5, 7]),
        ],
      }),
      neck("G → C → D on the top three strings: the 1 → 4 → 5 path as triads. The high G is shared by G and C.", 2, 8, [
        ...at(G, [[3, 4], [4, 3], [5, 3]]), ...at(C, [[3, 5], [4, 5]]), ...at(D, [[3, 7], [4, 7], [5, 5]]),
      ], {
        paths: [path(PATH.amber, [3, 4], [3, 5], [3, 7]), path(PATH.sky, [4, 3], [4, 5], [4, 7]), path(PATH.lime, [5, 3], [5, 5])],
      }),
      task("Strum the G triad on each string set in turn. Then play G C D G on the top three strings, watching which fingers stay."),
      links([{ href: "/theory/triads", label: "Triads explorer", note: "every triad on every string set" }]),
    ]),
    section("every-note", "Find every note", "basics", "Finding any note on any string with octave shapes and the 12th fret.", [
        text(
          "By now you know the notes on the E and A strings. The rest follow from two landmarks: octave shapes (two strings up, two frets up) and the 12th fret, where the names start again.",
          "Pick one note and find it everywhere: every C, then every F♯. It's the quickest way to stop counting frets.",
        ),
        neck("Every natural note on every string, up to the 12th fret.", 0, 12, naturalDots([0, 1, 2, 3, 4, 5], 12)),
        task("One note a day: find all its places in under a minute, low to high."),
        links([], [{ href: "/theory/notes?mode=every&naturals=0&strings=E,A,D,G,B,e", label: "Find every C, every F♯ …" }]),
      ]),
    section("greensleeves", "Greensleeves", "melody", "Greensleeves, a 16th-century tune played up the neck.", [
        text("A 16th-century tune that lives up the neck. Read it through the box at the 8th fret: the tab stays in one place, and each note sits under a finger."),
        melody({ title: "Greensleeves", origin: "traditional English (16th century)", position: 8, notes: tune("A4 C5:2 D5 E5:1.5 F5:0.5 E5 D5:2 B4 G4:1.5 A4:0.5 B4 C5:2 A4 A4:1.5 G#4:0.5 A4 B4:2 G#4 E4:2") }),
      ]),
    section("string-skipping", "String skipping", "technique", "Picking accurately across strings that aren't next to each other, for wide melodies and arpeggios."),
  ],
};
