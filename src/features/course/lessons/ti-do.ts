import type { CourseArticle } from "../model";

/** Course section `ti-do`, written in the /learn articles' style. */
export const tiDo: CourseArticle = {
  updated: "2026-11-28T02:30",
  sings: true,
  blocks: [
    { type: "p", text: "In [Hearing 7th chords](/course/7/hearing-sevenths) the 7th of a maj7 sat one fret under the root. In the key, that note has a name: Ti, the 7th note of the scale, a half step under Do." },
    { type: "p", text: "Ti is the note that pulls home hardest. Stop on it and you can hear it lean up to Do. That pull is also why the D chord wants to go to the G chord in G major: Ti is inside it." },

    { type: "h2", text: "Before you sing" },
    { type: "list", items: [
      "Warm up first: [a five-minute routine](/learn/vocal-warm-ups).",
      "Sing quietly, in the comfortable middle of your voice.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. Stop on Ti", lines: [
      "Press Start microphone below to start the mic. Then press Play beside the drone to hear Do, the note G.",
      "Sing Do, Re, Mi and back down to Do. Sing it on the note names.",
      "Then go one note under Do to the ringed Ti, and stop. Hold Ti for a breath, then step up to Do.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", under: true, highlight: ["7"], drone: true }, after: [
      "Practice until you can feel Ti lean up to Do before you sing it.",
    ] },

    { type: "exercise", title: "2. Ti inside the D chord", lines: [
      "In G major, Ti is F♯. Press Intervals under the D chord box below: the high e string's note is the 3 of the D chord, and that note is F♯.",
      "Play the D chord, then the G chord, on your guitar. Listen to the high e string: F♯ goes up one fret to G, Ti to Do.",
    ], tool: { type: "chord-shapes", chords: ["D", "G"] }, after: [
      "Practice until you can hum the high e string's note as you change, F♯ and then G.",
    ] },

    { type: "exercise", title: "3. D7: two notes lead home", lines: [
      "D7 adds C, Fa, on the B string's 1st fret. Press each chord box below to hear it, then play D7 and the G chord on your guitar.",
      "Two notes move by one fret. On the high e string F♯ goes up to G, Ti to Do. On the B string C drops to the open B, Fa to Mi.",
    ], tool: { type: "chord-shapes", chords: ["D7", "G"] }, after: [
      "Each of those notes is a half step from where it lands, so D7 pulls home even harder than the D chord. Play the D chord and the G chord, then D7 and the G chord, and listen for the bigger pull.",
    ] },

    { type: "exercise", title: "4. Sing Ti over D7", lines: [
      "Press Play below to start the backing track: the G, C and D7 chords, then G again, round and round. Then press Start microphone on the staff below.",
      "Sing Do on \"oo\" over the G and C chords. When D7 comes, step down to Ti, and step back up to Do as the G chord comes round.",
      "If you come in late, wait on Do and catch the next D7.",
    ], tool: { type: "backing-track", key: "g", numerals: ["I", "IV", "V7", "I"], style: "ballad", bpm: 60, parts: { drums: "on", bass: "off", keys: "always" } },
    beside: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", under: true, notes: ["6", "7", "1", "2", "3"], highlight: ["7", "1"] }, after: [
      "Practice until you step to Ti as D7 arrives, without watching the chord boxes.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Try it in C major, where Ti is B and Fa is F. Play G7, then the C chord, and find the same two one-fret moves.",
      "Play the G major scale up from G and stop on F♯. Wait a moment before you play the last G.",
      "In a song you know in G, listen for the D or D7 chord just before the G chord comes back.",
    ] },
    { type: "p", text: "Soon you'll hear D7 coming home before it gets there. Next, [the same paths with colour](/course/7/colour-paths) follow that C down to B." },
  ],
};
