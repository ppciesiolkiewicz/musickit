import type { CatalogueEntry } from "./catalogue";
import { EMBEDS } from "./embed";
import { GOALS, INSTRUMENTS, LEVELS, STRUGGLES, labelOf } from "./questions";
import { doneKey } from "./schedule";
import { PLAN_DAYS, type PlanAnswers, type StoredPlan } from "./types";

const EXAMPLE = `{
  "title": "Week 1: open chords in time",
  "summary": "One line on the idea of the week",
  "days": [
    {
      "theme": "Clean chord changes",
      "exercises": [
        { "title": "Connect the first two boxes", "focus": "A minor pentatonic · boxes 1 & 2", "minutes": 8, "how": "Slide between the boxes on every string", "steps": ["Box 1 up and down at 60 bpm, twice", "Box 2 the same", "Cross from box 1 to box 2 on the G string"], "why": "Smooth changes are the base of every song", "link": "/theory/metronome-drone" }
      ]
    }
  ]
}`;

const list = (ids: string[], from: { id: string; label: string }[]) => (ids.length ? ids.map((id) => labelOf(from, id)).join(", ") : "not given");

/** What happened last week, exercise by exercise, so the next week builds on it. */
export function weekReport(plan: StoredPlan): string {
  const lines = [`Plan "${plan.config.title}", started ${plan.startedOn}:`];
  plan.config.days.forEach((d, di) => {
    const ex = d.exercises.map((e, ei) => `${plan.done[doneKey(di, ei)] ? "[done]" : "[skipped]"} ${e.title}`).join("; ");
    lines.push(`- Day ${di + 1} (${d.theme}): ${ex}`);
  });
  if (plan.feedback?.trim()) lines.push(`Player's notes on the week: ${plan.feedback.trim()}`);
  return lines.join("\n");
}

/**
 * The prompt the player copies into their own AI. It asks for one JSON object only, links only to the catalogue's pages,
 * and balances where the player wants to go with what they need. `previous` (newest first) makes it the next week's prompt.
 */
export function buildPrompt(answers: PlanAnswers | null, entries: CatalogueEntry[], previous: StoredPlan[] = []): string {
  const profile = answers
    ? [
        `- Plays: ${list(answers.instruments, INSTRUMENTS)}`,
        `- Level: ${labelOf(LEVELS, answers.level)}`,
        `- Where they want to go: ${list(answers.goals, GOALS)}`,
        `- What they find hard: ${list(answers.struggles, STRUGGLES)}`,
        `- Styles they love: ${answers.styles.trim() || "not given"}`,
        `- Time a day: about ${answers.minutes} minutes`,
        ...(answers.notes.trim() ? [`- In their words: ${answers.notes.trim()}`] : []),
      ].join("\n")
    : "The player skipped the questionnaire. Before writing the plan, ask them (in one short message) what they play, level, goals, what they find hard, favourite styles and minutes a day; then write the plan.";
  const history = previous.slice(0, 3).map(weekReport).join("\n\n");
  const pages = entries.map((e) => `${e.href} : ${e.label} (${e.desc})`).join("\n");
  return [
    "You are a music teacher writing a 7-day practice plan for one student. They practise with attunr, a web app; each exercise can open one of its pages.",
    "",
    "## The student",
    profile,
    "",
    ...(history ? ["## Earlier weeks (newest first)", history, "", "Build on this: repeat what was skipped or hard in a new form, move on from what was done, and keep the thread of their goals.", ""] : []),
    "## How to plan",
    "- Serve their direction AND what a good teacher sees they need: weave in fundamentals (time feel, fretboard or keyboard knowledge, ear) even if they didn't ask, aimed at what they find hard.",
    "- Each day has a theme and 2 to 5 exercises whose minutes add up to about their daily time. Warm-up first, something musical (a song, a groove, improvising) last.",
    "- Vary the days; return to the week's key skill at least three times so it sticks. Day 7 is a fun review that shows progress.",
    "- Every exercise has a \"focus\": exactly what it works on, as specific as \"A minor pentatonic · boxes 1 & 2\" or \"G-C-D changes at 70 bpm\", and 2 to 5 \"steps\" the student follows while the exercise's timer runs.",
    "- Concrete instructions: tempos, keys, chords, strings, how many reps, what 'done' looks like. Short, plain language.",
    "- \"link\" is optional and must be exactly one of the attunr paths below (scale pages take any key: /theory/scales/dorian/e). Leave it out when no page fits; never invent one.",
    "",
    "## Tools shown right on the plan page (prefer these)",
    "Most exercises should link one of these: the student practises with it under the exercise, without leaving the plan. Set its query so the tool opens on exactly the exercise.",
    ...EMBEDS.map((e) => `${e.path} : ${e.what}`),
    "",
    "## Other attunr pages (open in their own page)",
    pages,
    "",
    "## Answer format",
    `Reply with ONE JSON code block and nothing else: exactly ${PLAN_DAYS} days, fields as in this example (\"why\", \"steps\" and \"link\" optional, \"minutes\" a number).`,
    "```json",
    EXAMPLE,
    "```",
  ].join("\n");
}
