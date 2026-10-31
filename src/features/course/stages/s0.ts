import { naturalDots } from "../visuals";
import { DEGREE_COLOURS } from "../../theory/scales";
import { section, type CourseStage } from "../model";
import { G, MAJOR_SEMIS, PATH, chords, links, melody, neck, path, pianoKeys, songs, strum, task, text, toneDots, tune, visual } from "../build";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NOTE_FILL = "#e2e8f0";
const named = (string: number, fret: number, label: string) => ({ string, fret, label, fill: NOTE_FILL, big: fret === 0 });

export const STAGES_0: CourseStage[] = [
  {
    slug: "1", label: "1", title: "Guitar basics",
    intro: "How the guitar is tuned, how to read tab and chord boxes, and the names of the notes on the two lowest strings.",
    sections: [
      section("strings-and-tuning", "Strings & tuning", "basics", "The names of the six strings and how to tune them to each other by ear.", [
        text(
          "Six strings, lowest to highest: E A D G B E. Say it as \"Eddie Ate Dynamite, Good Bye Eddie\" until it sticks. The thick one nearest your face is the low E; the thin one nearest the floor is the high e.",
          "Each fret raises a string by one semitone, the same step as from one piano key to the very next one. Five frets up the low E is an A, the same note as the open A string. That's how you tune the strings to each other: play the 5th fret, then the next open string, and make them match.",
          "The one exception is the G string: its 4th fret matches the open B. Use the site's tuner for the low E, then follow the arrows.",
        ),
        neck("Tuning by ear: each arrow joins two notes that should sound the same. The G string uses the 4th fret, every other string the 5th.", 0, 5, [
          named(0, 0, "E"), named(1, 0, "A"), named(2, 0, "D"), named(3, 0, "G"), named(4, 0, "B"), named(5, 0, "E"),
          named(0, 5, "A"), named(1, 5, "D"), named(2, 5, "G"), named(3, 4, "B"), named(4, 5, "E"),
        ], {
          paths: [path(PATH.amber, [0, 5], [1, 0]), path(PATH.amber, [1, 5], [2, 0]), path(PATH.amber, [2, 5], [3, 0]), path(PATH.sky, [3, 4], [4, 0]), path(PATH.amber, [4, 5], [5, 0])],
          legend: [{ label: "5th fret = next open string", colour: PATH.amber }, { label: "G string: 4th fret", colour: PATH.sky }],
        }),
        links([{ href: "/theory/tunings", label: "Tunings", note: "standard tuning and the others you'll meet" }]),
      ]),
      section("tab-and-chord-boxes", "Tab & chord boxes", "basics", "How to read tab and chord boxes, the two pictures every guitar lesson uses.", [
        text(
          "Tab draws the six strings as six lines, high e on top, low E at the bottom, the way you see them looking down at the guitar on your lap. A number on a line is the fret to press; 0 is the open string.",
          "A chord box stands the neck up: strings run top to bottom, low E on the left. Dots are fingers, O above a string means play it open, X means don't play it. Tap a box below to hear it.",
        ),
        chords("Em in a chord box: two fingers on the 2nd fret, everything else open. Tap to hear.", ["Em"]),
        task("Find Em from the box without looking at a video, strum it, then pick each string one at a time, low to high. Every string should ring; if one is dead, a finger is touching it."),
      ]),
      section("notes-on-e-and-a", "Notes on E and A", "basics", "The natural notes on the two lowest strings, where every barre chord and scale is found later.", [
        text(
          "The natural notes (the white keys on a piano) run A B C D E F G and start again. Between most of them is a fret's gap; between B–C and E–F there's none, just like the piano has no black key there.",
          "Learn them on the two lowest strings first. Every barre chord and scale later on is found by its lowest note on the E or A string, so this pays off for years.",
        ),
        neck("Natural notes on the low E and A strings. The 12th fret starts the pattern again.", 0, 12, naturalDots([0, 1], 12), {
          legend: LETTERS.map((l, i) => ({ label: l, colour: DEGREE_COLOURS[i] })),
        }),
        links([], [{ href: "/theory/notes?strings=E,A&naturals=1", label: "Find the notes on E and A", note: "a quiz: a note name comes up, tap it on the neck" }]),
      ]),
    ],
  },
  {
    slug: "2", label: "2", title: "First open chords",
    intro: "Five open chords, clean changes between them, and three strumming patterns to play them with.",
    sections: [
      section("em-and-am", "Em & Am", "open-chords", "Your first two chords, Em and Am, and how to press so every string rings.", [
        text(
          "Em and Am are the two chords this whole course keeps coming back to. Em takes two fingers; Am takes three, and has the same shape moved over one string with one extra finger.",
          "Press just behind the fret, not on top of it, with the tips of your fingers so they don't lean on the next string.",
        ),
        chords("Em and Am. Tap to hear.", ["Em", "Am"]),
        task("Strum Em four times, Am four times, and back, slowly and without stopping between them. Keep your fingers close to the strings when they lift."),
      ]),
      section("c-d-g", "C, D, G", "open-chords", "G, C and D: with Em and Am, every chord of G major that needs no barre.", [
        text(
          "With G, C and D you have the three main chords of G major, and with Em and Am every chord of the key that doesn't need a barre. Hundreds of songs use nothing else.",
          "G and C stretch the hand; D is small and sits on the top four strings only, so skip the two low strings when you strum it.",
        ),
        chords("G, C and D. Tap to hear.", ["C", "D", "G"]),
        task("Play G C D G, four strums each. Then Em C G D, the chords of a lot of pop songs."),
      ]),
      section("e-a-dm", "E, A & Dm", "open-chords", "Three more open chords, E, A and Dm, for the eight most songs need.", [
        text(
          "Three more open chords and you have all eight that most songs need. E is Am's shape moved up a string; A is three fingers in a row on the 2nd fret; Dm is D's little cousin, a darker sound on the top four strings.",
          "Open chords ring out with open strings and need no barre, which is why they turn up in almost every pop, rock and folk song.",
        ),
        chords("E, A and Dm. Tap to hear.", ["E", "A", "Dm"]),
        task("One minute each: D ↔ A, A ↔ E, Dm ↔ Am. Then D A G D, four strums each."),
        songs({ title: "Bad Moon Rising", artist: "Creedence Clearwater Revival", chords: ["D", "A", "G"], progression: "D A G D" }),
      ]),
      section("one-minute-changes", "One-minute changes", "open-chords", "A one-minute timer drill for changing between two chords cleanly.", [
        text("Changing chords cleanly matters more than knowing many. The best drill for it takes one minute: pick two chords, set a timer, and count how many clean switches you make. Write the number down and beat it tomorrow."),
        task("One minute each: Em ↔ Am, Am ↔ C, C ↔ G, G ↔ D, D ↔ Em. Thirty clean changes a minute means the pair is ready for songs."),
        links([], [{ href: "/theory/chords?q=Am", label: "Chords explorer", note: "every shape of a chord, to check your fingers" }]),
      ]),
      section("all-downstrums", "All downstrums", "strumming", "Strumming in time with all downstrums, one and then two per beat.", [
        text(
          "Start with the strumming hand alone: every strum down, steady as a clock. First one strum per beat, then two, counting \"1 & 2 & 3 & 4 &\".",
          "Strum from the wrist, not the elbow, and keep the hand moving even when you change chords. If the change isn't ready, strum the open strings: keeping time matters more than a perfect chord.",
        ),
        strum("downs-quarter", ["Em", "Am"], "One down per beat. Count out loud: 1 2 3 4."),
        strum("downs-eighth", ["Em", "Am"], "Two downs per beat. Count 1 & 2 & 3 & 4 &, a strum on every word."),
      ]),
      section("island-strum", "Island strum", "strumming", "The down, down-up, up-down-up strum behind countless campfire songs.", [
        text(
          "Down, down-up, up-down-up: the strum behind countless campfire and ukulele songs. The hand keeps going down on every beat and up on every \"&\"; it just misses the strings on the \"&\" of 1 and on beat 3.",
          "That missed strum is what makes it swing. Don't stop the hand to skip it; swing past the strings.",
        ),
        strum("island", ["G", "C", "D"], "D · D U · U D U. The arrows are where the pick hits; the hand moves on every box."),
        task("Play it on G for a whole minute before adding chord changes. Then two bars each of G, C, D, G."),
      ]),
      section("sixteenths", "16th strumming pattern", "strumming", "A 16th-note strumming groove, four strokes per beat with the hand never stopping.", [
        text(
          "Now the hand moves twice as fast: four strokes per beat, counted \"1 e & a 2 e & a…\", down on 1 and &, up on e and a. The pick only touches the strings where the grid shows an arrow; the rest of the time it swings past.",
          "The anchors are the big downstrums on beat 1 and beat 3. Land those, and the ups in between take care of themselves. Start slow; it should feel like a groove, not a sprint.",
        ),
        strum("sixteenths", ["Em", "Am"], "Down on 1 and on 3, 16th strokes filling the rest. The hand never stops moving."),
        task("Mute the strings with your fretting hand and play only the rhythm until it feels even, then let Em ring. One bar Em, one bar Am."),
      ]),
      section("first-songs", "First songs", "open-chords", "Well-known songs you can play with only the chords from this stage.", [
        text("These songs use only the chords from this stage. Play them with all downstrums first, then the island strum."),
        songs(
          { title: "Knockin' on Heaven's Door", artist: "Bob Dylan", chords: ["G", "D", "Am", "C"], progression: "G D Am · G D C" },
          { title: "Leaving on a Jet Plane", artist: "John Denver", chords: ["G", "C", "D"], progression: "G C G C · G C D" },
          { title: "Sweet Home Alabama", artist: "Lynyrd Skynyrd", chords: ["D", "C", "G"], progression: "D C G (round and round)" },
          { title: "Zombie", artist: "The Cranberries", chords: ["Em", "C", "G", "D"], progression: "Em C G D", note: "the record has D/F♯; plain D is fine to start" },
        ),
      ]),
      section("what-is-a-chord", "What a chord is", "open-chords", "What makes a chord: a root with a 3rd and a 5th stacked on it, and why open chords double some of them."),
    ],
  },
  {
    slug: "3", label: "3", title: "One note, three views",
    intro: "The same notes on piano, on guitar and as do-re-mi. Once you can see all three, every later idea has a name.",
    sections: [
      section("piano-and-guitar", "Piano ↔ guitar", "three-views", "The same notes laid out on a piano and folded onto the guitar neck.", [
        text(
          "A piano lays every note out in one line, left to right. A guitar folds that line onto six strings: the same note turns up in several places, and moving one fret is moving one key.",
          "Below is the G major scale both ways, each note numbered and coloured the same. The piano shows why it sounds the way it does (whole steps and two half steps, at 3–4 and 7–1); the guitar shows where your fingers go.",
        ),
        visual({ kind: "piano", caption: "G major on the piano, G3 to G4. Tap a key to hear it.", keys: pianoKeys(G, [55, 57, 59, 60, 62, 64, 66, 67], { style: "number" }) }),
        neck("The same scale on the guitar, in the open position.", 0, 4, toneDots(G, MAJOR_SEMIS, 0, 4, { style: "number" })),
        links([{ href: "/theory/piano", label: "Piano", note: "play notes on a keyboard and see them on the neck" }]),
      ]),
      section("solfege", "Solfège", "three-views", "Do re mi fa sol la ti: names for the notes of a key that move with the key, so a tune can be sung anywhere.", [
        text(
          "Do re mi fa sol la ti do: the names singers use for the steps of a major scale. In movable do, Do is always the home note of the key, so in G major Do is G, and in C major Do is C.",
          "That's what makes solfège useful on the guitar: shapes move, and so do the names. Do–Fa–Sol is the same sound and the same shape in every key. This course labels notes with their degree (1, 4, 5) and their solfège name (Do, Fa, Sol) side by side.",
        ),
        visual({ kind: "piano", caption: "G major named in solfège: G is Do.", keys: pianoKeys(G, [55, 57, 59, 60, 62, 64, 66, 67], { solfege: true }) }),
        task("Sing do re mi fa sol la ti do along with the piano, then without it. Then sing it down."),
      ]),
      section("do-re-mi", "The major scale as do-re-mi", "three-views", "G major in the open position, played and sung as Do Re Mi.", [
        text(
          "Here is G major in the open position, each note with its number and its solfège name. Play the arrow path from the open G string up to the G on the high e, singing along: Do Re Mi Fa Sol La Ti Do.",
          "Notice the small steps: Mi–Fa (B to C) and Ti–Do (F♯ to G) are one fret apart. Every other step is two frets, or the next string.",
        ),
        neck("G major in position 1, frets 0–3. The arrows climb one octave: Do to Do.", 0, 3, toneDots(G, MAJOR_SEMIS, 0, 3, { style: "number", solfege: true }), {
          paths: [path(PATH.amber, [3, 0], [3, 2], [4, 0], [4, 1], [4, 3], [5, 0], [5, 2], [5, 3])],
        }),
        task("Play the path up and down, saying the solfège names out loud. Then start from the G on the low E (3rd fret) and see how far you get."),
      ]),
      section("intervals", "Intervals", "three-views", "The distance between two notes: half steps, whole steps and the octave, and how they add up to the scale."),
      section("hearing-do-fa-sol", "Hearing do, fa, sol", "three-views", "Hearing the 1, 4 and 5 of a key by ear, the notes most songs are built on.", [
        text(
          "Do, Fa and Sol (1, 4 and 5) are the three strongest notes of a key. They're the roots of its three main chords: in G major, G, C and D.",
          "Fa sounds like it wants to move; Sol sounds like it wants to go home to Do. Learn to hear that pull and you'll hear chord changes coming in songs.",
        ),
        visual({ kind: "piano", caption: "Do, Fa, Sol in G major: G, C and D. Tap them and listen to which one wants to go home.", keys: pianoKeys(G, [55, 60, 62, 67], { solfege: true }) }),
        task("Play G, then C, then D, then G on the guitar (low E 3rd fret, A 3rd fret, open D, open G). Sing Do Fa Sol Do with them."),
        links([], [{ href: "/theory/ears?set=5,7,12", label: "Ear: 4th, 5th and octave", note: "name the interval you hear" }]),
      ]),
      section("major-or-minor", "Major or minor?", "three-views", "Telling major from minor by ear: one note, the 3rd, makes the difference.", [
        text(
          "Major sounds bright and settled, minor sounds dark or sad. The difference is one note: the 3rd. G major has B; G minor lowers it to B♭. That's all it takes to change the mood.",
          "Play G then Em, C then Am, D then Dm, and listen for the change. Then try it with your eyes closed while someone else plays.",
        ),
        task("Play E then Em, A then Am, D then Dm. Say \"bright\" or \"dark\" before each chord rings out, then check."),
        links([], [{ href: "/theory/ears?kind=chord", label: "Major or minor?", note: "listen for the 3rd: bright is major, dark is minor; the 7th chords can wait" }]),
      ]),
    ],
  },
  {
    slug: "4", label: "4", title: "Single notes",
    intro: "Simple tunes one note at a time, so the picking hand is ready for arpeggios.",
    sections: [
      section("melodies", "Melodies in tab", "melody", "Simple tunes in tab, to train the picking hand to find one string at a time.", [
        text(
          "Picking one note at a time trains your hand to find a single string, which is exactly what arpeggios and solos need in stage 5. A tune you already know tells you at once when a note is wrong.",
          "Both tunes sit on the top two strings in the open position. Use one finger per fret: 1st finger on fret 1, 2nd on fret 2, 3rd on fret 3.",
        ),
        melody({ title: "Ode to Joy", origin: "Beethoven, 9th symphony (public domain)", position: 0, notes: tune("E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2") }),
        melody({ title: "When the Saints Go Marching In", origin: "traditional", position: 0, notes: tune("C4 E4 F4 G4:4 C4 E4 F4 G4:4 C4 E4 F4 G4:2 E4:2 C4:2 E4:2 D4:4") }),
        task("Play Ode to Joy slowly from the tab until you don't need to look for each note. Then try to find the start of another tune you know by ear."),
      ]),
    ],
  },
];
