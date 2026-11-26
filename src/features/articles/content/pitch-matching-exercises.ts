import type { Article } from "../model";

export const pitchMatchingExercises: Article = {
  slug: "pitch-matching-exercises",
  title: "Pitch matching exercises for singers",
  metaTitle: "Pitch Matching Exercises for Singers, with Live Feedback · attunr",
  description: "Five pitch matching exercises you can sing right here, with your pitch drawn live over the note: a held Do, a slide, two agility runs and sing-back.",
  intro: "Sing a note, see where you landed, nudge it. Five exercises you can do right on this page.",
  updated: "2026-11-26",
  sings: true,
  blocks: [
    { type: "p", text: "Pitch matching is singing the note you hear, right on it. It sounds simple, and it's one of the most useful things you can practice." },
    { type: "p", text: "Here's the catch: lots of singers sit a little under or a little over on some notes, and can't hear it themselves. It's not a big miss. It's a slightly flat Mi, or a top note that lands a bit sharp. Working on that precision is what makes a voice sound sure of itself." },
    { type: "p", text: "That's where **live feedback** helps. Each exercise below draws your voice as a line over the note while you sing. You hear the drone, you see your line, and you can nudge it up or down until the two meet. When you're right on the note, the wobble in the sound goes away and it turns smooth, so your ears learn the target too, not just your eyes." },

    { type: "h2", text: "Before you start: look after your voice" },
    { type: "list", items: [
      "Warm up first. A few lip rolls and hums are enough: [here's a five-minute routine](/learn/vocal-warm-ups).",
      "Sing at an easy volume. Pitch matching needs a quiet, steady note, not a loud one.",
      "Stay in the comfortable middle of your voice. Every exercise here starts low.",
      "Keep it short: ten minutes of focused practice beats an hour of tired singing.",
      "Stop if your throat feels tight, scratchy or sore, and rest it. There's more in [Look after your voice](/voice-care).",
    ] },
    { type: "care", text: "Don't reach for high notes: if a note feels like a stretch, sing it an octave lower or leave it out." },

    { type: "h2", text: "Set up in thirty seconds" },
    { type: "list", items: [
      "Pick your voice in **Your voice** above the first exercise, so the notes sit where you can sing them. Not sure? Start with the one that sounds like you and change it if the notes feel high.",
      "Headphones help: the mic hears you and not the drone. Any mic works, even your laptop's. If you're thinking of buying one, [here's a simple setup](/learn/microphone-and-audio-interface-for-singing).",
      "Every exercise asks for the mic. Your voice stays in your browser: nothing is recorded or sent anywhere.",
    ] },

    { type: "exercise", title: "1. One note, dead centre", lines: [
      "Start with the easiest target there is: one note over a drone. Press Start microphone below to start the mic. Then press Play beside the drone to hear Do.",
      "Sing the low Do on \"oo\" and hold it. Watch your line: is it sitting on the note, a little under or a little over?",
      "Now play with it. Slide a little sharp on purpose, then back to the centre. Then a little flat, and back. Listen for the wobble in the sound when you're off, and the moment it goes smooth.",
      "Practice until you can land on the low Do and hold it there without the line drifting.",
    ], tool: { type: "staff", scale: "major-ionian", key: "d", voice: "tenor", labels: "solfege", enable: ["1"], others: "hidden", drone: true } },

    { type: "exercise", title: "2. The siren to Sol", lines: [
      "Same drone, two notes now: Do and Sol, the 5th note of the scale. On \"oo\", slide slowly from Do up to Sol and back down, like a siren.",
      "Then sing the two as a clean jump, with no slide between them. The slide shows you the way; the jump checks you remember it.",
      "If Sol lands under the note, it's usually a tired breath: take a fresh one before you jump.",
    ], tool: { type: "staff", scale: "major-ionian", key: "f", voice: "tenor", labels: "solfege", notes: ["1", "5"], drone: true }, after: [
      "_Don't reach for high notes: turn the siren round at Sol._",
    ] },

    { type: "exercise", title: "3. Agility: back to Do every time", lines: [
      "Now let's get your voice moving. Every note goes out from Do and comes straight back, one step further each time:",
      "**Do Re Do, Do Mi Do, Do Fa Do, Do Sol Do.**",
      "Start on the low Do and sing along on the note names. Go slowly, one note at a time, and check each one lands on its line before you move on. Coming back to Do every time gives your ear a home to check against.",
      "Once it feels easy, sing it a little faster, as one smooth line. Practice until each note starts in tune, with no slide into it.",
    ], tool: { type: "staff", scale: "major-ionian", key: "c", voice: "tenor", labels: "solfege", notes: ["1", "2", "3", "4", "5"], highlight: ["1"], drone: true } },

    { type: "exercise", title: "4. Agility: Do in between", lines: [
      "Same notes, a quicker pattern. Do comes back after each note, but you keep climbing:",
      "**Do Re Do Mi Do Fa Do Sol.**",
      "This one is trickier, because each jump out from Do is a little bigger than the last. Start on the low Do and sing it slowly first, on the note names. Listen for each jump landing straight on its note, not sliding into it.",
      "Then try it backwards for fun: Do Sol Do Fa Do Mi Do Re Do.",
    ], tool: { type: "staff", scale: "major-ionian", key: "c", voice: "tenor", labels: "solfege", notes: ["1", "2", "3", "4", "5"], highlight: ["1"], drone: true } },

    { type: "exercise", title: "5. Hear it, sing it back", lines: [
      "No line on the screen for this one: just your ears. Press Start below to hear two notes, one after the other.",
      "Sing both notes back on \"la\" before you answer. Then pick the answer you think it is, and listen again.",
      "Singing it back first is the pitch matching part. The answer just tells you whether your ears caught it.",
    ], tool: { type: "interval-ears", set: [3, 4, 7, 9], dir: "up" } },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Go down instead of up: Do Ti Do, Do La Do, Do Sol Do, under the low Do.",
      "Hum the note first, then open to \"oo\" on the same pitch.",
      "Close your eyes while you sing, then open them and check where your line is. It's a fun way to find out whether your ears or your eyes are doing the work.",
      "Change **Your voice** to the one next to yours, and the same patterns move higher or lower.",
    ] },

    { type: "h2", text: "What you'll notice" },
    { type: "p", text: "The first thing that gets easier is the start of each note: less sliding in from underneath. Then the long notes get steadier. After a while you'll catch a flat note in a song before you see it on a screen, and that's the whole point." },
    { type: "p", text: "Want this every day, picked for your voice? [attunr](/) puts pitch matching, warm-ups and songs into a short plan for each day." },
  ],
};
