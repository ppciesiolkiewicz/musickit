import type { CourseArticle } from "../model";

/** Course section `vocal-runs`, written in the /learn articles' style. */
export const vocalRuns: CourseArticle = {
  updated: "2026-11-28T02:29",
  versions: { agents: 3, teaching: 14, voice: 6 },
  sings: true,
  blocks: [
    { type: "p", text: "A run is a quick string of scale notes sung on one vowel, like the little flourish at the end of a soul or pop line. After the held notes of [A harmony line](/course/6/harmony-line), this is the other way round: many notes, each one short." },
    { type: "p", text: "Fast and clean starts slow and clean. Each run here starts at 40 bpm, and you speed it up only once every note is clear." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Warm up first: the [vocal warm-ups](/learn/vocal-warm-ups) end with the same five-note run.",
      "Keep it light and quiet. Pushing makes a run heavy and slow.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
    ] },

    { type: "exercise", title: "1. Do to Sol and back", lines: [
      "Press Play below to hear the run: the mic starts with it. Sing along on \"oo\": Do Re Mi Fa Sol Fa Mi Re Do, two notes to a beat. Each pass starts a semitone higher.",
      "Keep the air going from note to note, with no little \"h\" before each one.",
      "Once every note is clear, try it faster. Use the Tempo selector below to speed it up, then press Play.",
      "When you change the tempo, the notes stay the same and come closer together.",
    ], tool: { type: "run-singer", pick: { stage: "five", index: 0 }, voice: "tenor", bpm: 40 }, after: [
      "_Don't reach for high notes: stop at the pass where the top starts to feel tight._",
    ] },

    { type: "exercise", title: "2. Four notes to a beat", lines: [
      "The same notes, now four to a beat: up to Sol and back down twice, then a long Do.",
      "Press Play below and sing along on \"oo\". Practice until the run sounds even, with no note louder or longer than the rest.",
      "If a note gets lost, go back to the first run at the same tempo, then come back.",
    ], tool: { type: "run-singer", pick: { stage: "five", index: 2 }, voice: "tenor", bpm: 40 } },

    { type: "exercise", title: "3. The home chord, quick", lines: [
      "Now skips instead of steps: Do Mi Sol, up to the high Do and back down.",
      "Press Play below to hear the run: the mic starts with it. Sing along on the note names, then sing it on \"oo\".",
      "Practice until the high Do is as clear as the low one.",
      "If the high Do comes out flat, hear it in your head before you leave Sol.",
    ], tool: { type: "run-singer", pick: { stage: "arpeggio-run", index: 0 }, voice: "tenor", bpm: 40 }, after: [
      "_Don't reach for high notes: the high Do can wait for a lower pass._",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Sing the five-note run on \"ee\", then on \"ah\" in the low passes.",
      "Start from the top: Sol Fa Mi Re Do Re Mi Fa Sol.",
      "Turn round one note: Mi Fa Mi Re Mi, the note above, the note, the note below and back.",
      "End a line you sing with a short run that lands on Do.",
    ] },
    { type: "p", text: "First the notes stop smudging into each other. Then the same run comes out clean at a faster tempo." },
  ],
};
