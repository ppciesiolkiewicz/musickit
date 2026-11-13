import { cellsOf, toolsOf, type Cell, type PlanTool } from "./tools";

const MIC_TOOLS = new Set(["melody-singer", "run-singer", "string-singer", "interval-singer", "voice-hill", "lip-roll"]);

/** Wording where the app or backing plays (or the student presses Play), not the student. */
const NOT_THE_STUDENT = new RegExp(
  [
    String.raw`\bplay[- ]along\b`,
    String.raw`\b(?:press|hit|tap|click)\s+(?:the\s+)?play\b`,
    String.raw`\bthe\s+play\s+button\b`,
    String.raw`\blet\s+the\s+\w+\s+play\b`,
    String.raw`\b(?:the\s+)?(?:app|chords?|band|track|click|drone|backing|tune|melody|notes?)\s+(?:will\s+)?plays?\b`,
  ].join("|"),
  "gi",
);

/** Every text a block shows: its sections' headings and, flattened, its texts and list items. */
const textsOf = (cells: Cell[]): string[] => [
  ...cells.flatMap((c) => (c.type === "section" ? [c.heading] : [])),
  ...cellsOf(cells).flatMap((c) => (c.type === "text" ? [c.text] : c.type === "list" ? c.items : [])),
];

/**
 * True when an exercise asks the student to both sing and play their instrument. Heuristic, and deliberately narrow:
 * singing is a mic tool or the instruction "sing" in text (not "singing" or "sing-along"); playing is text only
 * (an instrument tool shown as a visual doesn't count): "play" / "strum", "pick the strings", or "find/play ... on the guitar / neck",
 * after stripping wording where the app or backing plays (play-along, press Play, "the chords play").
 */
export function mixesSingAndPlay(cells: Cell[]): boolean {
  const tools = toolsOf(cells);
  const texts = textsOf(cells);
  const sings = tools.some((t) => MIC_TOOLS.has(t.type) || (t.type === "staff" && t.mic !== false)) || texts.some((x) => /\bsings?\b(?![- ]along)/i.test(x));
  const plays = texts.some((x) => {
    const t = x.replace(NOT_THE_STUDENT, " ");
    return /\b(play|strum)\b/i.test(t) || /\bpick the strings?\b/i.test(t) || /\b(find|play)\b.*\bon (the|your) (guitar|neck|fretboard|instrument)\b/i.test(t);
  });
  return sings && plays;
}

/** A tempo asked of the student: "60 bpm", "play it at 80" (not "at 80%", "at 5 minutes", "at fret 12"). */
const TEMPO = /\b\d{2,3}\s*bpm\b|\bat\s+\d{2,3}\b(?!\s*(?:%|percent|sec|min|fret|times|seconds|minutes))/i;

/** The tools that sound the beat: a backing band offering its click or drums, a staff with its click, a backing track, a guitar-play-along, a strum-along. */
const keepsTime = (t: PlanTool): boolean =>
  (t.type === "backing-band" && !!(t.parts.click || t.parts.drums)) || (t.type === "staff" && t.click === true) || t.type === "backing-track" || t.type === "guitar-play-along" || t.type === "strum-along";

/** True when an exercise asks for a tempo in its text but shows no tool that sounds the beat. */
export function tempoWithoutMetronome(cells: Cell[]): boolean {
  return textsOf(cells).some((x) => TEMPO.test(x)) && !toolsOf(cells).some(keepsTime);
}
