import { GLOSSARY } from "@/features/course/glossary";
import type { CatalogueEntry } from "./catalogue";
import { keyName } from "@/features/theory/keySlug";
import { EXERCISE_AREAS, EXERCISE_LEVELS, EXERCISE_TAGS, cellInterface, linkResources, toolInterface, toolsOf } from "./tools";
import { LEVELS, labelOf } from "./questions";
import { DEFAULT_ANSWERS, levelOf } from "../intake/answers";
import { TOPICS, topicById, topicsFor } from "../intake/topics";
import { VOICES } from "@/features/theory/singing";
import { noteName } from "@/features/theory/voiceRange";
import { AREAS, conceptsOf } from "./concepts";
import { isCurrentTeaching, type ExerciseExample, type PlanExample } from "../examples";
import { selectExamples } from "./exampleSelection";
import { doneKey } from "./schedule";
import { starText } from "@/features/progress/stars";
import type { CourseRating } from "@/features/course/ratings";
import { PLAN_DAYS, type PlanAnswers, type PlanExercise, type StoredPlan } from "./types";

/** The student section's lines: per area a rough level and the line they picked for each topic, then voice, time, notes, styles. */
function studentLines(a: PlanAnswers): string[] {
  const areas = AREAS.filter((x) => a.areas.includes(x.id)).flatMap((x) => [
    `- ${x.label} (about ${labelOf(LEVELS, levelOf(a, x.id))}):`,
    ...topicsFor(x.id).map((t) => `  - ${t.label}: ${a.topics[t.id] === undefined ? "(not answered)" : t.lines[a.topics[t.id]]}`),
  ]);
  const range = a.voice?.range;
  const voice = a.areas.includes("voice") && (a.voice?.type || range)
    ? [`- Voice: ${[a.voice?.type ? VOICES[a.voice.type].label : "", range ? `range ${noteName(range.low)} to ${noteName(range.high)}` : ""].filter(Boolean).join(", ")}`]
    : [];
  return [
    ...areas,
    ...voice,
    `- Time a day: about ${a.minutes} minutes`,
    ...(a.notes.trim() ? [`- In their words: ${a.notes.trim()}`] : []),
    ...(a.styles.trim() ? [`- Styles they love: ${a.styles.trim()} (flavour only: it may justify a choice, never organise the plan around a genre)`] : []),
  ];
}

/** The settings an exercise was practised with, read from its tools: `scale-neck, backing-band · A, E · 60-80 bpm · tenor`; "" with no tools. */
export function settingsOf(e: PlanExercise): string {
  const names: string[] = [], keys: number[] = [], bpms: number[] = [], voices: string[] = [];
  const add = <T,>(to: T[], v: T | undefined) => { if (v !== undefined && !to.includes(v)) to.push(v); };
  for (const tool of toolsOf(e.cells)) {
    const t = tool as Record<string, unknown>;
    add(names, tool.type);
    for (const k of [t.key, ...(Array.isArray(t.keys) ? t.keys : [])]) if (typeof k === "number") add(keys, k);
    if (typeof t.bpm === "number") add(bpms, t.bpm);
    if (typeof t.voice === "string") add(voices, t.voice);
  }
  // a choice is no tool to name: its options are more keys and tempos the step was practised in
  const choices = [e.choice, ...e.cells.flatMap((c) => (c.type === "section" ? [c.choice] : []))].flatMap((c) => (c ? ["options" in c ? c.options : [c.open]] : []));
  for (const o of choices.flat()) {
    if (typeof o.key === "number") add(keys, o.key);
    if (typeof o.bpm === "number") add(bpms, o.bpm);
  }
  bpms.sort((a, b) => a - b);
  const tempo = bpms.length ? `${bpms.length > 1 ? `${bpms[0]}-${bpms[bpms.length - 1]}` : bpms[0]} bpm` : "";
  return [names.join(", "), keys.map(keyName).join(", "), tempo, voices.join(", ")].filter(Boolean).join(" · ");
}

/** The clause after an exercise's title: ` (level · focus; settings)`, or "" when it has none of them. */
const aboutOf = (e: PlanExercise): string => {
  const about = [e.level, settingsOf(e)].filter(Boolean).join("; ");
  return about ? ` (${about})` : "";
};

/** What happened last week, exercise by exercise, so the next week builds on it. */
export function weekReport(plan: StoredPlan): string {
  const lines = [`Plan "${plan.config.title}", started ${plan.startedOn}:`];
  plan.config.days.forEach((d, di) => {
    const ex = d.exercises.map((e, ei) => {
      const mark = markOf(plan, di, ei);
      return `${mark} ${e.title}${aboutOf(e)}`;
    }).join("; ");
    lines.push(`- Day ${di + 1} (${d.theme}): ${ex}`);
  });
  if (plan.feedback?.trim()) lines.push(`Player's notes on the week: ${plan.feedback.trim()}`);
  return lines.join("\n");
}

/** How one exercise of a plan went: its stars, "done" for an old tick without stars, or "skipped". */
function markOf(plan: StoredPlan, day: number, exercise: number): string {
  const k = doneKey(day, exercise);
  const r = plan.rated?.[k];
  return r ? `[${starText(r.stars)}]` : plan.done[k] ? "[done]" : "[skipped]";
}

/**
 * The week just finished, grouped by questionnaire topic (in questionnaire order; exercises without a topic under
 * "Other"): every exercise with its day, how it went, its level and focus. Then the player's notes on the week.
 */
