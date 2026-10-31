import { GLOSSARY } from "@/features/course/glossary";
import type { CatalogueEntry } from "./catalogue";
import { EXERCISE_TAGS, linkResources, sectionInterface, toolInterface } from "./tools";
import { DEFAULT_ANSWERS, LEVELS, labelOf } from "./questions";
import { VOICES } from "@/features/theory/singing";
import { noteName } from "@/features/theory/voiceRange";
import { AREAS, conceptById, conceptsFor } from "./concepts";
import type { ExerciseExample, PlanExample } from "../examples";
import { selectExamples } from "./exampleSelection";
import { doneKey } from "./schedule";
import { PLAN_DAYS, type PlanAnswers, type StoredPlan } from "./types";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/** The student section's lines: per area the level and its concepts with stars (unrated = unsure), then voice, focus, time, notes, styles. */
function studentLines(a: PlanAnswers): string[] {
  const areas = AREAS.flatMap((x) => {
    const level = a.levels[x.id];
    if (!level) return [];
    const shown = conceptsFor(x.id, level).map((c) => (a.ratings[c.id] ? `${c.label} ${stars(a.ratings[c.id])}` : `${c.label} (unsure)`));
    return [`- ${x.label}, level ${labelOf(LEVELS, level)}: ${shown.join(", ")}`];
  });
  const range = a.voice?.range;
  const voice = a.levels.voice && (a.voice?.type || range)
    ? [`- Voice: ${[a.voice?.type ? VOICES[a.voice.type].label : "", range ? `range ${noteName(range.low)} to ${noteName(range.high)}` : ""].filter(Boolean).join(", ")}`]
    : [];
  const focus = a.focus.flatMap((id) => conceptById(id)?.label ?? []);
  return [
    ...areas,
    ...voice,
    ...(focus.length ? [`- Focus this week: ${focus.join(", ")}`] : []),
    `- Time a day: about ${a.minutes} minutes`,
    ...(a.notes.trim() ? [`- In their words: ${a.notes.trim()}`] : []),
    ...(a.styles.trim() ? [`- Styles they love: ${a.styles.trim()} (flavour only: it may justify a choice, never organise the plan around a genre)`] : []),
  ];
}

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

const EXERCISES_HEADING = [
  "## Examples of good exercises",
  "Examples from every area and level, to show the format and the rules at work. Each says who it is for; pitch the student's exercises at their own levels above, not at these.",
  "",
].join("\n");

export type PromptPartKind = "intro" | "student" | "history" | "rules" | "interface" | "links" | "format" | "exercise-example" | "plan-example";

/** One labelled piece of the prompt; an example part also carries its JSON so tools can render it. */
export interface PromptPart {
  id: string;
  label: string;
  kind: PromptPartKind;
  text: string;
  example?: { id: string; json: string };
}

/** An example from the library: its id, who it is for (exercises), why it is good, and its JSON; `heading` (if any) goes above it. */
function examplePart(e: ExerciseExample | PlanExample, heading: string): PromptPart {
  const json = JSON.stringify(e.kind === "plan" ? e.plan : e.exercise);
  const areas = e.areas.map((id) => AREAS.find((x) => x.id === id)!.label).join(" + ");
  const forWhom = e.kind === "exercise" ? [`For: ${areas}, level ${labelOf(LEVELS, e.level)}`] : [];
  const lines = [...(heading ? [heading] : []), `### Example: ${e.id}`, ...forWhom, `Why it's good: ${e.note}`, "```json", json, "```", ""];
  return { id: `example:${e.id}`, label: `Example: ${e.id}`, kind: e.kind === "plan" ? "plan-example" : "exercise-example", text: lines.join("\n"), example: { id: e.id, json } };
}

const part = (id: string, label: string, kind: PromptPartKind, lines: string[]): PromptPart => ({ id, label, kind, text: lines.join("\n") });

/**
 * The prompt the player copies into their own AI. It asks for one JSON object only, links only to the catalogue's pages,
 * and balances where the player wants to go with what they need. `previous` (newest first) makes it the next week's prompt.
 */
