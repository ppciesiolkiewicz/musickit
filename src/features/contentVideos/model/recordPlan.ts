import { coveredCount, type SeedUse } from "./coverage";
import type { ToolVideo } from "./lookup";
import { STAGES, VIDEO_PLANS, type VideoPlan } from "./scripts";

export { STAGES, VIDEO_PLANS, type Beat, type Stage, type VideoPlan } from "./scripts";

/**
 * The recording plan: which tool videos to record, in what order, and what goes into each. The first videos, their
 * order and their scripts are in scripts.ts (`STAGES`, `VIDEO_PLANS`); the tools after them have notes here
 * (`LATER_PLANS`) and get a script when their turn comes; `NO_VIDEO` are the tools with no video of their own. One video
 * per tool, ticked for every level. Pure: the page hands in the videos and the seed's use.
 */

/** A video for later: its title and notes on what it shows. No script yet. */
export interface LaterPlan { title: string; notes: string[] }

/** Every tool whose video comes after the first ones, by tool key. A tool is in `VIDEO_PLANS`, here or in `NO_VIDEO`, and only one of them (`recordPlan.test.ts`). */
export const LATER_PLANS: Record<string, LaterPlan> = {
  "piano-keys": {
    title: "A scale on the piano keys",
    notes: [
      "Say what the screen shows: the notes of the key marked on a piano keyboard, coloured by their number in the scale.",
      "Tap the keys up the scale and say the numbers, 1 to 7.",
      "Show the steps: where two marked keys are next to each other, and where there is a key between them.",
      "Play the same notes on one guitar string, to tie the keyboard to the neck.",
    ],
  },
  "guitar-play-along:two-scales": {
    title: "Switching between two scales",
    notes: [
      "Say what the tool is for: playing in one scale, then switching to another at a set bar, over the same metronome.",
      "Show the neck: both scales' notes are there the whole time, and the notes outside the scale playing now are faded.",
      "Find the note that changes between the two scales and play just that note on each side of the switch.",
      "Improvise through one loop and land on the changed note right after the switch.",
      "Name the goal: you hear the switch, not only see it.",
    ],
  },
  "guitar-play-along:interval": {
    title: "Intervals as shapes on the neck",
    notes: [
      "Say what the tool is for: learning what an interval looks like under the fingers.",
      "Show one shape close up: the lower note, the upper note, and which strings and frets they sit on.",
      "Play along as the shape walks through the scale, one note per beat.",
      "Show how the shape shifts by a fret when it crosses the G and B strings.",
      "Name the goal: you see the shape from any note, and you hear the interval before you play the second note.",
    ],
  },
  "double-stops-neck": {
    title: "Double stops: 3rds and 6ths",
    notes: [
      "Say what a double stop is: two notes played together on two strings.",
      "Show the screen: each pair joined by a line, with the chord it belongs to named above it. Tap a pair to hear it.",
      "Play the 3rds up the neck and back down, and show the two finger shapes they use.",
      "Play the 6ths, with a string skipped between the two notes. Show how to keep that middle string quiet.",
      "Name the goal: the hand changes between the shapes without stopping.",
    ],
  },
  "voice-hill": {
    title: "Finding your low and your light high voice",
    notes: [
      "Say what the tool is for: a warm-up that finds an easy place in the voice, with one held sound.",
      "Show the screen: the ball moves with your voice, and a ring fills while you hold the sound in the right place.",
      "Do one hold low in the voice on a hum, then take a breath.",
      "Do one hold high in the voice on \"oo\", light and quiet. Say it plainly: don't push for volume.",
      "Name the goal: the sound stays steady and easy for the whole hold.",
    ],
  },
  "circle-of-fifths": {
    title: "The circle of fifths",
    notes: [
      "Say what the screen shows: every major key round the outside, each one's relative minor inside it.",
      "Pick a key and show its neighbours: the keys next to it are the chords of the key.",
      "Tap another key and show the panel move there.",
      "Play the chords of one key on the guitar, reading them off the circle.",
      "Name the goal: you can name the main chords of a key from its place on the circle.",
    ],
  },
  "song-chart": {
    title: "Playing a whole song from a chart",
    notes: [
      "Say what the tool is for: playing a song's chords from start to end, with no gaps.",
      "Read the chart: each section under its name, one box per bar, four bars to a row.",
      "Start it, wait for the bar of count-in, and follow the lit bar through one section without playing.",
      "Play the song through with one strum per bar. Then strum a full pattern.",
      "Get lost on purpose. Show the fix: find the lit bar and come back in on its beat 1.",
      "Show the chart with the chord names hidden, if the exercise uses it: play by ear, then show the names to check.",
    ],
  },
  "key-chords": {
    title: "The chords of a key",
    notes: [
      "Say what the screen shows: the chord built on each note of the scale, with its number.",
      "Tap each chord to hear it and say which are major and which are minor.",
      "Play the 1st, 4th and 5th chords of the key on the guitar, then add the 6th.",
      "Change the key and show that the numbers stay while the chord names change.",
      "Name the goal: you can say the chords of the key without the screen.",
    ],
  },
  "clap-along": {
    title: "Clapping a rhythm in time",
    notes: [
      "Say what the tool is for: timing. The rhythm itself is the exercise, with no notes and no chords.",
      "Show the screen: after a bar of count-in the notes move towards a line, and you hit each one as it reaches the line.",
      "Do one round by clapping, counting aloud. Show the other ways to hit: Space, a tap on the screen, or muted strings.",
      "Read the end of the round: how many hits were on time, and whether you ran early or late.",
      "Show the harder rhythms: eighths, sixteenths, then hits off the beat.",
      "Name the goal: your hits land with the click so you can't tell the two apart.",
    ],
  },
  "vowel-guide": {
    title: "Vowels on a held note",
    notes: [
      "Say what the tool is for: keeping the tone the same from one vowel to the next.",
      "Show the screen: the drawn mouth shows the shape of the vowel to sing, and the ring fills while your voice is on the note.",
      "Sing each vowel on one easy note, with your own mouth close to the camera next to the drawn one.",
      "Show how the shape opens a little as the note climbs.",
      "Say that the app hears the note, not the vowel, so the mouth shape is yours to watch. A mirror helps.",
      "Name the goal: the note stays steady while the vowel changes.",
    ],
  },
  "staff-reading": {
    title: "Reading notes from the staff",
    notes: [
      "Say what the game is for: naming a note on the staff at a glance.",
      "Play a few notes on screen: answer with the letter buttons, then with the microphone on, by singing or playing the note.",
      "Give one way to remember the lines and one for the spaces.",
      "Answer one wrong on purpose and read what the game says: the note, and where it sits.",
      "Name the goal: you say the name without counting up the lines.",
    ],
  },
  "chord-circle": {
    title: "What a chord can turn into",
    notes: [
      "Say what the screen shows: one chord of the key in the middle, with its sus and extended chords around it.",
      "Tap each one to hear it against the plain chord.",
      "Play two of them on the guitar and show the one finger that moves.",
      "Put one into a short chord progression in place of the plain chord.",
    ],
  },
  "guitar-play-along:progression": {
    title: "Playing along with a chord progression",
    notes: [
      "Say what the tool is for: playing a chord progression in time, round and round.",
      "Show the screen: the chords in order, and the part to play as tab, as note names or on the neck.",
      "Play along with one strum per bar, then with the steps the exercise gives.",
      "Come late to a change on purpose. Show the fix: catch the next beat 1.",
      "Name the goal: the changes come on time without you looking at your fretting hand.",
    ],
  },
  "mode-intervals": {
    title: "What sets a mode apart",
    notes: [
      "Say what the screen shows: the notes of the key, numbered from the root and coloured by their number, with the pattern of steps.",
      "Point at the one note that sets this mode apart from the plain major or minor scale.",
      "Play the scale on the guitar and stay on that note for a moment.",
      "Play a short line over a drone that leans on that note.",
    ],
  },
  improvisation: {
    title: "Ideas to improvise with",
    notes: [
      "Say what the screen gives: a rhythm and one short motive, written in the key's notes.",
      "Clap the rhythm, then play it on one note.",
      "Play the motive as written, then turned round.",
      "Make up a line from the two over a drone or a backing track.",
      "Name the goal: you can vary one small idea for a whole minute.",
    ],
  },
  "relative-modes": {
    title: "Modes that share the same notes",
    notes: [
      "Say what the screen shows: the modes that share the key's notes, each starting from another note of the scale.",
      "Tap one and show the same notes numbered from its own root.",
      "Play the same notes on the guitar over two different drones and say what changes: the home note.",
    ],
  },
  triads: {
    title: "A triad in its three inversions",
    notes: [
      "Say what the screen shows: one chord of the key as three small shapes on one group of three strings.",
      "Play the three shapes up the neck and say which note is lowest in each.",
      "Pick another chord and another group of strings on the tool.",
      "Play two chords of the key using the shapes that sit closest together.",
      "Name the goal: you find the nearest shape of the next chord without jumping along the neck.",
    ],
  },
  progressions: {
    title: "Chord progressions of a mode",
    notes: [
      "Say what the screen shows: common chord progressions that suit the key's mode, written as chords in the key.",
      "Tap one to hear it.",
      "Play it on the guitar, then play a second one and say what sets the two apart.",
    ],
  },
  tunings: {
    title: "Tunings, string by string",
    notes: [
      "Say what the screen shows: the instrument's tuning string by string, with the open strings that are notes of the key lit.",
      "Pick another tuning on the tool and show which open strings are lit now.",
      "Retune one string on the guitar and play a chord that uses the open strings.",
    ],
  },
  "string-singer": {
    title: "Singing the open strings",
    notes: [
      "Say what the tool is for: learning the pitch of each open string, so you can tune by ear.",
      "Play the notes to hear them, then sing each open string with the microphone on, in an octave that is easy for your voice.",
      "Sing two neighbouring strings one after the other and name the interval between them.",
      "Show the 5th-fret check on the guitar: the lower string's 5th fret is the next open string, the 4th fret on the G string.",
      "Name the goal: you can hum the low E string before you play it.",
    ],
  },
  "guitar-play-along:arpeggio-part": {
    title: "Arpeggio parts over chords",
    notes: [
      "Say what the tool is for: playing part of each chord's arpeggio in time as the chords change.",
      "Show the screen: the notes to play for the chord sounding now, as tab and on the neck.",
      "Play along slowly, saying each note's number: 1, 3, 5.",
      "Show a chord change where the hand stays in one position, then one where it crosses to the next.",
      "Name the goal: you land on a note of the new chord on its beat 1.",
    ],
  },
};

