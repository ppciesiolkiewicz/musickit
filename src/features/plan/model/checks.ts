import type { Section } from "./tools";

const MIC_TOOLS = new Set(["melody-singer", "run-singer"]);

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

const textsOf = (sections: Section[]): string[] =>
  sections.flatMap((s) => (s.type === "text" || s.type === "heading" ? [s.text] : s.type === "list" ? s.items : []));

/**
 * True when an exercise asks the student to both sing and play their instrument. Heuristic, and deliberately narrow:
 * singing is a mic tool or the instruction "sing" in text (not "singing" or "sing-along"); playing is text only
 * (an instrument tool shown as a visual doesn't count): "play" / "strum", "pick the strings", or "find/play ... on the guitar / neck",
 * after stripping wording where the app or backing plays (play-along, press Play, "the chords play").
 */
export function mixesSingAndPlay(sections: Section[]): boolean {
  const tools = sections.flatMap((s) => (s.type === "tool" ? [s.tool] : []));
  const texts = textsOf(sections);
  const sings = tools.some((t) => MIC_TOOLS.has(t.type) || (t.type === "staff" && t.mic !== false)) || texts.some((x) => /\bsings?\b(?![- ]along)/i.test(x));
  const plays = texts.some((x) => {
    const t = x.replace(NOT_THE_STUDENT, " ");
    return /\b(play|strum)\b/i.test(t) || /\bpick the strings?\b/i.test(t) || /\b(find|play)\b.*\bon (the|your) (guitar|neck|fretboard|instrument)\b/i.test(t);
  });
  return sings && plays;
}
