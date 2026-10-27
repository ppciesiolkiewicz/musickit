import type { MelodyNote } from "@/lib/chordKit/tab";
import type { TrackId } from "./outline";

/**
 * What each stage teaches, track by track. Famous songs are listed by title and chords only; melodies in tab are
 * traditional or public-domain tunes. Links point into the explorers and practice games with settings already set.
 */
export interface CourseLink { href: string; label: string; note?: string }
export interface Song { title: string; artist: string; chords: string[]; progression: string; note?: string }
export interface Melody { title: string; origin: string; position: number; notes: MelodyNote[] }
export interface Track {
  id: TrackId;
  /** the track's promise in one line, set big at the top of its section */
  headline: string;
  learn: string[];
  /** how to tell you are ready to move this track on to the next stage */
  checkpoint: string;
  why: string;
  explore: CourseLink[];
  practise: CourseLink[];
  songs?: Song[];
  melodies?: Melody[];
  tip?: string;
}
export interface Stage { n: 1 | 2 | 3 | 4; title: string; level: string; intro: string; tracks: Track[] }

const m = (spec: string): MelodyNote[] => spec.trim().split(/\s+/).map((t) => {
  const [note, beats] = t.split(":");
  return { note, beats: beats ? Number(beats) : 1 };
});

export const STAGE_CONTENT: Stage[] = [
  {
    n: 1, title: "First chords", level: "Beginner",
    intro: "Eight open chords, two simple melodies and the names of the notes on the two lowest strings. That is enough to play hundreds of songs.",
    tracks: [
      {
        id: "chords",
        headline: "Eight chords, hundreds of songs.",
        checkpoint: "You can switch between any two of the eight chords about 30 times in a minute, and strum a whole song without stopping.",
        learn: ["Em", "Am", "C", "D", "G", "E", "A", "Dm"],
        why: "Open chords ring out with open strings, need no barre and turn up in almost every pop, rock and folk song. Start with Em and Am (two and three fingers), then add the rest. Changing between chords cleanly matters more than how many you know.",
        explore: [
          { href: "/theory/chords?q=open", label: "All the open chords", note: "tap any diagram to hear it" },
          { href: "/theory/chords?q=Em", label: "Em, every way to play it" },
          { href: "/theory/caged", label: "Chords in a key", note: "the simplest shape for each chord of a key" },
        ],
        practise: [
          { href: "/theory/chords?q=Am", label: "One-minute changes", note: "count clean switches between two chords in 60 seconds: Em↔Am, Am↔C, C↔G, G↔D, D↔A, A↔E, Dm↔Am. Write the number down and beat it tomorrow." },
        ],
        songs: [
          { title: "Knockin' on Heaven's Door", artist: "Bob Dylan", chords: ["G", "D", "Am", "C"], progression: "G D Am · G D C" },
          { title: "Leaving on a Jet Plane", artist: "John Denver", chords: ["G", "C", "D"], progression: "G C G C · G C D" },
          { title: "Bad Moon Rising", artist: "Creedence Clearwater Revival", chords: ["D", "A", "G"], progression: "D A G D" },
          { title: "Sweet Home Alabama", artist: "Lynyrd Skynyrd", chords: ["D", "C", "G"], progression: "D C G (round and round)" },
          { title: "Zombie", artist: "The Cranberries", chords: ["Em", "C", "G", "D"], progression: "Em C G D", note: "the record has D/F♯; plain D is fine to start" },
        ],
      },
      {
        id: "lead",
        headline: "Your first tunes, one string at a time.",
        checkpoint: "You can play Ode to Joy from the tab at a slow, steady pace, without looking for each note.",
        learn: ["Read tab: lines are strings, numbers are frets", "Melodies on the top two strings"],
        why: "Picking single notes trains the fretting hand to land on one string at a time, and a tune you know tells you at once when a note is wrong.",
        explore: [{ href: "/theory/basics", label: "Guitar basics", note: "strings, frets and note names" }],
        practise: [{ href: "/theory/notes?strings=e,B&naturals=1&from=0&to=5", label: "Notes on the top two strings" }],
        melodies: [
          { title: "Ode to Joy", origin: "Beethoven, 9th symphony (public domain)", position: 0, notes: m("E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2") },
          { title: "When the Saints Go Marching In", origin: "traditional", position: 0, notes: m("C4 E4 F4 G4:4 C4 E4 F4 G4:4 C4 E4 F4 G4:2 E4:2 C4:2 E4:2 D4:4") },
        ],
      },
      {
        id: "ear",
        headline: "Name the notes, hear the mood.",
        checkpoint: "You can name any natural note on the E and A strings in a couple of seconds, and tell major from minor most of the time.",
        learn: ["String names E A D G B e", "Natural notes on the low E and A strings", "Major vs minor by ear"],
        why: "Every barre chord and every scale later on is placed by its root on the low E or A string, so knowing those notes now pays off in stage 3. Hearing major against minor is the first thing an ear learns.",
        explore: [{ href: "/theory/basics", label: "Piano → guitar, part 1" }],
        practise: [
          { href: "/theory/notes?strings=E,A&naturals=1", label: "Find the notes on E and A" },
          { href: "/theory/ears?kind=chord", label: "Major or minor?", note: "listen for the 3rd: bright is major, dark is minor; the 7th chords can wait" },
          { href: "/theory/ears?level=1", label: "Ear level 1: 5th and octave" },
        ],
      },
    ],
  },
  {
    n: 2, title: "More chords, first solos", level: "Improver",
    intro: "Colour chords that need no barre, power chords, and your first scale: the minor pentatonic, over a 12-bar blues.",
    tracks: [
      {
        id: "chords",
        headline: "New colours without a barre.",
        checkpoint: "Fmaj7, B7 and Cadd9 sound clean, and power chords move up and down the neck without buzzing.",
        learn: ["Fmaj7", "B7", "E7 A7 D7 C7 G7", "Em7 Am7", "Cadd9", "Asus2 Dsus2 Dsus4 Esus4", "E5 A5 power chords"],
        why: "7th chords are the sound of the blues, sus and add9 chords dress up the open chords you know, and Fmaj7 is the friendly way into F before the barre. Power chords are two or three notes and move anywhere on the neck.",
        explore: [
          { href: "/theory/chords?q=open", label: "Open chords, stage 2 set" },
          { href: "/theory/chords?q=power", label: "Power chords" },
          { href: "/theory/chords?q=B7", label: "B7, every way" },
        ],
        practise: [{ href: "/theory/chords?q=Fmaj7", label: "One-minute changes: C↔Fmaj7, Em↔B7, G↔Cadd9" }],
        songs: [
          { title: "Good Riddance (Time of Your Life)", artist: "Green Day", chords: ["G", "Cadd9", "D", "Em", "C"], progression: "G Cadd9 D · Em D C G" },
          { title: "Free Fallin'", artist: "Tom Petty", chords: ["D", "Dsus4", "A"], progression: "D Dsus4 D A" },
          { title: "Hound Dog", artist: "Elvis Presley (12-bar blues in E)", chords: ["E7", "A7", "B7"], progression: "E7 ×4 · A7 ×2 E7 ×2 · B7 A7 E7 ×2" },
          { title: "12-bar blues in A", artist: "the blues form (Johnny B. Goode and many more)", chords: ["A7", "D7", "E7"], progression: "A7 ×4 · D7 ×2 A7 ×2 · E7 D7 A7 E7" },
          { title: "Smoke on the Water", artist: "Deep Purple", chords: ["G5", "B♭5", "C5", "D♭5"], progression: "riff in power chords" },
        ],
      },
      {
        id: "lead",
        headline: "Five notes that never sound wrong.",
        checkpoint: "You can play box 1 up and down from memory, and improvise for a whole 12-bar without stopping.",
        learn: ["Minor pentatonic, box 1", "Bends and slides", "Improvising over a 12-bar"],
        why: "The minor pentatonic has five notes and no wrong-sounding ones over a blues or rock tune. Box 1 sits under one hand, so you can start making up lines on day one.",
        explore: [
          { href: "/theory/scales/natural-minor-aeolian", label: "A minor and its pentatonic boxes" },
          { href: "/theory/improv", label: "Improv: play over a groove" },
        ],
        practise: [{ href: "/theory/improv", label: "Improvise over a 12-bar in A with box 1 at the 5th fret" }],
        tip: "House of the Rising Sun (traditional): Am C D F · Am C E. Pick the chords as arpeggios and hum the tune over them.",
      },
      {
        id: "ear",
        headline: "Why some chords belong together.",
        checkpoint: "You can name the I, IV, V and vi chords of G, C, D and A, and pick out a 5th or an octave by ear.",
        learn: ["Chords in a key: I IV V vi", "Intervals on and across strings", "P4, P5 and the octave by ear"],
        why: "Most songs use the I, IV, V and vi chords of one key. Once you know which chords belong together you can guess a song's chords and transpose it. Interval shapes are the grid every scale and chord is built from.",
        explore: [
          { href: "/theory/circle", label: "Circle of fifths", note: "the chords of any key" },
          { href: "/theory/basics?interval=7", label: "The 5th on and across strings" },
          { href: "/theory/basics?interval=12", label: "Octave shapes" },
        ],
        practise: [
          { href: "/theory/ears?set=5,7,12", label: "Ear: P4, P5 and octave" },
          { href: "/theory/notes?strings=E,A,D,G,B,e&naturals=1", label: "Natural notes on every string" },
        ],
      },
    ],
  },
  {
    n: 3, title: "Barres and the neck", level: "Intermediate",
    intro: "Barre chords open up every key, triads give you small chords anywhere, and the pentatonic spreads across the whole neck.",
    tracks: [
      {
        id: "chords",
        headline: "One shape, every key.",
        checkpoint: "You can play F and Bm as barres, and find any major or minor barre chord from its root on the E or A string.",
        learn: ["E-shape barre: F, G, A …", "A-shape barre: B♭, B, C …", "Minor barres: Bm, F♯m, Cm", "Triads on string sets"],
        why: "A barre chord is an open E or A shape moved up with your first finger as the nut. With those two shapes and the note names on the E and A strings you can play any major or minor chord.",
        explore: [
          { href: "/theory/chords?q=F", label: "F: open-ish and barre" },
          { href: "/theory/chords?q=Bm", label: "Bm" },
          { href: "/theory/triads", label: "Triads on string sets" },
        ],
        practise: [{ href: "/theory/notes?strings=E,A&naturals=0", label: "Every note on E and A (barre roots)" }],
        songs: [
          { title: "Let It Be", artist: "The Beatles", chords: ["C", "G", "Am", "F"], progression: "C G Am F · C G F C" },
          { title: "House of the Rising Sun", artist: "traditional (The Animals)", chords: ["Am", "C", "D", "F", "E"], progression: "Am C D F · Am C E" },
          { title: "Creep", artist: "Radiohead", chords: ["G", "B", "C", "Cm"], progression: "G B C Cm" },
          { title: "Hotel California", artist: "Eagles", chords: ["Bm", "F♯7", "A", "E7", "G", "D", "Em"], progression: "Bm F♯7 A E7 G D Em F♯7" },
        ],
      },
      {
        id: "lead",
        headline: "Solo from the nut to the 15th fret.",
        checkpoint: "You can slide from one pentatonic box into the next without stopping, in A and in one other key.",
        learn: ["Minor pentatonic in all 5 boxes", "Major pentatonic", "Linking boxes with slides"],
        why: "The five pentatonic boxes tile the neck. Join them and you can solo from the nut to the 15th fret in any key.",
        explore: [
          { href: "/theory/scales/natural-minor-aeolian", label: "Pentatonic boxes on the scale page" },
          { href: "/theory/caged", label: "CAGED: the pentatonic inside each shape" },
        ],
        practise: [{ href: "/theory/improv", label: "Improvise across two boxes" }],
        melodies: [
          { title: "Scarborough Fair", origin: "traditional English ballad (Dorian)", position: 5, notes: m("D4:2 D4 A4:2 A4 A4 E4 F4 E4 D4:3 A4 C5:2 D5 C5:2 A4 B4 G4 A4:3") },
        ],
      },
      {
        id: "ear",
        headline: "Hear where a song is going.",
        checkpoint: "You can find a key's relative minor and its two neighbours on the circle, and name most intervals by ear.",
        learn: ["Circle of fifths", "Relative minor", "All intervals by ear"],
        why: "The circle shows which keys are neighbours (one sharp or flat apart) and which minor key shares each major's notes. Songs that change key usually move to a neighbour.",
        explore: [{ href: "/theory/circle", label: "Circle of fifths" }],
        practise: [
          { href: "/theory/ears?level=6", label: "Ear: all intervals" },
          { href: "/theory/notes?mode=every&naturals=0&strings=E,A,D,G,B,e", label: "Find every C, every F♯ …" },
        ],
      },
    ],
  },
  {
    n: 4, title: "Colour and the whole neck", level: "Advanced",
    intro: "Five CAGED shapes per chord, the chords that live next to each other, 7th and extended voicings, and the modes.",
    tracks: [
      {
        id: "chords",
        headline: "Any chord, anywhere on the neck.",
        checkpoint: "You can play I–IV–V–I in all five CAGED regions of one key, and comp a jazz standard with shells.",
        learn: ["CAGED: one chord, five shapes", "Shape neighbours: I IV V ii vi in one region", "7th, 9th, 13th and shell voicings"],
        why: "CAGED links every shape of a chord across the neck, so you can play a progression in any position without jumping. Shells (root, 3rd, 7th) are how jazz and soul players comp.",
        explore: [
          { href: "/theory/caged", label: "CAGED" },
          { href: "/theory/caged#neighbours", label: "Shape neighbours" },
          { href: "/theory/chords?q=shell", label: "Shell voicings" },
          { href: "/theory/chords?q=jazz", label: "Jazz voicings" },
        ],
        practise: [{ href: "/theory/caged#neighbours", label: "I–IV–V–I in all five regions of one key" }],
        songs: [
          { title: "Autumn Leaves", artist: "jazz standard", chords: ["Cm7", "F7", "B♭maj7", "E♭maj7", "Am7♭5", "D7", "Gm"], progression: "Cm7 F7 B♭maj7 E♭maj7 · Am7♭5 D7 Gm" },
          { title: "Fly Me to the Moon", artist: "jazz standard", chords: ["Am7", "Dm7", "G7", "Cmaj7", "Fmaj7", "Bm7♭5", "E7"], progression: "Am7 Dm7 G7 Cmaj7 · Fmaj7 Bm7♭5 E7 Am7" },
          { title: "Oye Como Va", artist: "Santana", chords: ["Am7", "D9"], progression: "Am7 D9 (Dorian vamp)" },
        ],
      },
      {
        id: "lead",
        headline: "Seven moods from one scale.",
        checkpoint: "You can hear and play the difference between Dorian, Mixolydian and Lydian over a drone, and aim for chord tones in a solo.",
        learn: ["Major scale in five boxes", "Arpeggios", "Modes", "Harmonic and melodic minor"],
        why: "The major scale's seven modes are seven moods from one set of notes. Arpeggios let you aim for chord tones, which is what makes a solo follow the changes.",
        explore: [
          { href: "/theory/scales", label: "Scales and modes" },
          { href: "/theory/arpeggios", label: "Arpeggios" },
        ],
        practise: [{ href: "/theory/metronome-drone", label: "Play each mode over a drone and hear its colour" }],
        melodies: [
          { title: "Greensleeves", origin: "traditional English (16th century)", position: 8, notes: m("A4 C5:2 D5 E5:1.5 F5:0.5 E5 D5:2 B4 G4:1.5 A4:0.5 B4 C5:2 A4 A4:1.5 G#4:0.5 A4 B4:2 G#4 E4:2") },
        ],
      },
      {
        id: "ear",
        headline: "Your ear leads, your hands follow.",
        checkpoint: "You can say which note gives a mode its colour, and you have a cheatsheet of your own that you actually use.",
        learn: ["Mode compare", "Tunings and drones", "Your own cheatsheet"],
        why: "Comparing modes side by side shows the one or two notes that give each its sound. A drone makes those notes easy to hear.",
        explore: [
          { href: "/theory/scales", label: "Mode compare (on the scales page)" },
          { href: "/theory/tunings", label: "Tunings" },
          { href: "/theory/metronome-drone", label: "Metronome & drone" },
          { href: "/cheatsheet", label: "Build your own cheatsheet" },
        ],
        practise: [{ href: "/theory/ears?kind=chord", label: "Chord quality with 7ths" }],
      },
    ],
  },
];