export function weekByTopic(plan: StoredPlan): string {
  const groups = new Map<string, string[]>();
  plan.config.days.forEach((d, di) => d.exercises.forEach((e, ei) => {
    const key = e.topic && topicById(e.topic) ? e.topic : "";
    groups.set(key, [...(groups.get(key) ?? []), `- Day ${di + 1}: ${markOf(plan, di, ei)} ${e.title}${aboutOf(e)}`]);
  }));
  const lines = [`Plan "${plan.config.title}", started ${plan.startedOn}:`];
  for (const t of TOPICS) if (groups.has(t.id)) lines.push(`### ${AREAS.find((a) => a.id === t.area)!.label} · ${t.label}`, ...groups.get(t.id)!);
  if (groups.has("")) lines.push("### Other", ...groups.get("")!);
  if (plan.feedback?.trim()) lines.push(`Player's notes on the week: ${plan.feedback.trim()}`);
  return lines.join("\n");
}

/** How to read the ratings of a finished week. */
const BUILD_ON = "Build on this: ratings are how the exercise went, and the tools, keys, bpm and voice after the semicolon are what they practised with: the baseline to step from. 1-2 stars: make it easier (slower bpm, a lower level, fewer notes, or split it into parts). 3: keep the level and change one thing (the key, the position, the tempo). 4-5: move on: first the next stage of the same level (faster, another key, a help taken away), and when that was already there, the next level, which is a new kind of difficulty (\"Levels\" below says what). Repeat what was skipped in a new form, and keep the thread of their goals.";

const EXERCISES_HEADING = [
  "## Examples of good exercises",
  "Examples from every area and level, to show the format and the rules at work. Each says who it is for; pitch the student's exercises at their own levels above, not at these.",
  "",
].join("\n");

export type PromptPartKind = "intro" | "student" | "week" | "progress" | "history" | "course" | "rules" | "interface" | "links" | "format" | "exercise-example" | "plan-example";

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
  const style = isCurrentTeaching(e) ? ["Written to the current teaching rules: write like this one (practice first, a why the student can build their own drill from, each block the same drill turned a new way)."] : [];
  const lines = [...(heading ? [heading] : []), `### Example: ${e.id}`, ...forWhom, `Why it's good: ${e.note}`, ...style, "```json", json, "```", ""];
  return { id: `example:${e.id}`, label: `Example: ${e.id} · teaching v${e.docs.teaching}`, kind: e.kind === "plan" ? "plan-example" : "exercise-example", text: lines.join("\n"), example: { id: e.id, json } };
}

const part = (id: string, label: string, kind: PromptPartKind, lines: string[]): PromptPart => ({ id, label, kind, text: lines.join("\n") });

/**
 * The prompt the player copies into their own AI. It asks for one JSON object only, links only to the catalogue's pages,
 * and balances where the player wants to go with what they need. `previous` (newest first) makes it the next week's prompt.
 */
export function buildPrompt(answers: PlanAnswers | null, entries: CatalogueEntry[], previous: StoredPlan[] = [], course: CourseRating[] = []): string {
  return promptParts(answers, entries, previous, course).map((p) => p.text).join("\n");
}

