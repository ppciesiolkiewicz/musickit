import type { CourseArticle } from "../model";

/** Course section `one-four-five`, written in the /learn articles' style: the 1st, 4th and 5th chords of G major and E minor, and the circle of fifths. */
export const oneFourFive: CourseArticle = {
  updated: "2026-11-28T16:02",
  versions: { agents: 3, teaching: 16, voice: 7 },
  blocks: [
    { type: "p", text: "In [Chords from the scale](/course/5/chords-from-scale) you built all seven chords of G major. Here's the good news: three of them do most of the work in songs." },
    { type: "p", text: "They're the chords on the 1st, 4th and 5th notes of the scale. Learn how those three sit under your hand and how they sound, and you can play along with a great many songs, in any key." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Keep your strumming hand loose, and strum lightly.",
    ] },
    { type: "care", text: "_Stop and shake out your hand as soon as it aches._" },

    { type: "exercise", title: "1. Three notes: 1, 4, 5 and home", lines: [
      "Under this is the neck with the notes of the G major scale. All but {{1}}, {{4}} and {{5}} are faded: those three are G, C and D, or Do, Fa and Sol.",
      "Start on the ringed {{1}} on the low E string, then play {{4}} beside it on the A string. Then play {{5}}, two frets up the A string, and the ringed {{1}} beside it on the D string.",
      "Sing along on the note names: Do, Fa, Sol, Do.",
    ], tool: { type: "scale-neck", scale: "major-ionian", key: "g", placement: { by: "open" }, enable: ["1", "4", "5"], highlight: ["1"] }, after: [
      "Listen for the two moves: {{4}} sounds like moving away from home, and {{5}} sounds like it has to go back.",
      "Practice until you can sing the next note before you play it.",
    ] },

    { type: "exercise", title: "2. Three chords in time", lines: [
      "Now put a chord on each note. The G chord is the 1st chord of G major, built on {{1}}. The C chord is the 4th chord, built on {{4}}. The D chord is the 5th chord, built on {{5}}.",
      "Press Play below to start the metronome at 60 bpm. After a bar of count-in, the lit chord box shows the chord to play: strum down on every beat.",
      "If a change comes late, keep your strumming hand going and catch the next beat 1.",
    ], tool: { type: "strum-along", chords: ["G", "C", "D", "G"], bpm: 60, pattern: "D D D D" }, after: [
      "Say its number as each chord arrives: 1, 4, 5, 1.",
      "Practice until your hand is already moving to the next chord on beat 4.",
    ] },

    { type: "exercise", title: "3. The same path in E minor", lines: [
      "E minor has the same notes as G major, with E as the home note. Its 1st chord is Em, built on E, and its 4th chord is Am, built on A.",
      "Its 5th chord is Bm, built on B, and Bm needs a barre: that's [stage 6](/course/6/bm-barre). Until then, play B7. It has no barre, and it pulls home to the Em chord even harder.",
      "Press Play under the B7 chord box below to hear it, and find it with your fingers.",
    ], tool: { type: "chord-shapes", chords: ["Em", "Am", "B7"] }, between: [
      "Press Play below to start the metronome, and strum down on every beat: Em, Am, B7 and back to Em.",
    ], beside: { type: "strum-along", chords: ["Em", "Am", "B7", "Em"], bpm: 60, pattern: "D D D D" }, after: [
      "When you change from G major to E minor, the chords are new but the path sounds the same: away on the 4th chord, back home after the 5th.",
    ] },

    { type: "exercise", title: "4. Why the 4th and the 5th", lines: [
      "Put the twelve notes in a ring, each one a 5th above the last, and you have the circle of fifths.",
      "Below, G is the key. Its neighbours are C on one side and D on the other: the 4th and 5th chords you just played. Em, the relative minor, sits inside.",
      "Tap another key on the circle to see its 1st, 4th and 5th chords the same way.",
    ], tool: { type: "circle-of-fifths", key: "g", scale: "major-ionian" }, after: [
      "When you change the key, the letters change, and the 4th and 5th chords are still the two neighbours.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Change the order: play G, D, C, G, and hear which chord now asks to go home.",
      "Tap A on the circle, read off its 4th and 5th chords, and play all three with four strums each.",
      "Open [First songs](/course/2/first-songs) and find the 1st, 4th and 5th chords in each song.",
    ] },
    { type: "p", text: "Soon you'll hear the 4th and 5th chords coming before your hand gets there. [Hearing chord changes](/course/5/hearing-changes) trains just that." },
  ],
};
