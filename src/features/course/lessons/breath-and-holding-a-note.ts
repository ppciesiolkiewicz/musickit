import type { CourseArticle } from "../model";

/** Course section `breath-and-holding-a-note`, written in the /learn articles' style. */
export const breathAndHoldingANote: CourseArticle = {
  updated: "2026-11-27T20:49",
  versions: { agents: 2, teaching: 13, voice: 5 },
  sings: true,
  blocks: [
    { type: "p", text: "A held note is only as steady as the air under it. When the air comes out evenly, the note stays still. When it rushes or runs out, the note wobbles or drops flat at the end." },
    { type: "p", text: "So this page starts with breath and no singing, then adds a sound, then a note over the drone. It's the same steady air each time." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Stand or sit tall, with your shoulders loose.",
      "Breathe low: your belly moves, your shoulders stay still.",
      "Feel dizzy? Stop and breathe normally for a bit.",
      "Sing quietly. More in [Look after your voice](/voice-care).",
    ] },

    { type: "exercise", title: "1. A long breath out", lines: [
      "Press the Start button in the circle below and breathe with it: in for 4, then out slowly while the circle shrinks.",
      "Let the air out through a small gap in your lips, as if you're cooling soup.",
      "Practice until your breath out is as slow at the end as at the start.",
    ], tool: { type: "breathwork", drill: "long-exhale" } },

    { type: "exercise", title: "2. Hold an easy \"oo\"", lines: [
      "Press the Start button below: a note plays first, then the mic starts.",
      "Sing an easy \"oo\" near that note and keep the ball in the valley between the two marks until the ring fills. Then take a breath before the next hold.",
      "If the ball wobbles, sing a little quieter: less air is easier to keep steady.",
    ], tool: { type: "voice-hill", where: "middle", sound: "oo", seconds: 5, reps: 4, voice: "tenor" } },

    { type: "exercise", title: "3. One breath, one note", lines: [
      "Press the Start microphone button below to start the mic. Then press the Play button beside the drone to hear G, your Do.",
      "Breathe in low, then hold the low Do on \"oo\" for as long as it feels easy. Stop before you run out, and breathe.",
      "Then hold Mi the same way, then Sol. Watch your line at the end of each note: it should stay as flat as at the start.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", notes: ["1", "3", "5"], drone: true }, after: [
      "_Don't push to the end of your air: stop while the note still feels easy._",
    ] },

    { type: "guide", slug: "vocal-warm-ups", text: "Breathing and holding notes make a good start to any singing. This guide has a five-minute warm-up built around them." },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Hold a note on a hum, then open it to \"oo\" halfway through without the line moving.",
      "Start a held note quiet, let it grow a little, then let it fade.",
      "Hold the last note of a song you know, and watch your line on the staff.",
    ] },
    { type: "p", text: "First the end of each note stops dropping. Then your notes get longer without you trying." },
  ],
};
