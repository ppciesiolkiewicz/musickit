import type { CatalogueEntry } from "./catalogue";
import { TOOL_DOCS } from "./tools";
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
        { "title": "Connect the first two boxes", "focus": "A minor pentatonic · boxes 1 & 2", "minutes": 8, "how": "Slide between the boxes on every string", "steps": ["Box 1 up and down at 60 bpm, twice", "Box 2 the same", "Cross from box 1 to box 2 on the G string"], "why": "Joined boxes free you from box 1", "tools": [{ "type": "scale", "scale": "minor-pentatonic", "key": "a", "boxes": [1, 2] }, { "type": "band", "bpm": 60, "key": "a", "parts": ["click", "drone"] }], "link": "/theory/scales/minor-pentatonic/a" }
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
    "You are a music teacher writing a 7-day practice plan for one student. They practise with attunr, a web app; each exercise shows the tools it needs right in the plan.",
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
    "## Tools in the exercise (\"tools\", 1 to 3 per exercise, shown in order)",
    "The student practises right in the plan with these, already set up: they get no settings to change, so set everything the exercise needs.",
    "If they play a scale, show it (scale, with the boxes); chords, show the chords; sing, add sing; in time or over a drone, add band with only the parts they need.",
    "The tools must agree with the steps: every note the steps ask them to play is in the scale shown or in its \"add\", every chord named is in a chords tool, the key and tempo match. The student only sees what the tools show.",
    "Notes outside the scale (a chromatic passing note, the major 3rd over a dominant 7 in a minor blues, a borrowed note): say so plainly in the steps, naming the note, what it is and why it works (\"C♯, not in A minor blues: the 3rd of A7, so slide into it over the A7\"), and put it in the scale tool's \"add\". Never present an outside note as if it were in the scale.",
    "If the steps first play the plain scale and then extend it, give two scale tools in that order: the plain one, then the same boxes with \"add\". One tool is one view; don't show the added note before the step that adds it.",
    ...TOOL_DOCS,
    "",
    "## attunr pages (\"link\", optional: opens a page for more)",
    pages,
    "",
    "## Answer format",
    `Reply with ONE JSON code block and nothing else: exactly ${PLAN_DAYS} days, fields as in this example (\"why\", \"steps\", \"tools\" and \"link\" optional, \"minutes\" a number).`,
    "```json",
    EXAMPLE,
    "```",
  ].join("\n");
}
