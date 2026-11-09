import type { Area } from "../model/concepts";

/** Which of a topic's four lines the student picked: 0 is "Not yet", 3 the most able. */
export type Rung = 0 | 1 | 2 | 3;

/** One broad thing the first questionnaire asks about: four lines, easiest first, and the student picks the one that fits. */
export interface Topic {
  id: string;
  area: Area;
  label: string;
  /** one short line on what it covers */
  desc: string;
  lines: readonly [string, string, string, string];
}

const NOT_YET = "Not yet";
const topic = (area: Area, id: string, label: string, desc: string, a: string, b: string, c: string): Topic => ({ id, area, label, desc, lines: [NOT_YET, a, b, c] });

/** Every topic, six per area, in the order the questionnaire shows them. */
export const TOPICS: Topic[] = [
  topic("guitar", "guitar-scales", "Scales", "Pentatonic positions, modes, knowing the neck",
    "I play one pentatonic position", "I play a few positions and the major scale", "I move between positions all over the neck and play modes"),
  topic("guitar", "guitar-basic-chords", "Basic chords", "Open chords, changing between them, strumming",
    "I know a few open chords, but changes are slow", "I change between open chords in time", "I play whole songs with open chords and a strumming pattern"),
  topic("guitar", "guitar-barre-chords", "Barre chords", "F, Bm and shapes that move",
    "I can hold an F or Bm, but it buzzes", "F and Bm ring clean and I change to them in time", "I move barre shapes anywhere on the neck"),
  topic("guitar", "guitar-extended-chords", "Extended chords", "7ths, sus and add9, 9ths and 13ths",
    "I play a few 7th chords", "I use 7th, sus and add9 chords in songs", "I play 9ths and 13ths and keep a rhythm part going with them"),
  topic("guitar", "guitar-caged", "CAGED", "The five chord shapes and how they join up",
    "I know one or two of the shapes", "I play one chord in all five shapes", "I find chords, triads and arpeggios anywhere with the shapes"),
  topic("guitar", "guitar-techniques", "Techniques", "Hammer-ons, pull-offs, bends, slides, string skipping",
    "I've tried hammer-ons and pull-offs", "My hammer-ons, pull-offs and slides sound clean", "I use them with bends in my own lines"),

  topic("voice", "voice-pitch", "Pitch", "Matching a note, staying in tune over a drone",
    "I match a note some of the time", "I match a note most of the time", "I stay in tune through a whole song"),
  topic("voice", "voice-intervals", "Intervals & leaps", "Steps, skips, intervals, then 4ths, 5ths and octaves",
    "I sing up and down by step, like Do Re Mi", "I sing skips, like Do Mi Sol", "I sing 4ths, 5ths and octaves in tune"),
  topic("voice", "voice-melodies", "Melodies", "Easy tunes up to sight-singing",
    "I sing easy tunes I know well", "I pick up a new tune after hearing it a few times", "I sing a tune from the staff"),
  topic("voice", "voice-breath-range", "Breath & range", "Holding a note, stretching your range",
    "I run out of breath on long notes", "I hold a long note steady", "I sing with ease at the top and bottom of my range"),
  topic("voice", "voice-runs", "Runs", "Slow runs up to fast ones",
    "I sing a short run slowly", "My slow runs are clean and in tune", "I sing fast runs cleanly"),
  topic("voice", "voice-harmony", "Harmony & improvising", "A harmony line over chords, making up a melody",
    "I hold my note while another one sounds", "I sing a harmony line over chords", "I make up my own melody over chords"),

  topic("theory", "theory-basics", "Basics", "Steady beat, note names",
    "I clap along to a steady beat", "I know the note names", "I keep time with the metronome and name notes quickly"),
  topic("theory", "theory-ear", "Ear", "Home note, major vs minor, intervals, chord changes",
    "I can tell major from minor", "I hear the home note and some intervals", "I hear the chord changes in a song"),
  topic("theory", "theory-scales-keys", "Scales & keys", "Pentatonic, major, natural minor, relative keys, circle of fifths, changing key",
    "I know the pentatonic or the major scale", "I know major and natural minor and how they relate", "I use the circle of fifths and can change key"),
  topic("theory", "theory-building-chords", "Building chords", "7ths, sus and add9, diminished, augmented, 9ths and 13ths",
    "I know what a major and a minor chord are made of", "I can build 7th and sus chords", "I can build diminished, augmented, 9th and 13th chords"),
  topic("theory", "theory-progressions", "Progressions & styles", "1-4-5, pop and rock, folk, blues, ii–V–I, guide tones, jazz",
    "I know the 1, 4 and 5 chords of a key", "I know the usual chords of pop, folk or blues songs", "I follow ii–V–I and jazz changes"),
  topic("theory", "theory-modes", "Modes & minor colours", "The modes, Lydian & Locrian, harmonic and melodic minor",
    "I've heard of modes", "I know Dorian, Mixolydian or harmonic minor", "I use modes and melodic minor on purpose"),
];

export const topicById = (id: string): Topic | undefined => TOPICS.find((t) => t.id === id);

/** One area's topics, in screen order. */
export const topicsFor = (area: Area): Topic[] => TOPICS.filter((t) => t.area === area);