export function buildPrompt(answers: PlanAnswers | null, entries: CatalogueEntry[], previous: StoredPlan[] = []): string {
  return promptParts(answers, entries, previous).map((p) => p.text).join("\n");
}

/** The prompt as labelled parts, in order; each part's text ends with the blank line before the next heading. */
export function promptParts(answers: PlanAnswers | null, entries: CatalogueEntry[], previous: StoredPlan[] = []): PromptPart[] {
  const profile = answers
    ? studentLines(answers).join("\n")
    : "The player skipped the questionnaire. Before writing the plan, ask them (in one short message) what they play, their level in each area, what they already know, their voice type (if they sing) and minutes a day; then write the plan.";
  const { exercises, plan } = selectExamples(answers ?? DEFAULT_ANSWERS);
  const exerciseParts = exercises.map((e, i) => examplePart(e, i === 0 ? EXERCISES_HEADING : ""));
  const history = previous.slice(0, 3).map(weekReport).join("\n\n");
  return [
    part("intro", "Intro", "intro", [
      "You are a music teacher writing a 7-day practice plan for one student. They practise with attunr, a web app; each exercise shows the tools it needs right in the plan, between its text.",
      "",
    ]),
    part("student", "The student", "student", [
      "## The student",
      profile,
      "",
    ]),
    ...(history ? [part("history", "Earlier weeks", "history", ["## Earlier weeks (newest first)", history, "", "Build on this: repeat what was skipped or hard in a new form, move on from what was done, and keep the thread of their goals.", ""])] : []),
    part("how-to-plan", "How to plan", "rules", [
      "## How to plan",
      "- Build on what they rate high (4-5 stars), drill what is low (1-2) or unsure, and follow the order of ideas: when pentatonic is rated 4 and the major scale 1, build the major scale from the pentatonic. Their focus for the week gets most of the time.",
      "- Concepts below the levels shown above are assumed known; concepts above them are not yet learned.",
      "- Singing keys sit inside their voice range; check the lowest and highest note of every exercise against it.",
      "- Never organise a plan around a genre. A style may justify a choice in one sentence (\"the scale used in blues\").",
      "- Serve their direction AND what a good teacher sees they need: weave in fundamentals (time feel, fretboard or keyboard knowledge, ear) even if they didn't ask, aimed at what they find hard.",
      "- Each day has a theme and 2 to 5 exercises whose minutes add up to about their daily time. Warm-up first, something musical (a song, a groove, improvising) last.",
      "- Vary the days; return to the week's key skill at least three times so it sticks, each time in a new form. Day 7 is a fun review that shows progress.",
      "- Every exercise has a \"focus\": exactly what it works on, as specific as \"A minor pentatonic · boxes 1 & 2\" or \"G-C-D changes at 70 bpm\".",
      "- Concrete instructions: tempos, keys, chords, strings, how many reps, and a \"done when\" the student can check. Short, plain language.",
      "",
    ]),
    part("rules", "Rules for good exercises", "rules", [
      "## Rules for good exercises",
      "- One exercise, one skill. Its \"minutes\" are the truth: the timer runs exactly that long and the play-along loops until the student stops it. Give each exercise the minutes its work needs and no more; never pad a short drill.",
      "- Variety inside an exercise: an exercise over 5 minutes is 2 or more blocks of 2 to 5 minutes each, and consecutive blocks on one idea change something real (tempo, key, position, direction, which note is lit, hearing it vs from memory). Never one tool for the whole of a long exercise. A block starts with a heading that has \"minutes\"; the block minutes add up to the exercise minutes; a heading without \"minutes\" is a sub-heading inside a block. Example: \"A minor pentatonic, 12 min\" = box 1 at 60 bpm (3) → crossing box 1 to 2 (3) → the same in C (3) → 3 minutes improvising on just those notes.",
      "- Singing or playing: an exercise is one or the other, never both; no step asks the student to sing and play. A week may hold both kinds; tag \"sing\" or the instrument. Singing is a mic tool (staff with live pitch, melody-singer, run-singer) or text that asks to sing. Playing is text that asks to play their instrument. Allowed in either: click-drone, backing-band, a play-along used as accompaniment the student sings or listens over, staff without mic, interval-ears, note-finder; saying note names aloud while playing is fine. A listening-only ear exercise is fine.",
      "- Singing for longer is made musical: sing over chords (a play-along as accompaniment), melody-singer tunes, call and response (the app plays, the student sings back), improvising on chord tones. A bare singing drill (chord tones up and down, a scale up and down) is at most one block of 3 minutes or less. Never use the guitar as the reference pitch (\"play the A, sing it back\").",
      "- Light what you name: every note a step names is lit in the tool after it. The root (Do) is never muted when it is part of the exercise. One chart per step when the focus changes: step 1 shows Do, step 2 Do + Mi, step 4 the whole line. Reuse a tool when consecutive steps show the same notes; an exercise has at most 6 tools, so split into two exercises rather than exceed 6.",
      "- Show only what the exercise is about. When it works on the notes of a chord (the chord tones 1 3 5 b7 of A7), do not show the whole scale: use scale-neck's \"highlight\", staff's \"notes\" or an arpeggio-neck to pick those degrees. The scale is for exercises about the scale. Name a highlighted note the way the text names it: a note name (\"highlight\": [\"c-sharp\"]) when the text says C♯, a degree (\"3\") when the text says \"the 3rd\"; \"mute\" fades notes and \"hide\" removes them.",
      "- Intervals and ear training stay inside one octave. A compound interval (a 9th, a 10th) is its own exercise: set \"wide\": true on interval-ears and tag the exercise \"multi-octave\". interval-ears' \"set\" must be exactly the intervals the steps name (m3 is 3, M3 is 4, P4 is 5, P5 is 7, m7 is 10).",
      "- A progression is practised several ways over the week, not one: hear it as arpeggios or comping (play-along with a progression shape, a different backing each time), play the shapes (chord-shapes), play it in time (backing-band), improvise over it (play-along with solo-over). Prefer play-along whenever the student should hear or play along with a progression.",
      "- A line over chords (guide tones, chord tones, an arpeggio part) is a play-along whose steps are those degrees: the app holds the chords under it so the student hears each note against its chord, never just a click, and its neck view keeps the whole line in place with the chord playing standing out. Use play-along's \"under\": \"drone\" only when one key root should sound under everything.",
      "- When the student's voice type is known, set \"voice\" on every staff, melody-singer and run-singer tool to it.",
      "- You choose what to practise; the app computes notes, frets, tabs and timing. Never write frets or note lists the app can compute.",
      "- Do not put two exercises of the same kind next to each other in a day, and tag each with what kind it is.",
      "- Explained words: the app adds an (i) with a short meaning and an article link to these words, so use them by name where they fit and do not define them in the text. List of words: " + GLOSSARY.map((t) => t.forms[0]).join(", ") + ".",
      "",
    ]),
    part("mistakes", "Common mistakes", "rules", [
      "## Common mistakes",
      "- Wrong: open A7 and D7 chord shapes with an A minor pentatonic scale-neck at \"boxes\": [1] (fret 5, far from the chords). Right: \"placement\": { \"by\": \"chords\" } (or { \"by\": \"open\" }), so the box sits next to the chords.",
      "- Wrong: text about C♯ with \"highlight\": [\"b3\"] (that is C). Right: \"add\": [\"c-sharp\"] (lit by itself) or \"highlight\": [\"c-sharp\"].",
      "- Wrong: \"Dm7 has F and C, G7 has B and F\" as prose only. Right: one sentence of why, then a play-along with a chord-steps shape (steps [\"1\",\"3\",\"b7\"]), \"view\": \"tab\", and \"guide\" naming each note.",
      "- Wrong: \"Sing 1 3 5 b7 up and back\" as plain text. Right: \"Sing {{1}} {{3}} {{5}} {{b7}} up and back\".",
      "- Wrong: step 1 says \"sing Do\" with Do muted on the chart. Right: Do is lit; the root is never muted when it is part of the exercise.",
      "- Wrong: one chart showing all five steps of the line from the start. Right: a chart per step: step 1 shows Do, step 2 Do + Mi, step 4 the whole line.",
      "- Wrong: a 12-minute exercise with one tool and no blocks. Right: four headings with \"minutes\": 3, each changing tempo, key, position or the lit notes.",
      "- Wrong: \"Play the chord, then sing the 3rd\" in one exercise. Right: split it: one exercise plays the chord changes, another sings the 3rd over a play-along accompaniment.",
      "- Wrong: a 3-minute exercise whose text says \"hold each note 8 seconds\" and nothing about how long to keep going. Right: state the minutes per block (\"3 minutes: hold each note 8 seconds, then the next\"), so the text and the timer agree.",
      "- Wrong: an exercise that starts with steps. Right: its first text says why in one sentence (\"Guide tones move by a half step, so they make the changes audible\").",
      "",
    ]),
    part("exercise-format", "Exercise format", "format", [
      "## Exercise format",
      "An exercise is a linear list of \"sections\", shown top to bottom in the order you write them. A tool shows what the text before it talks about, so put each tool right after that text; to change the view between steps, add another tool after the next step. A backing-band or click-drone keeping time goes first. A play-along has no length of its own: it loops until the student stops it, and the exercise's \"minutes\" set the timer. A heading with \"minutes\" starts a timed block that runs to the next such heading; the timer shows the block, and the tools do not switch by themselves, so put each block's tools after its heading. Tags (any of: " + Object.keys(EXERCISE_TAGS).join(", ") + ") are optional chips on the exercise. Notes in text: write each note you name as {{3}} (a degree, counted from the root of the tool after the text) or {{c-sharp}} (a note name); the app draws it as a dot the student can tap to hear.",
      "",
    ]),
    part("sections", "Section interface", "interface", [
      "### Sections (each is an object with \"type\" and its inputSchema)",
      ...sectionInterface(),
      "",
    ]),
    part("tools", "Tool interface", "interface", [
      "### Tools (what a \"tool\" section may hold: {\"type\": <tool name>, ...props}; the student gets no settings to change, so set everything the exercise needs; up to 6 per exercise)",
      ...toolInterface(),
      "The tools must agree with the text: every note the steps ask them to play is in the view shown (the scale-neck or its \"add\"), every chord named is in a chord-shapes or play-along tool, the key and tempo match. Notes outside the scale (a chromatic passing note, the major 3rd over a dominant 7 in a minor blues, a borrowed note): say so plainly in the text, naming the note, what it is and why it works (\"C♯, not in A minor blues: the 3rd of A7, so slide into it over the A7\"), and put it in scale-neck's \"add\" (added notes are lit by themselves; don't highlight them again by degree). If the steps first play the plain scale and then extend it, give two scale-neck tools in that order.",
      "",
    ]),
    part("links", "Links", "links", [
      "### Links (resources for \"link\" sections; any key or section value from these templates)",
      ...linkResources(entries),
      "",
    ]),
    ...exerciseParts,
    examplePart(plan, "## Example plan"),
    part("answer-format", "Answer format", "format", [
      "## Answer format",
      `Reply with ONE JSON code block and nothing else: a PlanConfig with exactly ${PLAN_DAYS} days, shaped like the example plan above.`,
      "```ts",
      `interface PlanConfig { title: string; summary?: string; days: PlanDay[] } // exactly ${PLAN_DAYS} days`,
      "interface PlanDay { theme: string; exercises: Exercise[] } // 2 to 5 exercises",
      "interface Exercise {",
      "  title: string;",
      "  minutes: number;",
      "  focus: string;",
      "  why?: string;",
      "  tags?: string[]; // from the tags listed under Exercise format",
      "  sections: Section[]; // see Sections",
      "}",
      "```",
    ]),
  ];
}