/** Tools with no video of their own for now, each with why. */
export const NO_VIDEO: Record<string, string> = {
  staff: "It sits under other tools in most exercises. The singing videos show it.",
  "backing-track": "It plays under other tools. Their videos show how to start it and mute a part.",
  "backing-band": "It is the metronome, the drone, the drums and the bass under other tools. Their videos show it.",
};

/** How many seed blocks use a tool at any level, each block once. */
export function blocksUsing(tool: string, use: SeedUse): number {
  const mine = Object.hasOwn(use, tool) ? use[tool] : {};
  return new Set(Object.values(mine).flat()).size;
}

/** What every line of the plan says about its tool: the seed exercises that use it and how many of its levels have a video. */
interface Cover { tool: string; blocks: number; covered: number; of: number }

/** One of the first videos: its place in the order (from 1), its script, and its tool's cover. */
export interface PlanRow extends Cover { n: number; plan: VideoPlan }

/** A later video: its notes and its tool's cover. */
export interface LaterRow extends Cover { plan: LaterPlan }

/** The plan as the page lists it: the stages in order, each with its videos; the later videos, most used tool first; the tools with no video planned. */
export interface RecordPlan { stages: { name: string; about: string; rows: PlanRow[] }[]; later: LaterRow[]; none: { tool: string; why: string }[] }

export function recordPlan(tools: string[], videos: ToolVideo[], use: SeedUse): RecordPlan {
  const cover = (tool: string): Cover => ({ tool, blocks: blocksUsing(tool, use), ...coveredCount(tool, videos) });
  let n = 0;
  const stages = STAGES.map((st) => ({
    name: st.name, about: st.about,
    rows: st.tools.filter((t) => tools.includes(t) && Object.hasOwn(VIDEO_PLANS, t)).map((t) => ({ ...cover(t), n: ++n, plan: VIDEO_PLANS[t] })),
  }));
  // most used first; a tie keeps the tools' own order (the sort is stable)
  const later = tools.flatMap((t) => (Object.hasOwn(LATER_PLANS, t) ? [{ ...cover(t), plan: LATER_PLANS[t] }] : [])).sort((a, b) => b.blocks - a.blocks);
  return { stages, later, none: tools.flatMap((tool) => (Object.hasOwn(NO_VIDEO, tool) ? [{ tool, why: NO_VIDEO[tool] }] : [])) };
}

/** The minutes of video still to record: the planned length of every row with a level that has no video. */
export const minutesLeft = (rows: PlanRow[]): number => rows.reduce((m, r) => m + (r.covered < r.of ? r.plan.minutes : 0), 0);
