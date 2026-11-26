import type { Article } from "../model";

export const vocalWarmUps: Article = {
  slug: "vocal-warm-ups",
  title: "Vocal warm-ups for beginners: a five-minute routine",
  metaTitle: "Vocal Warm-ups for Beginners: a 5-Minute Routine with the Mic · attunr",
  description: "A gentle five-minute vocal warm-up you can do on this page: breathing, a hiss and a buzz, lip rolls, and a hum that opens into a note.",
  intro: "Five minutes, five warm-ups, all on this page. Breath first, then buzz, then sound.",
  updated: "2026-11-26",
  sings: true,
  blocks: [
    { type: "p", text: "A warm-up wakes your voice up gently before you ask anything hard of it. Each one below asks a little more than the last." },
    { type: "list", items: [
      "Start quiet and low. Nothing should hurt.",
      "Skip it on a sore throat: rest is the warm-up then.",
      "Keep water nearby. More in [Look after your voice](/voice-care).",
    ] },

    { type: "exercise", title: "1. Breathe in, hold, breathe out", lines: [
      "Press Start in the circle below and breathe with it. Keep your shoulders still and let your belly move.",
      "Practice until your breath out is as slow at the end as at the start.",
    ], tool: { type: "breathwork", drill: "farinelli", level: "beginner" } },

    { type: "exercise", title: "2. A hiss, then a buzz", lines: [
      "Press Start in the circle below. Hiss on \"sss\", buzz on \"zzz\", then hiss again, keeping the air at one speed.",
    ], tool: { type: "breathwork", drill: "sss-zzz" } },

    { type: "exercise", title: "3. Lip rolls, sliding down", lines: [
      "Time to sound like a motorboat: blow through loose lips so they buzz, with a little voice behind it.",
      "Press Start below: the mic starts with it. Lip roll along as the tone slides down.",
      "**Don't worry if you're not on the note, or if your mic can't pick up the buzz.** An even buzz matters much more than the note.",
      "No buzz? Press two fingers gently into your cheeks beside your mouth, or roll your tongue instead.",
    ], tool: { type: "lip-roll", shape: "down", play: "always", plays: 3, voice: "tenor" } },

    { type: "exercise", title: "4. Lip rolls, up and back down", lines: [
      "Press Start below and lip roll along as the tone slides up and back down, in one breath. If the buzz stops, breathe and join again with less air.",
    ], tool: { type: "lip-roll", shape: "siren", play: "always", plays: 3, voice: "tenor" }, after: [
      "_Don't reach for high notes: let the buzz go when the top stops feeling easy._",
    ] },

    { type: "exercise", title: "5. Hum, then open", lines: [
      "Press Start microphone below to start the mic. Then press Play beside the drone to hear Do.",
      "Hum the low Do, then open it to \"oo\" without the pitch moving. Then do the same on Sol.",
    ], tool: { type: "staff", scale: "major-ionian", key: "d", voice: "tenor", labels: "solfege", notes: ["1", "5"], drone: true }, after: [
      "_Don't reach for high notes: Sol here is the one just above the low Do._",
    ] },

    { type: "p", text: "Warm? Try the [pitch matching exercises](/learn/pitch-matching-exercises) next. Or let [attunr](/) put a warm-up at the start of each day's plan." },
  ],
};
