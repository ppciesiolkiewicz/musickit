import type { CatalogueEntry } from "./catalogue";
import { EXERCISE_TAGS, linkResources, sectionInterface, toolInterface } from "./tools";
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
        {
          "title": "Connect the first two boxes", "focus": "A minor pentatonic · boxes 1 & 2", "minutes": 8, "tags": ["technique"],
          "why": "Joined boxes free you from box 1",
          "sections": [
            { "type": "text", "text": "Slide between the boxes on every string. Done when you cross cleanly at 60 bpm, twice in a row." },
            { "type": "tool", "tool": { "type": "backing-band", "bpm": 60, "key": "a", "parts": ["click", "drone"] } },
            { "type": "heading", "text": "Box 1, then box 2" },
            { "type": "list", "items": ["Box 1 up and down at 60 bpm, twice", "Box 2 the same"] },
            { "type": "tool", "tool": { "type": "scale-neck", "scale": "minor-pentatonic", "key": "a", "boxes": [1, 2] } },
            { "type": "heading", "text": "Cross over" },
            { "type": "text", "text": "Cross from box 1 to box 2 on the G string, hearing the root A." },
            { "type": "tool", "tool": { "type": "scale-neck", "scale": "minor-pentatonic", "key": "a", "boxes": [1, 2], "highlight": ["1"] } },
            { "type": "link", "href": "/theory/scales/minor-pentatonic/a" }
          ]
        },
        {
          "title": "G to D, strum and pick", "focus": "G-D changes with bass steps at 70 bpm", "minutes": 4, "tags": ["rhythm"],
          "sections": [
            { "type": "text", "text": "Strum each chord on beat 1, then pick the steps shown. Done when the change lands on time four times through." },
            { "type": "tool", "tool": { "type": "play-along", "bpm": 70, "repeats": 4, "shape": { "shape": "chord-steps", "voicing": "barre", "chords": [{ "chord": "G", "steps": ["strum", "1", "6", "1"] }, { "chord": "D", "steps": ["strum", "4", "5", "4"] }] } } }
          ]
        }
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
  return [
    "You are a music teacher writing a 7-day practice plan for one student. They practise with attunr, a web app; each exercise shows the tools it needs right in the plan, between its text.",
    "",
    "## The student",
    profile,
    "",
    ...(history ? ["## Earlier weeks (newest first)", history, "", "Build on this: repeat what was skipped or hard in a new form, move on from what was done, and keep the thread of their goals.", ""] : []),
    "## How to plan",
    "- Serve their direction AND what a good teacher sees they need: weave in fundamentals (time feel, fretboard or keyboard knowledge, ear) even if they didn't ask, aimed at what they find hard.",
    "- Each day has a theme and 2 to 5 exercises whose minutes add up to about their daily time. Warm-up first, something musical (a song, a groove, improvising) last.",
    "- Vary the days; return to the week's key skill at least three times so it sticks, each time in a new form. Day 7 is a fun review that shows progress.",
    "- Every exercise has a \"focus\": exactly what it works on, as specific as \"A minor pentatonic · boxes 1 & 2\" or \"G-C-D changes at 70 bpm\".",
    "- Concrete instructions: tempos, keys, chords, strings, how many reps, and a \"done when\" the student can check. Short, plain language.",
    "",
    "## Rules for good exercises",
    "- One exercise, one skill. Minutes match the work: a drill that takes 2 to 4 minutes done well gets 2 to 4 minutes, and the next exercise builds on it. Never pad a short drill to 10 minutes by repeating it; give the time to something that develops it.",
    "- Singing: never more than 3 minutes on one bare singing drill (chord tones up and down over a drone, a scale up and down). For longer, make it musical: sing a guide tone (the 3rd, the 7th) while the progression plays (play-along), call and response with the student's own instrument, sing then find it on the instrument, sing a phrase of a song they love and its chord tones, improvise a melody on only the chord tones. Always pair singing with playing.",
    "- Show only what the exercise is about. When it works on the notes of a chord (the chord tones 1 3 5 b7 of A7), do not show the whole scale: use scale-neck's \"highlight\", staff's \"notes\" or an arpeggio-neck to pick those degrees. The scale is for exercises about the scale.",
    "- Intervals and ear training stay inside one octave. A compound interval (a 9th, a 10th) is its own exercise: set \"wide\": true on interval-ears and tag the exercise \"multi-octave\". interval-ears' \"set\" must be exactly the intervals the steps name (m3 is 3, M3 is 4, P4 is 5, P5 is 7, m7 is 10).",
    "- A progression is practised several ways over the week, not one: hear it as arpeggios or comping (play-along with a progression shape, a different backing each time), play the shapes (chord-shapes), play it in time (backing-band), improvise over it (play-along with solo-over). Prefer play-along whenever the student should hear or play along with a progression.",
    "- You choose what to practise; the app computes notes, frets, tabs and timing. Never write frets or note lists the app can compute.",
    "- Do not put two exercises of the same kind next to each other in a day, and tag each with what kind it is.",
    "",
    "## Exercise format",
    "An exercise is a linear list of \"sections\", shown top to bottom in the order you write them. A tool shows what the text before it talks about, so put each tool right after that text; to change the view between steps, add another tool after the next step. A backing-band or click-drone keeping time goes first. A play-along with \"repeats\" sets the exercise's minutes itself. Tags (any of: " + Object.keys(EXERCISE_TAGS).join(", ") + ") are optional chips on the exercise.",
    "",
    "### Sections (each is an object with \"type\" and its inputSchema)",
    ...sectionInterface(),
    "",
    "### Tools (what a \"tool\" section may hold: {\"type\": <tool name>, ...props}; the student gets no settings to change, so set everything the exercise needs; up to 6 per exercise)",
    ...toolInterface(),
    "The tools must agree with the text: every note the steps ask them to play is in the view shown (the scale-neck or its \"add\"), every chord named is in a chord-shapes or play-along tool, the key and tempo match. Notes outside the scale (a chromatic passing note, the major 3rd over a dominant 7 in a minor blues, a borrowed note): say so plainly in the text, naming the note, what it is and why it works (\"C♯, not in A minor blues: the 3rd of A7, so slide into it over the A7\"), and put it in scale-neck's \"add\". If the steps first play the plain scale and then extend it, give two scale-neck tools in that order.",
    "",
    "### Links (resources for \"link\" sections; any key or section value from these templates)",
    ...linkResources(entries),
    "",
    "## Answer format",
    `Reply with ONE JSON code block and nothing else: exactly ${PLAN_DAYS} days, fields as in this example (\"why\", \"tags\" optional, \"minutes\" a number).`,
    "```json",
    EXAMPLE,
    "```",
  ].join("\n");
}
