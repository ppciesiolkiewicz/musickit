import type { CourseArticle } from "../model";

/** one chord of a chord-steps line: the same note of the chord on all four beats */
const held = (chord: string, degree: string) => ({ chord, steps: [degree, degree, degree, degree] });

/** Course section `guide-tones`, written in the /learn articles' style. */
export const guideTones: CourseArticle = {
  updated: "2026-11-28T02:28",
  blocks: [
    { type: "p", text: "In [Comping](/course/11/comping) you split each shell in two: the root on its own, then the 3rd and 7th together. Those two notes are the guide tones, and they do more than fill a chord." },
    { type: "p", text: "The 3rd says major or minor, the 7th says which kind of 7th chord. Through a ii–V–I each of them stays put or slides down one step, so two short lines carry all three chords. Find them, and your fills and solos start to follow the changes." },
    { type: "care", text: "_Rest your hand when your thumb or wrist starts to ache._" },

    { type: "exercise", title: "1. Two notes per chord", lines: [
      "Here's the ii–V–I in C again: Dm7, G7, then two bars of Cmaj7. Press Play below to start the backing track, and play only the 3rd and the 7th of each chord from the tab, one note per beat.",
      "Watch how little your hand moves from one chord to the next.",
    ], tool: { type: "guitar-play-along", shape: { shape: "chord-steps", chords: [
      { chord: "Dm7", steps: ["b3", "b7", "b3", "b7"] },
      { chord: "G7", steps: ["3", "b7", "3", "b7"] },
      { chord: "Cmaj7", steps: ["3", "7", "3", "7"] },
      { chord: "Cmaj7", steps: ["3", "7", "3", "7"] },
    ] }, bpm: 60, view: "tab" }, after: [
      "Practice until you can play a round with your eyes off the tab.",
    ] },

    { type: "exercise", title: "2. Two lines through the changes", lines: [
      "Now play one guide tone per chord, so the notes make a line. The first line starts on F, the 3rd of Dm7. F stays as the 7th of G7, then falls a half step to E, the 3rd of Cmaj7.",
      "Press Play below to start the backing track, and play the line from the tab.",
    ], tool: { type: "guitar-play-along", shape: { shape: "chord-steps", chords: [held("Dm7", "b3"), held("G7", "b7"), held("Cmaj7", "3"), held("Cmaj7", "3")] }, bpm: 60, view: "tab" }, between: [
      "The second line starts on C, the 7th of Dm7. C falls a half step to B, the 3rd of G7, and B stays as the 7th of Cmaj7.",
      "Listen for the bar where your note stays and the chord changes under it.",
    ], beside: { type: "guitar-play-along", shape: { shape: "chord-steps", chords: [held("Dm7", "b7"), held("G7", "3"), held("Cmaj7", "7"), held("Cmaj7", "7")] }, bpm: 60, view: "tab" }, after: [
      "Practice until you can play each line without the tab. Then sing it on \"oo\" as you play: two slow tunes that spell out the whole ii–V–I.",
    ] },

    { type: "exercise", title: "3. Shell, then a line", lines: [
      "Press Play below to start the backing track. Strike the lit shell on beat 1 of each chord, then fill the rest of the bar with a short line in C major.",
      "The ringed notes are the chord's 3rd and 7th, so end the line on one of them.",
      "If the line gets lost, play just the shell and one ringed note, then add notes before it.",
    ], tool: { type: "guitar-play-along", shape: { shape: "solo-over", key: "c", scale: "major-ionian", chords: [
      { chord: "Dm7", target: ["b3", "b7"], stab: { grip: ["1", "b3", "b7"], strings: "543" } },
      { chord: "G7", target: ["3", "b7"], stab: { grip: ["1", "3", "b7"], strings: "543" } },
      { chord: "Cmaj7", target: ["3", "7"], stab: { grip: ["1", "3", "7"], strings: "543" } },
      { chord: "Cmaj7", target: ["3", "7"], stab: { grip: ["1", "3", "7"], strings: "543" } },
    ] }, bpm: 60, view: "neck" }, after: [
      "Practice until the shell and the line sound like one phrase: this is how you fill the gaps between a singer's lines.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Play the two lines over the ii–V–i in A minor from [ii–V–I](/course/11/ii-v-i): Bm7♭5, E7 and Am7. Find the 3rd and 7th of each chord first.",
      "Play one line on the guitar and sing the other on \"oo\".",
      "Take the changes of Autumn Leaves from [Jazz standards](/course/11/jazz-standards) and find a guide-tone line through the first four chords.",
    ] },
    { type: "p", text: "Soon you'll hear the changes as two quiet lines moving under the tune, and you'll know where to land before the chord arrives." },
  ],
};
