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
    { type: "p", text: "A warm-up wakes your voice up gently before you ask anything hard of it. You don't need thirty minutes. One breathing exercise, a buzz or two and an easy note are plenty for a beginner." },
    { type: "p", text: "Go in this order: breath, then lip rolls, then sound. Each step asks a little more of your voice than the one before." },

    { type: "h2", text: "A few ground rules" },
    { type: "list", items: [
      "Start quiet and low. Your voice gets louder and higher on its own once it's warm.",
      "Nothing should hurt. If your throat feels tight or scratchy, stop and rest it.",
      "Don't warm up on a sore throat or when you're losing your voice. Rest is the warm-up then.",
      "Keep some water nearby and sip it as you go.",
      "There's more in [Look after your voice](/voice-care).",
    ] },

    { type: "exercise", title: "1. Breathe in, hold, breathe out", lines: [
      "Press Start in the circle below to begin. The circle grows as you breathe in, stays while you hold, and shrinks as you breathe out.",
      "Keep your shoulders still and let your belly do the moving.",
      "Practice until your breath out is as slow at the end as at the start.",
    ], tool: { type: "breathwork", drill: "farinelli", level: "beginner" } },

    { type: "exercise", title: "2. A hiss, then a buzz", lines: [
      "Press Start in the circle below. Hiss on \"sss\", add your voice for \"zzz\", then hiss again, as the circle shows.",
      "Keep the air moving at the same speed through all three. The buzz is just your voice riding on the same air.",
    ], tool: { type: "breathwork", drill: "sss-zzz" } },

    { type: "exercise", title: "3. Lip rolls, sliding down", lines: [
      "Time to sound like a motorboat. Close your lips loosely and blow through them so they flap and buzz, with a little voice behind it. That's a lip roll.",
      "Press Start below to begin: the mic starts with it. A tone slides from high to low. Lip roll along with it, and your line draws over the tone's path.",
      "**Don't worry if you're not on the note, or if your mic can't pick up the buzz.** A lip roll is hard for a mic to read, and that's fine. An even buzz matters much more here than an exact note.",
      "Can't get your lips to buzz? Press two fingers gently into your cheeks, just beside the corners of your mouth. It takes some of the weight off your lips. Or roll your tongue instead, like a rolled \"r\".",
    ], tool: { type: "lip-roll", shape: "down", play: "always", plays: 3, voice: "tenor" } },

    { type: "exercise", title: "4. Lip rolls, up and back down", lines: [
      "Same buzz, now a siren: the tone slides from low to high and back down. Press Start below and lip roll along with it in one breath.",
      "If the buzz stops on the way, breathe in and join the tone again with less air. Again: the note matters less than the buzz.",
    ], tool: { type: "lip-roll", shape: "siren", play: "always", plays: 3, voice: "tenor" }, after: [
      "_Don't reach for high notes: let the buzz go when the top stops feeling easy._",
    ] },

    { type: "exercise", title: "5. Hum, then open", lines: [
      "Last one, and now it's a real note. Press Start microphone below to start the mic. Then press Play beside the drone to hear Do.",
      "Hum the low Do with your lips closed. Then open it to \"oo\" on the same note, without the pitch moving.",
      "Then jump up to Sol and do the same: hum first, then open.",
      "Practice until the \"oo\" comes out on the same note the hum was on.",
    ], tool: { type: "staff", scale: "major-ionian", key: "d", voice: "tenor", labels: "solfege", notes: ["1", "5"], drone: true }, after: [
      "_Don't reach for high notes: Sol here is the one just above the low Do._",
    ] },

    { type: "h2", text: "Warm? Now sing" },
    { type: "p", text: "Your voice is ready for something with a target. Try the [pitch matching exercises](/learn/pitch-matching-exercises): the same mic, the same drone, and a line that shows how close you land." },
    { type: "p", text: "Want a warm-up like this at the start of every practice? [attunr](/) builds one into each day's plan." },
  ],
};
