import type { CourseArticle } from "../model";

/** Course section `singing-leaps`, written in the /learn articles' style. */
export const singingLeaps: CourseArticle = {
  updated: "2026-11-28T02:29",
  versions: { agents: 3, teaching: 14, voice: 6 },
  sings: true,
  blocks: [
    { type: "p", text: "In [Every interval by ear](/course/6/every-interval) you learned to hear each interval. Now you sing the wide ones: the 4th, the 5th and the octave." },
    { type: "p", text: "A leap goes wrong when you jump and hope. It lands when you hear the note in your head first, then sing it. You may know the sounds already: Here Comes the Bride opens with a 4th, Star Wars with a 5th, and Somewhere Over the Rainbow with an octave." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Warm up first: the [vocal warm-ups](/learn/vocal-warm-ups) take five minutes.",
      "Keep the top note light. A leap is a jump in pitch, not in volume.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. Hear it, then leap", lines: [
      "Press Start microphone below to start the mic. Then press Play beside the drone to hear Do.",
      "Tap the ringed Fa to hear it, and hear it again in your head. Then sing the low Do on \"oo\" and leap up to Fa. Come back down to Do.",
      "Do the same from the low Do up to Sol and back.",
      "Practice until your line lands on the note without sliding up into it.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", notes: ["1", "4", "5"], highlight: ["4", "5"], labels: "solfege", drone: true }, after: [
      "If your line slides, hum the note quietly first, then sing the leap again.",
    ] },

    { type: "exercise", title: "2. A 4th in a tune", lines: [
      "This tune leaps a 4th, from Do up to Fa, then steps down home.",
      "Press Play below to hear the tune: the mic starts with it. Sing along on the note names.",
      "Once you can hear Fa coming, press Tune below to mute the tune, and sing it over the chords alone.",
    ], tool: { type: "melody-singer", pick: { stage: "fourths", index: 0 }, key: "g", voice: "tenor", bpm: 40 }, parts: [
      { title: "Now a 5th, falling", lines: [
        "This one starts on Sol and falls a 5th to Do. Tap its first note below to hear Sol. Then press Play below and sing along on the note names.",
        "If Do comes out flat, sing Sol Fa Mi Re Do slowly, then put the leap back in.",
      ], tool: { type: "melody-singer", pick: { stage: "fifths", index: 1 }, key: "g", voice: "tenor", bpm: 40 } },
    ] },

    { type: "exercise", title: "3. Up to the octave", lines: [
      "Press Start below: Do sounds, the mic starts, and the leap to sing shows by name: P4 for a 4th, P5 for a 5th, P8 for the octave.",
      "Hear the note in your head, then sing it on \"oo\" and hold it until Yes shows. Then press Next below for another one.",
      "For the octave, think of Sol on the way up and go past it to the high Do.",
      "Practice until the octave lands as surely as the 5th.",
    ], tool: { type: "interval-singer", key: "g", voice: "tenor", intervals: [5, 7, 12], dir: "up", play: "do", picker: false }, after: [
      "_Don't reach for high notes: press Skip below when the high Do feels tight._",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "On the staff in the first exercise, leap down from the high Do to Sol, a 4th, and to Fa, a 5th.",
      "Make up a short tune from Do, Fa and Sol with one leap in it, and end it on Do.",
      "Sing the start of a song you know that opens with a leap, and name the leap.",
    ] },
    { type: "p", text: "First the landing note gets easier to hear before you sing it. Then the leaps in songs you know start to sound like a 4th, a 5th or an octave." },
  ],
};
