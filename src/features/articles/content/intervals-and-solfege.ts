import type { Article } from "../model";

export const intervalsAndSolfege: Article = {
  slug: "intervals-and-solfege",
  title: "Intervals and solfège: two names for every note",
  metaTitle: "Intervals vs Solfège: Every Note From Do on a Piano · attunr",
  description: "Every note from Do to the Do above on an interactive piano, named in solfège and as an interval. Tap a note to hear it, then name and sing them.",
  intro: "A visual, interactive chart of every note from Do to the Do above, named both ways: in solfège and as an interval, on a piano and a guitar neck. Tap a note to hear it.",
  updated: "2026-11-27",
  sings: true,
  topics: ["theory", "singing"],
  blocks: [
    { type: "p", text: "Every note can go by two names. In solfège it's a syllable: Do, Re, Mi. As an interval it's how far the note is from Do: a 2nd, a 3rd, a 5th." },
    { type: "p", text: "Both count from Do, so they always point at the same note. Some players think in solfège, some in intervals. It's okay to go with your feeling now: pick the names that stick, and the others will follow." },
    { type: "p", text: "Solfège came easier to me at first. Now I think in a mix of both, more so as I move into other modes." },

    { type: "h2", text: "Every note from Do" },
    { type: "p", text: "Here is one octave of a piano from Do, which is C here, up to the Do above. Each note shows its interval on the dot and its solfège name under it. Tap a note to hear it, or press Play below the piano to hear the whole octave rise." },
    { type: "names" },
    { type: "p", text: "The dots have the same colours as on the guitar necks in the other guides, so a note keeps its colour whichever name you read." },

    { type: "h2", text: "How to read the names" },
    { type: "list", items: [
      "R is the root, Do. The Do above is the root again, an octave higher.",
      "The number counts up the scale from Do: Re is the 2nd, Mi the 3rd, Sol the 5th.",
      "♭ means one step lower on the piano: the ♭3 is Me, just under Mi. That's the minor 3rd, and Mi is the major 3rd.",
      "p is for perfect: the 4th and the 5th, Fa and Sol. The ear game below writes them P4 and P5.",
    ] },

    { type: "h2", text: "The names repeat every octave" },
    { type: "p", text: "After the Do above, the names start again: Ra, Re, Me, Mi, and on up to the next Do. Here are three octaves from a low Do. Press Play below the piano to hear all three rise." },
    { type: "names", octaves: 3 },
    { type: "p", text: "Every Do is a new start, so these twelve names cover every note on the piano. A note an octave up keeps its name and its colour." },

    { type: "h2", text: "The same names on the guitar" },
    { type: "p", text: "Think of the guitar neck as a piano keyboard cut into strips and stacked. Each string is one strip, and each fret is the next key up, black or white." },
    { type: "p", text: "Each string starts five frets higher than the one under it, four from the G string to the B string. So the same stretch of keys comes back one string up." },
    { type: "names", on: "guitar" },
    { type: "p", text: "Here is every note from the open strings to the 12th fret, named from C, with the same interval and colour as on the piano. Every C is Do again. Tap a dot to hear it." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Sing quietly, in the comfortable middle of your voice. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. Name it by ear", lines: [
      "Press Start below to hear two notes. Hear the first one as Do, and pick the name of the second: m3, M3, P4 or P5.",
      "The game writes a minor 3rd as m3 and a major 3rd as M3, with the solfège under each answer.",
      "If two answers sound alike, press Replay below, then find both notes on the piano above.",
    ], tool: { type: "interval-ears", set: [3, 4, 5, 7], dir: "up" }, after: [
      "Practice until you can name the 3rds without guessing.",
    ] },

    { type: "exercise", title: "2. Sing Me, Mi and Sol from Do", lines: [
      "Press Start below: the piano plays Do and then the note to sing, and the mic starts.",
      "Sing the second note back on \"oo\" and hold it until Yes shows. Then press Next below for another one.",
      "Listen for the gap between Me and Mi: next door on the piano, and a different feeling.",
    ], tool: { type: "interval-singer", key: "c", keys: ["c", "f", "a"], voice: "tenor", intervals: [3, 4, 7], play: "both", picker: false }, after: [
      "_Don't reach for high notes: sing only where your voice feels easy._",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Tap a note on the piano and say both of its names before you look at them.",
      "Sing up the octave from Do on the solfège names, then again on the interval names.",
      "Find Do, Fa and Sol on your guitar from any A, with the [guitar neck guide](/learn/major-and-minor-scales-guitar).",
    ] },
    { type: "p", text: "Before long one name will bring up the other, and you won't mind which one a page uses." },
  ],
};