/** The prompt as labelled parts, in order; each part's text ends with the blank line before the next heading. */
export function promptParts(answers: PlanAnswers | null, entries: CatalogueEntry[], previous: StoredPlan[] = [], course: CourseRating[] = []): PromptPart[] {
  const profile = answers
    ? studentLines(answers).join("\n")
    : "The player skipped the questionnaire. In this one case your first reply is not the plan: ask them, in one short message, what they play, their level in each area, what they already know, their voice type (if they sing) and minutes a day. The plan follows as one JSON code block after they answer.";
  const { exercises, plan } = selectExamples(answers ?? DEFAULT_ANSWERS);
  const exerciseParts = exercises.map((e, i) => examplePart(e, i === 0 ? EXERCISES_HEADING : ""));
  // the week just finished goes in by topic. The AI's memory is the newest summary any stored plan carries (a reply may
  // come without one, and a plan used again carries an old one); the weeks practised since that summary was written go
  // in full, and with no summary at all the two weeks before this one do.
  const lastWeek = previous[0];
  const at = previous.findIndex((p) => p.config.progress?.trim());
  const summary = at < 0 ? "" : previous[at].config.progress!.trim();
  const history = previous.slice(1, at < 0 ? 3 : Math.min(at + 1, 4)).map(weekReport).join("\n\n");
  return [
    part("intro", "Intro", "intro", [
      "You are writing a 7-day drill plan for one student. They practise with attunr, a web app; each exercise is a drill that shows the tools it needs right in the plan, between its text. The lessons live elsewhere (see Links below): the exercises say what to do with the tools.",
      "",
    ]),
    part("student", "The student", "student", [
      "## The student",
      ...(previous.length && answers ? [`This is what they said when they started. What they rated this week${summary ? ", and your progress summary below," : ""} counts for more.`] : []),
      profile,
      "",
    ]),
    ...(lastWeek ? [part("week", "This week, by topic", "week", ["## This week, by topic", weekByTopic(lastWeek), "", BUILD_ON, ""])] : []),
    ...(summary ? [part("progress", "Progress summary", "progress", [
      "## Your progress summary",
      `You wrote these notes with ${at === 0 ? "last week's plan" : "an earlier plan"}. They are your memory of this student from the weeks before it:`,
      summary,
      "",
    ])] : []),
    ...(history ? [part("history", "Earlier weeks", "history", [`## Earlier weeks (newest first${summary ? "; practised after those notes were written" : ""})`, history, ""])] : []),
    ...(course.length ? [part("course", "Course ratings", "course", [
      "## Course sections they rated",
      ...course.map((r) => `- ${r.title}: ${starText(r.stars)}${r.note ? ` — "${r.note}"` : ""}`),
      "",
      "These show what they can do from the lessons: pitch exercises on those topics to match, easier where they rated 1-2, further where they rated 4-5.",
      "",
    ])] : []),
    part("how-to-plan", "How to plan", "rules", [
      "## How to plan",
      "- Plan from the lines they picked above. Spend most of the time on topics where they picked \"Not yet\" or the line after it, and build from what they already do: when they play one pentatonic position and don't know the major scale, build the major scale from the pentatonic. A topic that is not answered is unknown: test it gently before building on it.",
      "- The level beside each area is a rough guide worked out from those lines. Pitch each exercise from the line of its own topic.",
      "- Keep a progress summary and return it as \"progress\" in the JSON. It is your memory of this student: the next prompt gives it back to you, with the week's ratings, in place of the earlier weeks. Write one line per topic the student plays, starting with the topic's name: where they stand, what moved this week, what is stuck, what to try next. Rewrite it whole each week from your last summary (when one is given above) plus this week's ratings; with no summary yet, write it from what they said above, any weeks shown, and what this plan starts. Trust ratings over what they said when they started. Keep it under about 300 words. Write it for yourself in plain notes: the student never sees it.",
      "- Singing keys sit inside their voice range; check the lowest and highest note of every exercise against it.",
      "- A style they love may justify a choice in one sentence (\"the scale used in blues\").",
      "- Serve their direction AND what a good teacher sees they need: weave in fundamentals (time feel, fretboard or keyboard knowledge, ear) even if they didn't ask, aimed at what they find hard.",
      "- Each day has a theme and 2 to 5 exercises whose minutes add up to about their daily time. Warm-up first, something musical (a song, a groove, improvising) last.",
      "- Vary the days; return to the week's key skill at least three times so it sticks, each time in a new form. Day 7 is a fun review that shows progress the student can feel: going back to something that was hard on day 1 and noticing it is easier now.",
      "- Concrete settings: keys, tempos, chords and strings, set in the tools and named in the text where the student needs them. Write the text as \"How to write an exercise\" below says.",
      "",
    ]),
    part("exercise-format", "Exercise format", "format", [
      "## Exercise format",
      "An exercise is a block: a title, an optional choice, and a list of \"cells\" shown top to bottom in the order you write them. A section is a cell with a heading, minutes and its own cells: write one section per step. A choice at the top of the block or in a section's header sets the key, scale, tempo, position or level of the tools under it; a tool that must keep its own value lists the part in \"pinned\". A tool shows what the text before it talks about, so put each tool right after that text. A backing-band keeping time goes first. A guitar-play-along or backing-track has no length of its own: it loops until the student stops it, and the exercise's \"minutes\" set the timer. A section with \"minutes\" is a timed block; the timer shows the block, and the tools do not switch by themselves, so put each block's tools inside its section. Every exercise is tagged, and the app shows the tags as hashtags after the title: \"level\" (one of " + EXERCISE_LEVELS.join(", ") + ": the student's level in that area), \"area\" (one of " + EXERCISE_AREAS.join(", ") + ": the one area it practises; theory covers ear training) and \"tags\" (1 to 3 of " + Object.keys(EXERCISE_TAGS).join(", ") + ": what kind of practice it is); write them as fields, or as hashtags at the end of the title. Notes in text: write each note you name as {{3}} or {{b7}} (a degree, counted from the root of the tool after the text) or {{c-sharp}} (a note name); the app draws it as a dot the student can tap to hear, so invite that.",
      "",
    ]),
    part("cells", "Cell interface", "interface", [
      "### Cells (each is an object with \"type\" and its inputSchema; a section's \"cells\" hold any kind but section)",
      ...cellInterface(),
      "",
    ]),
    part("which-tool", "Which tool", "rules", [
      "### Which tool for what (pick by what the student does; the rules below say more about each)",
      "- Seeing notes on the guitar: scale-neck for a scale's positions (with \"chords\", numerals of the key, for the key's triads inside a position); position-neck for one position across the whole neck, or the way from one position to the next (\"cross\"), or one 3-notes-per-string position (\"kind\": \"3nps\"); arpeggio-neck for one chord's notes in a box, or (\"show\") on the whole neck and in its positions; chord-shapes for chord grips to fret, with the fingers shown; note-finder for a game of finding notes.",
      "- Seeing the theory of a key, with nothing to play along: key-chords for the chord on every note of the scale, triads for one chord in its three shapes on three strings, chord-circle for one chord with the sus and extended chords it can turn into, relative-modes for the modes made of the same notes, mode-intervals for every note of a mode numbered from its root, progressions for the progressions a mode is heard in, circle-of-fifths for a key's neighbours, piano-keys for the scale on a piano, improvisation for a rhythm and a short motive to make up lines from, tunings for open and alternate tunings, caged-neck for the five CAGED shapes joined up the neck. Put one beside the tool the student plays or sings with, never in its place.",
      "- Keeping time or key with nothing else playing: a backing-band, with its \"parts\" set to what the exercise needs: the click for a metronome, the drone for the key, drums and bass for a beat on one key with no chord changes. Offer only the parts the step uses; \"always\" for the one the exercise depends on (the drone in a drone exercise), \"off\" for a help the student may add (the click under a free-time drill).",
      "- A singer over a drone or a metronome gets one staff with its own \"drone\" and/or \"click\" (and \"bpm\"), never a backing-band next to a staff. Use a backing-band drone only when nothing listens: playing the instrument over a drone, or listening to one.",
      "- Chords sounding under the student. The guitarist plays along with the app's guitar (arpeggios, comping, tab, notes on the neck): guitar-play-along with a progression shape. The guitarist strums the chords: strum-along, never a guitar-play-along with a progression shape for the student's own strumming. The guitarist improvises with the notes to aim for shown on the neck: guitar-play-along with solo-over. The student jams, solos or comps over a whole band (drums, bass, keys) on a common progression (a 12-bar blues, a minor vamp, a ii-V-I): backing-track. A singer sings over chords: backing-track on the lesson's chords, with a staff (mic on) for the line.",
      "- Playing a line on the guitar: guitar-play-along with melody (a tune from the book), arpeggio-part (part of each chord's arpeggio), chord-steps (degrees, grips and strums per chord, a riff) or two-scales (one scale, then the other). Improvising with a chord struck on beat 1: solo-over with a \"stab\" grip on each chord.",
      "- Technique for the hands: finger-pattern (fingers on frets, dexterity), picking-drill (alternate picking, string skipping), legato-trill (hammer-ons and pull-offs).",
      "- Singing: staff with the mic for notes of a scale or chord; melody-singer for a tune; run-singer for a run that climbs a semitone each pass; interval-singer for a named interval from Do; string-singer for the guitar's open strings. Breathing before or apart from singing: breathwork (no mic). Warming up the voice: lip-roll (a slide from head voice to chest voice, a siren or one note, heard and then lip rolled back) and voice-hill (one easy sound held low, in the middle or light and high); a singer's warm-up can take one of each before the first tune, a new singer the low places first.",
      "- Ears, listening only: interval-ears to name intervals or chords.",
      "- Singing or playing along with a practice video made ahead: video, by an id from its list, when one fits the day's work. Nothing listens to the student. Count the video's length in the exercise's minutes.",
      "- The same drill again with one thing changed (faster, another key, another position, the next level): a section with a \"choice\" of options in its header; the tools inside follow the chip the student picks.",
      "",
    ]),
    part("levels", "Levels", "rules", [
      "### Levels: what each one means, and what the next one is",
      "- An exercise's \"level\" is the student's level in its area, and every tool in the exercise is set to match it. A tool left at its easy default under an advanced tag is a mistake: an advanced singer does not get the 4th and the 5th as an interval set, and an advanced guitarist does not get fingers 1-2-3-4 at 60 bpm.",
      "- The next stage is more of the same: faster, longer, one more key, a help taken away (the dot of the voice, the note labels, the finger numbers). The next level is a new kind of difficulty: what the student has to hear, find or control changes. Move a student up a stage first, and up a level when the top stage is easy.",
      "- Singing. New: steps from Do in one key, with the voice shown. Beginner: skips inside the home chord (Do Mi Sol, the octave), a second key. Intermediate: the leaps of the major scale (4th, 5th, 6th, octave), tunes that start off Do, down as well as up, the voice hidden as the last stage. Advanced: the leaps that are hard to hear (minor 3rd, tritone, minor 6th, both 7ths), up and down, Do in a random key, no picture of the voice, runs in sixteenths, and lines that follow the chords (guide tones) instead of the scale.",
      "- Guitar. New: open chords and single notes on one or two strings. Beginner: one position, open-chord changes in time. Intermediate: two positions joined, barre chords, the chord's notes aimed for on the changes. Advanced: one scale all over the neck in any key, the note that sets a mode apart, triads on every string set, 9th chords, string skipping, sixteenth-note strumming with misses.",
      "- Ears. New: major or minor, the 5th and the octave. Beginner: the 3rds, and I, IV and V in a progression. Intermediate: every interval of the major scale going up, seventh chords. Advanced: all twelve intervals, going down and sounded together, wider than an octave, a mode told from its one note.",
      "- A tool with a \"level\" prop (interval-singer, interval-ears, note-finder, string-singer, breathwork, finger-pattern, picking-drill, legato-trill) takes the level as one word and sets itself; the prop says what each level is. Give it the exercise's level, and write beside it only what this exercise needs different (a prop you write wins over the level). melody-singer and run-singer take a \"pick\" with a difficulty instead: easy for new, medium for beginner, hard for intermediate, expert for advanced. The tunes are all in the major scale, so for an advanced singer take expert tunes from the widest leap stages (sevenths, octave, tenths) with \"chords\": false, and put the hard leaps in an interval-singer beside them.",
      "- A tool with no \"level\" gets harder through its own props: more positions and keys on a neck, fewer notes ringed, a faster \"bpm\", a pattern with misses on a strum-along, parts taken out of a backing.",
      "- What the student chooses, they choose with a choice on the section, never from a list on the tool: the tools show what the exercise sets and nothing to pick from. To let the student step up inside an exercise, give the section a choice with \"level\" options, easiest first, option 1 the level the tool is written at: \"choice\": { \"options\": [{\"level\": \"intermediate\"}, {\"level\": \"advanced\"}] }. Its chips are stages, so the text calls it the Stage selector. Offer the student's level and the one after it (the one before it and their own after a week rated 1-2), not all four. Leave interval-singer's \"picker\" out unless the exercise is about choosing keys.",
      "",
    ]),
    part("tools", "Tool interface", "interface", [
      "### Tools (what a \"tool\" cell may hold: {\"type\": <tool name>, ...props}; the student gets no settings to change, apart from a choice's chips, so set everything the exercise needs; an exercise has at most 6 tools, so split into two exercises rather than exceed 6)",
      ...toolInterface(),
      "The tools must agree with the text: every note the steps ask them to play is in the view shown (the scale-neck or its \"add\"), every chord named is in a chord-shapes, guitar-play-along, strum-along or backing-track tool, the key matches. Notes outside the scale (a chromatic passing note, the major 3rd over a dominant 7 in a minor blues, a borrowed note): say so plainly in the text, naming the note, what it is and why it works (\"C♯, not in A minor blues: the 3rd of A7, so slide into it over the A7\"), and put it in scale-neck's \"add\" (added notes are lit by themselves; don't highlight them again by degree). If the steps first play the plain scale and then extend it, give two scale-neck tools in that order.",
      "",
    ]),
    part("links", "Links", "links", [
      "### Links (resources for an exercise's \"learnBefore\" and \"exploreMore\"; any key or section value from these templates)",
      "Each exercise has two link slots, up to 3 hrefs each, never invented: \"learnBefore\" for lessons the student should read first because the exercise uses what they teach (shown at the top), \"exploreMore\" for pages that go deeper after it (shown at the bottom). Every exercise has at least one \"learnBefore\": the course lesson closest to what it drills (a lesson still being written counts); \"exploreMore\" is optional. The app shows each link with the page's own name, so write nothing about a link, and don't restate a lesson's content in \"why\" or the text: say what the exercise does.",
      ...linkResources(entries),
      "",
    ]),
    part("rules", "Rules for good exercises", "rules", [
      "## Rules for good exercises",
      "- One exercise, one skill. Its \"minutes\" are the truth: the timer runs exactly that long. Give each exercise the minutes its work needs and no more; never pad a short drill.",
      "- Variety inside an exercise: an exercise over 5 minutes is 2 or more blocks of 2 to 5 minutes each, and consecutive blocks on one idea change something real (tempo, key, position, direction, which note is lit, hearing it vs from memory). Never one tool for the whole of a long exercise. The sections' minutes add up to the exercise minutes; a section without \"minutes\" is a plain step inside the running block. Example: \"A minor pentatonic, 12 min\" = position 1 at 60 bpm (3) → crossing from position 1 to 2 (3) → the same in C (3) → 3 minutes improvising on just those notes.",
      "- Singing or playing: an exercise is one or the other, never both; no step asks the student to sing and play. A drill that mixes them is split into two exercises (one plays the chord changes, another sings the 3rd over a backing-track). A week may hold both kinds; tag \"sing\" or the instrument.",
      "  - Singing is a mic tool (staff with live pitch, melody-singer, run-singer, string-singer, interval-singer, voice-hill, lip-roll) or text that asks to sing. Playing is text that asks to play their instrument.",
      "  - Allowed in either: backing-band, a backing-track the student plays, sings or listens over, staff without mic, interval-ears, note-finder; saying note names aloud while playing is fine. A listening-only ear exercise is fine.",
      "- Singing for longer is made musical and varied: sing over chords (a backing-track), melody-singer tunes, call and response (the app plays, the student sings back), improvising on chord tones, short made-up tunes, the same leap or chord tones in a new key and scale per block (a staff with its drone for each). A bare singing drill (chord tones up and down, a scale up and down) is at most one block of 3 minutes or less. Never use the guitar as the reference pitch (\"play the A, sing it back\").",
      "- Light what you name: every note a step names is lit in the tool after it.",
      "  - The root (Do) is never muted when it is part of the exercise.",
      "  - A note has three looks: highlighted (ringed), enabled (plain) and muted (faint).",
      "  - \"highlight\" is the few notes of interest (the roots, the one new note, the note that differs between two modes). \"enable\" is the notes the student plays (absent: all of them), drawn plain. Never give both the same notes.",
      "  - Scale notes outside the exercise are muted (the default for notes not enabled), or hidden with \"others\": \"hidden\". Context notes the student still plays or compares against stay enabled, not muted: muting is for notes of no interest.",
      "  - One chart per step when the focus changes: step 1 shows Do, step 2 Do + Mi, step 4 the whole line.",
      "  - Reuse a tool when consecutive steps show the same notes, so the exercise stays within its 6 tools.",
      "  - Name a highlighted note the way the text names it: a note name (\"highlight\": [\"c-sharp\"]) when the text says C♯, a degree (\"3\") when the text says \"the 3rd\"; \"mute\" fades notes and \"hide\" removes them.",
      "- Show only what the exercise is about. When it works on the notes of a chord (the chord tones 1 3 5 b7 of A7), do not show the whole scale: use scale-neck's \"enable\", staff's \"notes\" or an arpeggio-neck to pick those degrees. The scale is for exercises about the scale.",
      "- A guitarist learning to tune by ear: string-singer sings the open strings into memory (drills \"strings\", then \"pairs\", then \"fifth-fret\").",
      "- Breath for singers: a singer's warm-up often opens with a short breathwork tool (2 to 3 minutes), and a week that works on long phrases or steady tone gives breath its own exercise, tagged \"sing\". Farinelli first for control (\"from\" and \"to\" grow over the weeks: beginner 3 to 8, intermediate 4 to 10, advanced 4 to 20), sss-zzz or zzz-sss to feel where the voice starts, long-exhale for a steady flow of air, cycles or body-scan to settle. The tool counts and paces the breath, so the text says only what to notice (\"keep your shoulders still\", \"fill to about 80%, not to the top\").",
      "- Intervals and ear training stay inside one octave. A compound interval (a 9th, a 10th) is its own exercise: set \"wide\": true on interval-ears and tag the exercise \"multi-octave\". interval-ears' \"set\" must be exactly the intervals the steps name (m3 is 3, M3 is 4, P4 is 5, P5 is 7, m7 is 10).",
      "- A progression is practised several ways over the week, not one: hear it as arpeggios or comping (guitar-play-along with a progression shape, a different backing each time), play the shapes (chord-shapes), strum it in time (strum-along), improvise over it (guitar-play-along with solo-over).",
      "- A backing-track over a whole band (drums, bass and keys) uses a curated progression that fits the lesson (\"blues\" for a 12-bar blues, \"minor-blues\", \"dorian\" for a Dorian vamp) and the lesson's key; the student can mute a part to play it. Its \"parts\" set what the step needs: leave \"keys\" out when the student comps the chords, leave \"bass\" out when they play the bass line; \"always\" for a part the exercise leans on. Its chords must be the ones the text names: when no curated progression has them, give the lesson's chords as \"numerals\" in its key (or \"chords\"), one per bar.",
      "- A strum-along is a metronome and the chords as boxes, one per bar (or beat), each holding its beats and strums, the playing one lit. Give the strum as its \"pattern\" (\"D D D D\", \"D U D U D U D U\", \"D . D U . U D U\"), matching the text.",
      "- Any exercise that asks for a tempo (\"play it at 80\", \"60 bpm\") shows a tool that sounds the beat at that tempo: strum-along for strumming chords, a staff with its \"click\" for singing, else a backing-band offering its click or drums, a backing-track for improvising or singing over chords, or a guitar-play-along. Its \"bpm\" is the number the text names.",
      "- Triads and double stops are guitar-play-along steps too: a grip ({ \"grip\": [\"1\",\"3\",\"5\"], \"strings\": \"321\" }, a double stop on two strings) in a chord-steps shape, mixed with single notes into a riff (two notes, a triad, two notes, a double stop). The app finds the frets near the step before, so the same grip moved to another string set (\"432\", \"543\") is a new drill with the same chord.",
      "- A line over chords (guide tones, chord tones, an arpeggio part) is a guitar-play-along whose steps are those degrees: the app holds the chords under it so the student hears each note against its chord, never just a click, and its neck view keeps the whole line in place with the chord playing standing out. Use guitar-play-along's \"under\": \"drone\" only when one key root should sound under everything. A sung line over chords is different: the guitar-play-along is for the guitar, so the singer reads the line from a staff (\"notes\" the line's degrees, mic on) with a backing-track on those chords under it (\"parts\": { \"drums\": \"on\", \"bass\": \"off\", \"keys\": \"always\" } for a gentle start, the chords always there), which shows the chord playing.",
      "- When the student's voice type is known, set \"voice\" on every staff, melody-singer and run-singer tool to it; when it is not, and on every staff in an exercise that does not sing, use \"tenor\".",
      "- A staff the student sings from (mic on) labels its notes: set its \"labels\" to \"solfege\" when the text names notes as Do Re Mi, else \"degree\", so the singer reads every note by its number or syllable, never a bare note name.",
      "- You choose what to practise; the app computes notes, frets, tabs and timing, and the tools show fingers and frets. Never write frets or note lists the app can compute, and no fingerings.",
      "- Do not put two exercises of the same kind next to each other in a day.",
      "- Explained words: the app adds an (i) with a short meaning and an article link to these words, so use them by name where they fit and do not define them in the text. List of words: " + GLOSSARY.map((t) => t.forms[0]).join(", ") + ".",
      "",
    ]),
    part("mistakes", "Common mistakes", "rules", [
      "## Common mistakes",
      "- Wrong: open A7 and D7 chord shapes with an A minor pentatonic scale-neck at \"boxes\": [1] (fret 5, far from the chords). Right: \"placement\": { \"by\": \"chords\" } (or { \"by\": \"open\" }), so the position sits next to the chords.",
      "- Wrong: \"Dm7 has F and C, G7 has B and F\" as prose only. Right: one sentence of why, then a guitar-play-along with a chord-steps shape (steps [\"1\",\"3\",\"b7\"]), \"view\": \"tab\", and \"guide\" naming each note.",
      "- Wrong: \"Fret Em: fingers 2 and 3 on the 2nd fret of the A and D strings\". Right: a chord-shapes tool with \"Em\" (it shows the finger on each note), and the text says \"Fret Em as shown\".",
      "- Wrong: a 3-minute exercise whose text says \"hold each note 8 seconds\" and nothing about how long to keep going. Right: state the minutes per block (\"3 minutes: hold each note 8 seconds, then the next\"), so the text and the timer agree.",
      "",
    ]),
    part("writing", "How to write an exercise", "rules", [
      "## How to write an exercise",
      "- Practice first: reading is the shortest part of every exercise, and every block is something to play, sing or hear now. A sentence of why is welcome when it helps the student build their own drill, but it is never required: at most one, in \"why\" (\"Dorian differs from natural minor by one note, so practise that note.\"), not repeated in the first text; the sections start with the first block. No paragraphs of rationale, no a-ha moments to discover, no step-by-step technique (posture, breathing); breathwork paces the breath.",
      "- Say how to use the app more than how to play: what to press, what to start, where to look (\"Press Start exercise below: the drone and the mic start together, and your pitch shows on the staff.\"). Every Play names what it starts and where it is (\"Press Play below to start the metronome\", \"Press Play above to start the backing\"), never a bare \"Press Play.\"; the click is \"the metronome\" and a step is \"one note per beat\".",
      "- Playful and exploratory, not prescriptive: invite the student to try, mix, make up, guess and check. No exact counts (\"five times\", \"ten right in a row\", \"done at four clean runs\"); the timer sets the length. Say loosely when to move on, without numbers or technique: \"try it at least a few times\", \"play until it feels comfortable\", \"until your fingers find it without looking\". No poetic lines (\"Re rubs against it\"). Plain, natural English: short sentences, but two steps that go together share one (\"Find it on the A string, then on the B string, and hop between the two.\"); never a string of two-word orders, never more than two steps chained. Guitar fingers go with frets: \"play frets 1 to 4 with fingers 1, 2, 3 and 4\", never \"play fingers 1 2 3 4\".",
      "- Clear phrasing. Say exactly what to do: \"play {{6}}, then {{1}}\", not \"resolve it to Do three times\". No jargon the text does not explain (\"cross at least once per phrase\"), no numbers out of nowhere (\"not seven\"). A target says when: \"land on {{c}} when Cm7 comes round\".",
      "- Where it helps, say in plain words which sense a drill builds: the hands (finding the note), the ears (hearing it), the voice (singing it) or timing (feeling the beat).",
      "- Point at progress the student can feel, never a score: what will start to get easier (\"soon the change from G to C happens without looking\").",
      "- Sometimes, not in every exercise, end with a block that makes the drill the student's own: \"Now pick another set of notes from the position and make up your own line.\" Its tool shows the whole position with every note enabled, so they choose from all of them.",
      "- Starting things in a step with a staff:",
      "  - The staff has a \"Start microphone\" button and its backing its own Play.",
      "  - When a step has more than one thing to start (the mic and a drone, the mic and a backing-track), the app puts a \"Start exercise\" button above the step's first tool that starts them all together, and \"Stop exercise\" stops them all. So the text says \"Press Start exercise below\".",
      "  - A second staff in the same step names whose controls they are, one control to a sentence: \"Press Play on the A staff below. Then press Start microphone.\"",
      "- One control per sentence, and where is one word, \"below\" or \"above\": \"Press a chord box below to hear it. Then press Play under them to start the metronome.\" A melody-singer or run-singer starts the mic with its Play: \"Press Play below to hear the tune: the mic starts with it.\"",
      "- A text may hold line breaks (\"\\n\"), each a new line on the page. Put one between what to do, the next thing to try, and what to notice or do when it goes wrong. The noticing line starts with what the student just changed: \"When you change the key, the chords are new but the numbers sound the same.\"",
      "- The thing a drill practises has one word in every step and heading of the exercise: \"the crossing\" for the way from one position to the next, \"the tune\", \"the run\".",
      "- Every singing step says what to sing on, in these exact words, which the app explains: \"on the note names\" while learning the notes (\"Sing along on the note names.\"), else a vowel (\"on \\\"ah\\\"\", \"on \\\"oo\\\", which keeps the top note light\") or a change of vowel across a phrase (\"the call on \\\"oo\\\", the answer on \\\"ee\\\"\", \"move through \\\"ee-oh-oo-oh-ah\\\"\"). For a beginner, and for any high note, pick an easy vowel: \\\"oo\\\", \\\"ee\\\" or a hum; keep \\\"ah\\\" for low and middle notes, since an open \\\"ah\\\" is the hardest to keep in tune up high.",
      "- What to sing on is its own clause with its own verb (\"Sing along on the note names.\", \"then sing it on \\\"la\\\"\"), never hung inside another instruction (not \"Make up a tune from {{1}}, {{2}} and {{3}} on \\\"la\\\"\"). The moment to move on is the feel spelled out (\"once the names come without thinking\"), never \"once you know it\".",
      "- Keep the range to the level. The staff runs from the lowest Do in the voice's range up to its top, and \"mute\" and \"hide\" take a degree away in every octave, so they can't drop only the high notes. For a new or beginner singer, every note the text asks for sits three semitones or more under the top of their range (a tenor: A4 at most): pick a key where the drill fits low (a tenor's Do Mi Sol fits in C, D and A; in F and G it reaches C5 or B4), or say where to start (\"from the low {{1}}\"), and give any high note on \"oo\". An intermediate exercise can open eased, the drill in a lower key on \"oo\", then open the full range in a later staff. Advanced uses the whole range.",
      "- A care line is underlined: write it between underscores (\"_Don't reach for high notes: sing only where your voice feels easy._\") and the app draws a band of colour under it. Underline only a line that keeps the student from hurting their voice or their hands: reaching for high notes, pushing for volume, playing through pain. Never underline to stress an ordinary instruction, a note, a control or a title. It is one whole short sentence on a line of its own, said as what to do, at most one in an exercise and not in every exercise.",
      "- For a new or beginner singer the staff still shows the notes above the ones the drill asks for, so give the care line where they could wander up: the first staff of the week, a slide, a line or tune they make up, a skip up to Sol. Write it with the exact words \"reach for high notes\", which the app explains with a link to the lesson, and vary the rest: \"_Don't reach for high notes: the staff shows more than this drill needs._\"",
      "- A run-singer step states the run's range (\"from La below Do up to the high Do\") and that each pass starts a semitone higher.",
      "- Guitar scale shapes are positions (\"position 1\", \"the position with the root on the A string\"), never boxes or patterns, in titles, headings and text alike; scale-neck's prop is still called \"boxes\".",
      "- Say \"staff\" only for the staff tool (the five lines of music, where the singer's pitch shows as a line), never for a guitar neck, a chord box or a tab, and never \"music sheet\" or \"stave\". Do not explain what it is, except for a new or beginner student, the first time (\"the staff, the five lines of music, where your pitch shows as a line\").",
      "- A melody or pattern the student sings or plays (Do Mi Sol, a leap, a tune, guide tones) comes back in a second key, with one plain line, on a line of its own, that names what stays the same in this drill: \"When you change the key, the notes change but the drop is still an octave.\" Never the same stock line on every exercise. When nothing else changes, give the section a choice (\"options\": 2-4, each a \"key\", the first the one the section's tools are written in): it draws a selector in the section's header, and every tool in the section moves to the key picked there. When the new key comes with a new task, write a later section or another tool.",
      "- The selector a choice draws is named by its label: \"the Key selector\", \"the Tempo selector\", \"the Position selector\", \"the Stage selector\", \"the Variant selector\". Invite the student to try, and never say which chip to tap or list the options (wrong: \"Tap G in the Key row above the neck, then tap C.\"). Write it in the text above the selector, in three lines: the drill; then the reason to move on as a feel, the invitation, and the selector in its own sentence with what Play starts again (\"Once you can hum it before you play it, try it in another key. Use the Key selector below to change the key, then press Play to hear the tune there.\"); then what changes and what stays. No text about the selector comes after the tools.",
      "- A choice also takes a drill up in stages or across variants. \"label\": \"stage\" when each option is harder than the last, most often a faster tempo, or the next level of a tool that has a \"level\" (then say what the next stage adds, \"the next stage asks the leaps down as well\", not its level's name): the student gets one stage comfortable before the next, so say what comfortable is and where to go then (\"When every note lands on the click, try a faster stage. Use the Stage selector below to change the tempo, then press Play to start the metronome again.\"), and what to do when a stage is too fast. \"label\": \"variant\" when the options are equals to compare, such as one pattern in two keys or two positions: send the student to each and say what to listen or look for between them (\"Then try the other variant. Use the Variant selector below to change it.\", and on a new line \"When you change the variant, your hand stays in the same frets and the ringed notes are in new places.\"). In a section with a choice the text names no tempo, key or position as the only one. When the change comes with a new task or new words, write a later section instead. A choice may also be open, with no options: \"choice\": { \"key\": \"a\", \"scale\": \"minor-pentatonic\" } on the block sets every tool's key and scale; use it only for a block whose tools all share one key, and write the tools in that key.",
      "",
    ]),
    ...exerciseParts,
    examplePart(plan, "## Example plan"),
    part("answer-format", "Answer format", "format", [
      "## Answer format",
      `Reply with ONE JSON code block and nothing else: a PlanConfig with exactly ${PLAN_DAYS} days, shaped like the example plan above.${answers ? "" : " The one exception is the skipped questionnaire (see The student): your first reply is then the questions, and the plan follows as one JSON code block after the student answers."}`,
      "```ts",
      `interface PlanConfig { title: string; summary?: string; progress: string; days: PlanDay[] } // exactly ${PLAN_DAYS} days; progress: your notes on the student, see How to plan`,
      "interface PlanDay { theme: string; exercises: Exercise[] } // 2 to 5 exercises",
      "interface Exercise {",
      "  title: string; // may end with hashtags that stand for the fields below: \"Barre drill #guitar #beginner #technique\"",
      "  minutes: number;",
      "  why?: string;",
      "  level: " + EXERCISE_LEVELS.map((l) => `"${l}"`).join(" | ") + ";",
      "  area: " + EXERCISE_AREAS.map((a) => `"${a}"`).join(" | ") + ";",
      "  tags: string[]; // 1 to 3, from the tags listed under Exercise format",
      "  topic: string; // the one topic it practises, from the list below: a topic of its area",
      "  concepts?: string[]; // up to 4 of that topic's concepts, from the list below",
      "  learnBefore: string[]; // at least one, see Links",
      "  choice?: Choice; // see Cells: a key, scale, tempo, position or level the whole exercise follows\n  cells: Cell[]; // see Cells",
      "  exploreMore?: string[]; // see Links",
      "}",
      "```",
      "Topics, each with its concepts (topic id (name): concept ids):",
      ...TOPICS.map((t) => `- ${t.id} (${t.label}): ${conceptsOf(t.id).map((c) => c.id).join(", ")}`),
      "",
      "Before you reply, check your plan against this list:",
      `- Exactly ${PLAN_DAYS} days, each with 2 to 5 exercises, and the "progress" summary is there.`,
      "- Every exercise has a level, an area, 1 to 3 tags and a topic of its area.",
      "- Every link comes from the Links list, and every exercise has at least one \"learnBefore\".",
      "- Section minutes add up to the exercise's minutes, and an exercise over 5 minutes has 2 or more sections with minutes.",
      "- No exercise both sings and plays.",
      "- Every tempo the text names has a tool that sounds the beat at that tempo.",
      "- No exercise has more than 6 tools.",
    ]),
  ];
}
