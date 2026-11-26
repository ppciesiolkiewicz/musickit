import type { Article } from "../model";

export const scaleDegreeFeelings: Article = {
  slug: "scale-degree-feelings",
  title: "Learning music theory as a way of naming feelings",
  metaTitle: "Scale Degrees by Ear: Name How Each Note Feels, Interactive · attunr",
  description: "Each note of the scale has a feeling that comes back in any key. Sing it over a drone and name it by scale degree or interval, in interactive exercises.",
  intro: "Every note of a scale has its own feeling, and it's the same in any key. Theory gives that feeling a name. Four interactive exercises to hear it and sing it on this page.",
  updated: "2026-11-26",
  sings: true,
  topics: ["singing", "theory"],
  blocks: [
    { type: "p", text: "Music theory can feel like a pile of names to learn. I like to see it another way: the names are for things you can already feel." },
    { type: "p", text: "Music is relative. A song is the same song in any key, because your ear hears each note against home, Do, not by its letter. That's called relative pitch." },

    { type: "h2", text: "Same note, different feeling" },
    { type: "p", text: "Take the note E. In C major, C is Do and E is Mi: it can rest. In G major, G is Do and the same E is La: it wants to move on." },
    { type: "p", text: "The feeling follows Do, not the letter. Change the key and every letter changes, but Mi still feels like Mi." },

    { type: "h2", text: "Two ways to name a feeling" },
    { type: "list", items: [
      "By scale degree: where the note sits in the key, counted up from Do. Mi is the 3rd.",
      "By interval: the distance from one note to another. Do up to Mi is a major 3rd, in any key.",
    ] },
    { type: "p", text: "Solfège names the degree. The ear game below shows the interval too: M3 for a major 3rd, with Do–Mi under it." },
    { type: "guide", slug: "intervals-and-solfege", text: "New to intervals? This guide names every note from Do both ways, on a piano and on the guitar neck." },

    { type: "h2", text: "How each note feels to me" },
    { type: "list", items: [
      "**Do**: home. You can stop here.",
      "**Re**: one step away from home. It wants to go to Do or Mi.",
      "**Mi**: bright, and it can rest.",
      "**Fa**: leans down to Mi.",
      "**Sol**: open and steady, a second home.",
      "**La**: soft, and it wants to move down to Sol.",
      "**Ti**: pulls up to Do.",
    ] },
    { type: "p", text: "These are my words. Yours may be different, and that's fine: what matters is a name you can find again." },
    { type: "p", text: "Holding a note over a drone is a bit like a yoga pose for me. I stay with it, breathe, and feel the note buzz in my body. Then I notice if it wants to rest or move." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Warm up first: [a five-minute routine](/learn/vocal-warm-ups).",
      "Sing quietly, in the comfortable middle of your voice.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. Sit on each note over Do", lines: [
      "Press Start microphone below to start the mic. Then press Play beside the drone to hear Do.",
      "Sing up the scale from the low Do, slowly. Sing it on the note names, and hold each note for a breath.",
      "Practice until you can tell the notes that rest (Do, Mi and Sol) from the ones that want to move.",
    ], tool: { type: "staff", scale: "major-ionian", key: "c", voice: "tenor", highlight: ["1", "3", "5"], drone: true }, after: [
      "_Don't reach for high notes: turn back at the next Do up._",
    ] },

    { type: "exercise", title: "2. Same feelings, new home", lines: [
      "Now Do is A, and Mi is C♯. Press Start microphone below to start the mic. Then press Play beside the drone to hear the new Do.",
      "Sing up the scale from the low Do again, on the note names. Hold Mi and Ti a little longer.",
      "When you change the key, every letter is new, but Mi still rests and Ti still pulls up to Do.",
    ], tool: { type: "staff", scale: "major-ionian", key: "a", voice: "tenor", highlight: ["3", "7"], drone: true } },

    { type: "exercise", title: "3. Mi and Sol from any Do", lines: [
      "Press Start below: the piano plays Do and then the note to sing, and the mic starts. Each time, Do is C, F or A.",
      "Sing the second note back on \"oo\" and hold it until Yes shows. Then press Next below for another one.",
      "Do moves every time, but Mi and Sol keep their feeling.",
    ], tool: { type: "interval-singer", key: "c", keys: ["c", "f", "a"], voice: "tenor", intervals: [4, 7], play: "both", picker: false } },

    { type: "exercise", title: "4. Name it by ear", lines: [
      "Press Start below to hear two notes. Hear the first one as Do, and say to yourself how the second one feels before you answer.",
      "Each answer shows both names: M3 for a major 3rd, with Do–Mi under it.",
      "If two answers sound alike, press Replay below and sing both notes back on \"la\".",
    ], tool: { type: "interval-ears", set: [2, 4, 7, 12], dir: "up" } },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Hold Ti over the drone, then let it land on Do.",
      "Sing a song you know and stop on a long note. Sing down to Do from there, and name the note you stopped on.",
      "Write down your own word for each note.",
    ] },
    { type: "p", text: "First the notes that rest get easy to name, then the ones that move." },
  ],
};
