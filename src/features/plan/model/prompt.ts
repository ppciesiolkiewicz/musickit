import { GLOSSARY } from "@/features/course/glossary";
import type { CatalogueEntry } from "./catalogue";
import { EXERCISE_TAGS, linkResources, sectionInterface, toolInterface } from "./tools";
import { LEVELS, labelOf } from "./questions";
import { AREAS } from "./concepts";
import { doneKey } from "./schedule";
import { PLAN_DAYS, type PlanAnswers, type StoredPlan } from "./types";

export const EXAMPLE = `{
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
            { "type": "tool", "tool": { "type": "play-along", "bpm": 70, "repeats": 35, "shape": { "shape": "chord-steps", "voicing": "barre", "chords": [{ "chord": "G", "steps": ["strum", "1", "6", "1"] }, { "chord": "D", "steps": ["strum", "4", "5", "4"] }] } } }
          ]
        },
        {
          "title": "Guide tones through the blues", "focus": "3rds and ♭7s of A7, D7, E7 at 70 bpm", "minutes": 5, "tags": ["theory", "ear"],
          "why": "Two notes per chord carry the whole change",
          "sections": [
            { "type": "text", "text": "Over each chord play its 3rd for two beats, then its ♭7 for two, while the chords sound underneath. Hear C♯ (the 3rd of A7) fall a half step to C (the ♭7 of D7). Done when the line goes round 4 times without looking at the neck." },
            { "type": "tool", "tool": { "type": "play-along", "bpm": 70, "repeats": 22, "view": "neck", "shape": { "shape": "progression", "key": "a", "chords": ["A7", "D7", "A7", "E7"], "bars": 4, "steps": ["3", "3", "b7", "b7"] } } },
            { "type": "list", "items": ["Twice on the neck view: the chord playing stands out, the others stay dim", "Twice in the notes view, singing each note's name", "Then with your eyes off the screen"] }
          ]
        }
      ]
    }
  ]
}`;

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

export type PromptPartKind = "intro" | "student" | "history" | "rules" | "interface" | "links" | "format" | "example";

/** One labelled piece of the prompt; an example part also carries its JSON so tools can render it. */
export interface PromptPart {
  id: string;
  label: string;
  kind: PromptPartKind;
  text: string;
  example?: { id: string; json: string };
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
    ? [
        ...AREAS.flatMap((a) => (answers.levels[a.id] ? [`- ${a.label} level: ${labelOf(LEVELS, answers.levels[a.id]!)}`] : [])),
        `- Styles they love: ${answers.styles.trim() || "not given"}`,
        `- Time a day: about ${answers.minutes} minutes`,
        ...(answers.notes.trim() ? [`- In their words: ${answers.notes.trim()}`] : []),
      ].join("\n")
    : "The player skipped the questionnaire. Before writing the plan, ask them (in one short message) what they play, level, goals, what they find hard, favourite styles and minutes a day; then write the plan.";
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
      "- Serve their direction AND what a good teacher sees they need: weave in fundamentals (time feel, fretboard or keyboard knowledge, ear) even if they didn't ask, aimed at what they find hard.",
      "- Each day has a theme and 2 to 5 exercises whose minutes add up to about their daily time. Warm-up first, something musical (a song, a groove, improvising) last.",
      "- Vary the days; return to the week's key skill at least three times so it sticks, each time in a new form. Day 7 is a fun review that shows progress.",
      "- Every exercise has a \"focus\": exactly what it works on, as specific as \"A minor pentatonic · boxes 1 & 2\" or \"G-C-D changes at 70 bpm\".",
      "- Concrete instructions: tempos, keys, chords, strings, how many reps, and a \"done when\" the student can check. Short, plain language.",
      "",
    ]),
    part("rules", "Rules for good exercises", "rules", [
      "## Rules for good exercises",
      "- One exercise, one skill. Minutes match the work: a drill that takes 2 to 4 minutes done well gets 2 to 4 minutes, and the next exercise builds on it. Never pad a short drill to 10 minutes by repeating it; give the time to something that develops it.",
      "- Singing: never more than 3 minutes on one bare singing drill (chord tones up and down over a drone, a scale up and down). For longer, make it musical: sing a guide tone (the 3rd, the 7th) while the progression plays (play-along), call and response with the student's own instrument, sing then find it on the instrument, sing a phrase of a song they love and its chord tones, improvise a melody on only the chord tones. Always pair singing with playing.",
      "- Show only what the exercise is about. When it works on the notes of a chord (the chord tones 1 3 5 b7 of A7), do not show the whole scale: use scale-neck's \"highlight\", staff's \"notes\" or an arpeggio-neck to pick those degrees. The scale is for exercises about the scale. Name a highlighted note the way the text names it: a note name (\"highlight\": [\"c-sharp\"]) when the text says C♯, a degree (\"3\") when the text says \"the 3rd\"; \"mute\" fades notes and \"hide\" removes them.",
      "- Intervals and ear training stay inside one octave. A compound interval (a 9th, a 10th) is its own exercise: set \"wide\": true on interval-ears and tag the exercise \"multi-octave\". interval-ears' \"set\" must be exactly the intervals the steps name (m3 is 3, M3 is 4, P4 is 5, P5 is 7, m7 is 10).",
      "- A progression is practised several ways over the week, not one: hear it as arpeggios or comping (play-along with a progression shape, a different backing each time), play the shapes (chord-shapes), play it in time (backing-band), improvise over it (play-along with solo-over). Prefer play-along whenever the student should hear or play along with a progression.",
      "- A line over chords (guide tones, chord tones, an arpeggio part) is a play-along whose steps are those degrees: the app holds the chords under it so the student hears each note against its chord, never just a click, and its neck view keeps the whole line in place with the chord playing standing out. Use play-along's \"under\": \"drone\" only when one key root should sound under everything.",
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
      "- Wrong: an exercise that starts with steps. Right: its first text says why in one sentence (\"Guide tones move by a half step, so they make the changes audible\").",
      "",
    ]),
    part("exercise-format", "Exercise format", "format", [
      "## Exercise format",
      "An exercise is a linear list of \"sections\", shown top to bottom in the order you write them. A tool shows what the text before it talks about, so put each tool right after that text; to change the view between steps, add another tool after the next step. A backing-band or click-drone keeping time goes first. A play-along with \"repeats\" sets the exercise's time itself: repeats x its length (bars x 4 beats at its bpm) replaces your \"minutes\", so choose repeats to fill the minutes you mean (2 bars at 70 bpm is about 7 seconds, so 35 repeats is 4 minutes); leave \"repeats\" out and your \"minutes\" stand. Tags (any of: " + Object.keys(EXERCISE_TAGS).join(", ") + ") are optional chips on the exercise. Notes in text: write each note you name as {{3}} (a degree, counted from the root of the tool after the text) or {{c-sharp}} (a note name); the app draws it as a dot the student can tap to hear.",
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
    part("answer-format", "Answer format", "format", [
      "## Answer format",
      `Reply with ONE JSON code block and nothing else: exactly ${PLAN_DAYS} days, fields as in this example (\"why\", \"tags\" optional, \"minutes\" a number).`,
    ]),
    { ...part("example:week-1", "Example: week-1", "example", ["```json", EXAMPLE, "```"]), example: { id: "week-1", json: EXAMPLE } },
  ];
}
