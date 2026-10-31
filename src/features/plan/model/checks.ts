import type { Section } from "./tools";

const MIC_TOOLS = new Set(["melody-singer", "run-singer"]);
const INSTRUMENT_TOOLS = new Set(["chord-shapes", "scale-neck", "arpeggio-neck", "finger-pattern", "picking-drill", "legato-trill"]);

/** Wording where the app or the backing is the one playing (or the student presses Play), not the student. */
const NOT_THE_STUDENT = /\bplay-along\b|\b(?:press|hit|tap|click)\s+play\b|\b(?:the\s+)?(?:app|chords?|band|track|click|drone|backing|tune|melody|notes?)\s+plays?\b/gi;

const textsOf = (sections: Section[]): string[] =>
  sections.flatMap((s) => (s.type === "text" || s.type === "heading" ? [s.text] : s.type === "list" ? s.items : []));

/**
 * True when an exercise asks the student to both sing and play their instrument. Heuristic: mic tools and instrument tools count,
 * and so do the words sing / play / strum / pick / fret in text, except where the app or backing is the one playing.
 * Click, drone, backing band, play-along, ear and note tools are neutral.
 */
export function mixesSingAndPlay(sections: Section[]): boolean {
  const tools = sections.flatMap((s) => (s.type === "tool" ? [s.tool] : []));
  const texts = textsOf(sections);
  const sings = tools.some((t) => MIC_TOOLS.has(t.type) || (t.type === "staff" && t.mic !== false)) || texts.some((x) => /\bsing(s|ing)?\b/i.test(x));
  const plays = tools.some((t) => INSTRUMENT_TOOLS.has(t.type)) || texts.some((x) => /\b(play|strum|pick|fret)\b/i.test(x.replace(NOT_THE_STUDENT, " ")));
  return sings && plays;
}
