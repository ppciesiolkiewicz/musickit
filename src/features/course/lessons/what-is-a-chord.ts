import type { CourseArticle } from "../model";

/** Course section `what-is-a-chord`, written in the /learn articles' style. */
export const whatIsAChord: CourseArticle = {
  updated: "2026-11-27T20:48",
  versions: { agents: 2, teaching: 13, voice: 5 },
  blocks: [
    { type: "p", text: "Here's what's inside the open chords: a chord is three or more notes played together, and every chord in this stage is built from just three." },
    { type: "p", text: "Once you can see those three notes, a chord stops being a finger shape to remember. You'll know why the Em chord can be played on three open strings, and why one finger turns a major chord into a minor one." },

    { type: "h2", text: "Root, 3rd and 5th" },
    { type: "p", text: "Every chord starts from one note, the root, and is named after it: G is the root of the G chord. Then you skip a note of the key and take the next, twice. The key of G major has seven notes, G, A, B, C, D, E and F♯: from G, skip A and take B, skip C and take D." },
    { type: "p", text: "G, B and D: the root, the 3rd and the 5th. That's the G chord." },

    { type: "exercise", title: "1. Three notes on six strings", lines: [
      "Press a chord box below to hear it, then play it on your guitar.",
      "Then press the Intervals button under the chord box. The finger numbers turn into R for the root, 3 for the 3rd and 5 for the 5th.",
      "The G chord sounds six strings but holds only three notes, so some of them come twice. Count how many times the root turns up.",
    ], tool: { type: "chord-shapes", chords: ["G", "C", "D"] }, after: [
      "Practice until you can point at the root of each chord before you press the Intervals button.",
    ] },

    { type: "exercise", title: "2. The Em chord on three strings", lines: [
      "The Em chord's notes are E, G and B. The top three strings of your guitar are tuned to G, B and E, so they make the Em chord with no fingers at all.",
      "Press the chord box below to hear it. Then strum only the top three strings, and then all six strings of the full Em chord.",
      "Listen for the same chord: the full one just sounds bigger and lower.",
    ], tool: { type: "chord-shapes", chords: ["Em", "Em"], frets: ["x x x 0 0 0", null] } },

    { type: "exercise", title: "3. One note makes it minor", lines: [
      "In a minor chord the 3rd is one fret lower. Press the Intervals button under each chord box below: the 3 in E, A and D turns into ♭3 in Em, Am and Dm.",
      "Play each pair on your guitar, and watch which finger moves or lifts off.",
    ], tool: { type: "chord-shapes", chords: ["E", "Em", "A", "Am", "D", "Dm"] }, after: [
      "Practice until you can switch each pair back and forth without looking at your hand.",
    ] },

    { type: "exercise", title: "4. Major or minor, by ear", lines: [
      "Press the Start button below to hear a chord. Pick Major or Minor.",
      "If two answers sound alike, press the Replay button and listen for the middle note: the 3rd.",
    ], tool: { type: "interval-ears", kind: "chord", qualities: ["maj", "min"] }, after: [
      "Practice until you can tell them apart before the chord stops ringing.",
    ] },
    { type: "guide", slug: "major-and-minor-chords", text: "Want more on that one note? This guide plays major and minor side by side, as chords and as scales." },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Take the C chord and find its root, 3rd and 5th on your own, then check with Intervals.",
      "Play the Am chord one string at a time, low to high, and say what each note is: R, ♭3 or 5.",
      "Strum only the top four strings of the G chord. Is it still the G chord?",
    ] },
    { type: "p", text: "Soon you'll see the root of a chord before your fingers land. That's what makes the triads and arpeggios of [stage 5](/course/5/triads) feel familiar." },
  ],
};
