import type { CourseArticle } from "../model";

/** Course section `how-this-course-works`, written in the /learn articles' style: the course's philosophy, hands first and then the neck. */
export const howThisCourseWorks: CourseArticle = {
  updated: "2026-11-28T15:54",
  versions: { agents: 3, teaching: 16, voice: 7 },
  blocks: [
    { type: "p", text: "This course gets you playing the guitar, and then understanding what you play. It comes in two parts, in that order: first your hands, then the neck." },
    { type: "p", text: "It's practice, not a game. There are no points and nothing to win. You play a little on most days, and what felt hard last week starts to feel easy." },

    { type: "h2", text: "Part one: your hands" },
    { type: "p", text: "Your fingers need time to get used to the strings: pressing hard enough, landing in the right place, changing chords without stopping. Reading can't do that for them. So the first two stages are short on ideas and long on playing." },
    { type: "list", items: [
      "**Guitar basics.** Tuning, the two pictures every lesson uses, and a steady beat. It starts with [Strings & tuning](/course/1/strings-and-tuning).",
      "**First open chords.** The open chords most songs need, clean changes between them and three strumming patterns. It starts with [Em & Am](/course/2/em-and-am).",
      "**First songs.** [Well-known songs](/course/2/first-songs) that use only those chords.",
    ] },
    { type: "p", text: "By the end of part one you can play songs. That's all it's for." },

    { type: "h2", text: "Part two: the neck" },
    { type: "p", text: "Then the course turns to why it all works: where the notes are, how chords are built, where a solo finds its notes." },
    { type: "p", text: "Here's the catch: the neck holds a lot, and what you're expected to know is very little. [The fretboard: the big picture](/course/0/fretboard-big-picture) is the next page, and it shows you how little." },
    { type: "p", text: "The course stays in one place on the neck, the first four frets, until that place makes sense. Only then does it move up the neck." },
    { type: "p", text: "You'll sing along the way, too. Not to become a singer: a note you can sing is a note you can hear, and a note you can hear is easier to find with your fingers." },

    { type: "h2", text: "How to practice" },
    { type: "list", items: [
      "**Little and often.** Ten easy minutes a day do more than one long hour a week.",
      "**Slow first.** Slow is where your fingers learn the right move. Speed comes later, without you pushing for it.",
      "**Repeat it until you stop thinking about it.** That's muscle memory: your fingers go to the chord while your head is somewhere else.",
      "**A rough order, not a ladder.** Nothing has to be perfect before you move on, and you can always come back.",
    ] },
    { type: "care", text: "_Stop and shake out your hand as soon as it aches._" },

    { type: "exercise", title: "A first taste: the Em chord", lines: [
      "Press Play under the chord box below to hear the Em chord.",
      "Now try it on your guitar. The two dots are your fingers: both on the 2nd fret, one on the A string and one on the D string. Strum all six strings slowly.",
      "If a string buzzes or stays quiet, leave it for now. Every first chord sounds like that.",
    ], tool: { type: "chord-shapes", chords: ["Em"] }, after: [
      "Practice until your two fingers find their dots without you looking at the picture.",
      "Not sure which string is which, or how to read the picture? The next few pages cover both, and [Em & Am](/course/2/em-and-am) comes back to this chord and makes it ring.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Pick a time of day for your ten minutes, and keep the guitar out where you can see it.",
      "Already play a little? Open [the course](/course) and start at the first section that isn't easy yet.",
      "Come back to the Em chord tomorrow, before anything else, and hear what one day did.",
    ] },
    { type: "p", text: "In the first week your fingers complain. A few weeks in, they find the chord before you've thought of its name." },
  ],
};
