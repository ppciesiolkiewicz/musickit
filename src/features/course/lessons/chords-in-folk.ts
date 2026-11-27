import type { CourseArticle } from "../model";

/** Course section `chords-in-folk`, written in the /learn articles' style. */
export const chordsInFolk: CourseArticle = {
  updated: "2026-11-28T02:30",
  blocks: [
    { type: "p", text: "Pop loops four chords. Folk often needs only three: the 1st, 4th and 5th chords of the key, often with a 7th on the 5th chord to pull it home. In G major that's the G chord, built on G, the C chord, built on C, and D7, built on D: all open chords, all ringing." },
    { type: "p", text: "What makes it folk is less the chords than how they move. Many folk songs and hymns count in three, a waltz: 1 2 3, 1 2 3. Leaving on a Jet Plane by John Denver needs only G, C and D, and Amazing Grace, a traditional hymn, is a waltz." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab. Open chords ring longer, so you'll hear a string out of tune.",
      "Keep your strumming wrist loose. If your forearm tightens, stop and shake it out.",
    ] },

    { type: "exercise", title: "1. Count in three", lines: [
      "Press Play below to start the backing track: G, C, D7 and G, one bar each, three beats to a bar.",
      "Count \"1 2 3\" out loud with each bar. Then call out each chord's number as it arrives: 1, 4, 5, 1.",
    ], tool: { type: "backing-track", progression: "waltz", key: "g", style: "waltz", bpm: 64 }, after: [
      "Practice until beat 1 of each bar feels heavier than 2 and 3 without you counting.",
    ] },

    { type: "exercise", title: "2. The waltz strum", lines: [
      "Press Play below to start the metronome. After a bar of count-in, strum down on beat 1, then down and up on beats 2 and 3.",
      "If a change comes late, keep your strumming hand going and catch the next beat 1.",
    ], tool: { type: "strum-along", chords: ["G", "C", "D7", "G"], bpm: 60, beats: 3, pattern: "D . D U D U" }, after: [
      "Practice until the strum is in your muscle memory and your eyes can stay on the chord boxes.",
    ] },

    { type: "exercise", title: "3. A song of your own", lines: [
      "Here's a folk song with no words yet: a verse and a chorus, from the same three chords. Press Play below to start the backing track, and play the waltz strum with it.",
      "The chart lights the bar you're in, so look ahead to the next chord.",
    ], tool: { type: "song-chart", key: "g", style: "waltz", bpm: 64, sections: [
      { name: "Verse", bars: ["G", "C", "G", "D7"] },
      { name: "Chorus", bars: ["C", "G", "D7", "G"] },
    ], form: ["Verse", "Verse", "Chorus", "Verse"], parts: { drums: "on", bass: "on" } }, after: [
      "Practice until you get through the whole song without stopping. Then hum a tune of your own over it.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "On beat 1, pick only the lowest note of the chord, its root, then strum on 2 and 3. That's the bass-and-strum sound of a lot of folk guitar.",
      "Play Cadd9 in place of the C chord, and Dsus4 then D in place of D7, from [sus & add9](/course/7/sus-add9).",
      "Try a minor folk loop in E minor: Em, D, Em, then C, D, Em.",
    ] },
    { type: "p", text: "Soon three chords will be enough to play along with a whole songbook. Next stage leaves position 1 for [the D, C and A shapes](/course/8/d-c-a-shapes)." },
  ],
};
