import type { CourseArticle } from "../model";

/** Course section `stretching-your-range`, written in the /learn articles' style. */
export const stretchingYourRange: CourseArticle = {
  updated: "2026-11-28T02:29",
  sings: true,
  blocks: [
    { type: "p", text: "In [Fast runs](/course/9/fast-runs) each pass climbed until it reached the top of your range. This page works on the edges themselves: the middle of your voice first, then a few notes lower and higher." },
    { type: "p", text: "Your range grows from its edges, a little at a time, and only while the sound stays easy. Pushing for a note you can't reach yet doesn't stretch anything: it tires your voice and makes the next note harder." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Warm up first with the [vocal warm-ups](/learn/vocal-warm-ups). Range work comes after them, never before.",
      "Keep it quiet. A high note sung loudly is a pushed one.",
      "Pick your voice in **Your voice** above, so the tools start where you can sing.",
      "Stop if your throat feels tight, scratchy or sore, and rest. More in [Look after your voice](/voice-care).",
    ] },
    { type: "care", text: "Never push for a note. If it feels tight, that's the edge for today: stay just under it." },

    { type: "exercise", title: "1. Lip rolls through the middle", lines: [
      "A lip roll keeps buzzing only while your air is steady and your throat is loose. So the buzz tells you the moment you start to push.",
      "Press Start below to begin the rounds: the mic starts with it. The tone slides from high to low and plays the whole time. Lip roll along, and keep the buzz even as the slide passes through the middle of your voice.",
      "Join the slide where the buzz comes easily. Practice until the buzz stays even all the way down.",
    ], tool: { type: "lip-roll", shape: "down", play: "always", plays: 4, voice: "tenor" }, after: [
      "**Don't worry if you're not on the note, or if your mic can't pick up the buzz.** An even buzz matters much more than the note.",
    ] },

    { type: "exercise", title: "2. Across the break", lines: [
      "Somewhere in the middle of your range, your voice wants to flip from its full, low sound to a lighter one. That's the break in your voice. A slide passes through every pitch, so it carries you across with no step to jump.",
      "Press Start below to begin the rounds. The tone slides up and back down, so you cross the break twice in each round. Lip roll along with the tone, then make the same slide on your own. Let the sound get lighter, not louder, as it climbs.",
      "If the buzz stops at the break, start the next slide more quietly.",
    ], tool: { type: "lip-roll", shape: "siren", speed: "slow", plays: 4, voice: "tenor" }, between: [
      "Now the same slide on an open sound. Press Start microphone below to start the mic. Then press Play beside the drone to hear Do.",
      "Slide from the low Do up to Sol and back in one unbroken sound, like the lip roll. Sing it on \"oo\".",
      "Practice until your line climbs without a jump.",
    ], beside: { type: "staff", scale: "major-ionian", key: "a", voice: "tenor", notes: ["1", "5"], drone: true }, after: [
      "_Keep the slide quiet, and stop if your throat tightens._",
    ] },

    { type: "exercise", title: "3. A few notes lower, a few higher", lines: [
      "Press Start below: a note plays first, then the mic starts. Hold it on \"oo\" and keep the ball in the hollow while the ring fills. Each hold is a semitone lower, and the new note plays in the breath between.",
      "Keep it quiet: a low note pushed for volume goes flat.",
    ], tool: { type: "voice-hill", where: "low", sound: "oo", seconds: 4, reps: 6, voice: "tenor" }, between: [
      "Now the top. Press Start below and hold a light \"oo\": the ball climbs to the top as your voice goes up. Keep it as quiet as the low holds.",
      "Stop at the hold that no longer feels easy. That's the edge of your range today, and it moves a little at a time.",
    ], beside: { type: "voice-hill", where: "high", sound: "oo", seconds: 3, reps: 6, voice: "tenor" }, after: [
      "_Don't push for the top: stop if your throat tightens._",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Lip roll the tune of a song you know before you sing it with words.",
      "Do the slide from Do to Sol on \"ee\", then on a hum.",
      "End a session with one lip roll sliding down, to settle your voice.",
    ] },
    { type: "p", text: "First the break gets smoother: the flip turns into a small bump. Then a note or two at each edge starts to feel easy." },
  ],
};
