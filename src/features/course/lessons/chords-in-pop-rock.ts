import type { CourseArticle } from "../model";

/** Course section `chords-in-pop-rock`, written in the /learn articles' style. */
export const chordsInPopRock: CourseArticle = {
  updated: "2026-11-28T02:30",
  blocks: [
    { type: "p", text: "You've spent this stage on colour chords. Pop and rock mostly don't need them. They lean on a few plain chords of the key, in a few orders, played with a lot of conviction." },
    { type: "p", text: "Learn those orders by their numbers and you'll hear them in song after song. You already know the 1st, 4th and 5th chords from [1 → 4 → 5 → 1](/course/5/one-four-five). Pop adds one more: the minor chord on the 6th note, the relative minor from [La: the minor home](/course/3/la-minor-home)." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Keep your strumming wrist loose. If your forearm tightens, stop and shake it out.",
    ] },

    { type: "exercise", title: "1. Four chords of G major", lines: [
      "The G chord is the 1st chord of G major, built on G. The D chord is the 5th chord, built on D. The Em chord is the 6th, built on E, and the C chord is the 4th, built on C.",
      "Press each chord box below in that order: 1st, 5th, 6th, 4th. Listen for the one minor chord.",
    ], tool: { type: "chord-shapes", chords: ["G", "D", "Em", "C"] }, after: [
      "That's the pop loop. Let It Be by the Beatles goes round it in C (C, G, Am, F), and With or Without You by U2 in D (D, A, Bm, G).",
    ] },

    { type: "exercise", title: "2. Strum the pop loop", lines: [
      "Press Play below to start the metronome. After a bar of count-in, play the island strum, one bar on each chord.",
      "If a change comes late, keep your strumming hand going and catch the next beat 1.",
    ], tool: { type: "strum-along", chords: ["G", "D", "Em", "C"], bpm: 60, pattern: "D . D U . U D U" }, after: [
      "Practice until the loop goes round without a gap at the changes.",
    ] },

    { type: "exercise", title: "3. Call out the numbers", lines: [
      "Press Play below to start the backing track: the same four chords, one bar each, round and round. Call out 1, 5, 6 or 4 as each chord arrives.",
      "Then strum along with it, and keep calling the numbers in your head.",
    ], tool: { type: "backing-track", progression: "pop", key: "g", style: "pop", bpm: 64 }, after: [
      "Practice until you hear the minor chord coming before its box lights.",
    ] },

    { type: "h2", text: "The rock move" },
    { type: "p", text: "Rock often borrows one chord from outside the key. In D major the 7th note is C♯, but rock plays the C chord, a fret lower. D, C and G is the sound of Sweet Home Alabama by Lynyrd Skynyrd, from [First songs](/course/2/first-songs)." },

    { type: "exercise", title: "4. D, C, G, D", lines: [
      "Press Play below to start the metronome. Play eight downstrums in each bar, two on every beat, and dig in a little more than for the pop loop.",
      "Listen for the C chord: it's the one chord here that isn't in D major.",
    ], tool: { type: "strum-along", chords: ["D", "C", "G", "D"], bpm: 60, pattern: "D D D D D D D D" }, after: [
      "Practice until the downstrums stay even through every change.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Start the pop loop on the Em chord: Em, C, G, D. Same four chords, but now it sounds minor.",
      "Play the pop loop in C: C, G, Am and F. The F chord is a barre from [stage 6](/course/6/barres-every-key), or play Fmaj7 in its place.",
      "Swap the D chord in the rock loop for Dsus4 on its last bar, then back to D.",
    ] },
    { type: "p", text: "Soon you'll hear the loop in a new song and know its numbers before you've found the key." },
  ],
};
