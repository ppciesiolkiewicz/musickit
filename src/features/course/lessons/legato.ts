import type { CourseArticle } from "../model";

/** Course section `legato`, written in the /learn articles' style. */
export const legato: CourseArticle = {
  updated: "2026-11-28T02:31",
  versions: { agents: 3, teaching: 14, voice: 6 },
  blocks: [
    { type: "p", text: "With hammer-ons and pull-offs the fretting hand makes some of the notes on its own, with no pick stroke." },
    { type: "p", text: "Fewer pick strokes means a smoother line: the notes join up instead of each starting fresh. It's also a strength drill for the fingers of your fretting hand." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "A hammer-on needs a firm, quick finger, not a hard squeeze. Let the fingertip land and stay.",
      "Keep finger 1 pressed on its fret the whole time: the pull-off lands on it.",
    ] },
    { type: "care", text: "_Rest your hand as soon as it gets tired._" },

    { type: "exercise", title: "1. Fingers 1 and 2 on the G string", lines: [
      "Press the Play button below to start the metronome and follow the tab: the G string, fret 5 with finger 1 and fret 6 with finger 2.",
      "Pick fret 5 once. Then bring finger 2 down on fret 6 for a hammer-on, and flick it off the string for a pull-off, one note per beat, with no more picking.",
      "This back and forth is a trill. Practice until the hammered note is as loud as the picked one.",
    ], tool: { type: "legato-trill", level: "new", string: 3, fret: 5, bpm: 50 } },

    { type: "exercise", title: "2. A thicker string", lines: [
      "Press the Play button below to start the metronome. The same trill is now on the A string, which is thicker, so finger 2 has to land harder.",
      "If the pulled-off note is quiet, flick finger 2 a little sideways as it leaves the string.",
    ], tool: { type: "legato-trill", level: "new", string: 5, fret: 5, bpm: 50 } },

    { type: "exercise", title: "3. Fingers 1 and 3", lines: [
      "Now there's a fret between the two fingers, so finger 3 has further to fall.",
      "Press the Play button below to start the metronome and follow the tab: the G string, fret 7 with finger 1 and fret 9 with finger 3. Pick once, then hammer on and pull off with finger 3.",
      "Finger 1 stays down the whole time. Practice until both notes are equally loud.",
    ], tool: { type: "legato-trill", level: "beginner", string: 3, fret: 7, bpm: 50 } },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Pick the open G string, hammer finger 2 onto fret 2, then pull it off back to the open string: Do, Re, Do in G major.",
      "Play the trill on the B string and the high e string, where the strings are thinner and the notes come easier.",
      "Trill with fingers 1 and 3 lower on the neck, from fret 3, where the reach is wider.",
    ] },
    { type: "p", text: "First the hammered notes come out quieter than the picked ones. Then they even out, and your lines start to sound joined up." },
  ],
};
