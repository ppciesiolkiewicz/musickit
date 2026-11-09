import { GLOSSARY } from "@/features/course/glossary";
import type { CatalogueEntry } from "./catalogue";
import { EXERCISE_AREAS, EXERCISE_LEVELS, EXERCISE_TAGS, linkResources, sectionInterface, toolInterface } from "./tools";
import { LEVELS, labelOf } from "./questions";
import { DEFAULT_ANSWERS, levelOf } from "../intake/answers";
import { TOPICS, topicById, topicsFor } from "../intake/topics";
import { VOICES } from "@/features/theory/singing";
import { noteName } from "@/features/theory/voiceRange";
import { AREAS, conceptsOf } from "./concepts";
import type { ExerciseExample, PlanExample } from "../examples";
import { selectExamples } from "./exampleSelection";
import { doneKey } from "./schedule";
import { starText } from "@/features/progress/stars";
import type { CourseRating } from "@/features/course/ratings";
import { PLAN_DAYS, type PlanAnswers, type StoredPlan } from "./types";

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

/** What happened last week, exercise by exercise, so the next week builds on it. */
export function weekReport(plan: StoredPlan): string {
  const lines = [`Plan "${plan.config.title}", started ${plan.startedOn}:`];
  plan.config.days.forEach((d, di) => {
    const ex = d.exercises.map((e, ei) => {
      const mark = markOf(plan, di, ei);
      const about = [e.level, e.focus].filter(Boolean).join(" · ");
      return `${mark} ${e.title}${about ? ` (${about})` : ""}`;
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
    const about = [e.level, e.focus].filter(Boolean).join(" · ");
    const key = e.topic && topicById(e.topic) ? e.topic : "";
    groups.set(key, [...(groups.get(key) ?? []), `- Day ${di + 1}: ${markOf(plan, di, ei)} ${e.title}${about ? ` (${about})` : ""}`]);
  }));
  const lines = [`Plan "${plan.config.title}", started ${plan.startedOn}:`];
  for (const t of TOPICS) if (groups.has(t.id)) lines.push(`### ${AREAS.find((a) => a.id === t.area)!.label} · ${t.label}`, ...groups.get(t.id)!);
  if (groups.has("")) lines.push("### Other", ...groups.get("")!);
  if (plan.feedback?.trim()) lines.push(`Player's notes on the week: ${plan.feedback.trim()}`);
  return lines.join("\n");
}

/** How to read the ratings of a finished week. */
const BUILD_ON = "Build on this: ratings are how the exercise went. 1-2 stars: make it easier (slower bpm, a lower level, fewer notes, or split it into parts). 3: keep the level and change one thing. 4-5: move on (faster bpm or the next level). Repeat what was skipped in a new form, and keep the thread of their goals.";

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
  const style = e.style === "new" ? ["New teaching style: write like this one (practice first, a why the student can build their own drill from, each block the same drill turned a new way)."] : [];
  const lines = [...(heading ? [heading] : []), `### Example: ${e.id}`, ...forWhom, `Why it's good: ${e.note}`, ...style, "```json", json, "```", ""];
  return { id: `example:${e.id}`, label: `Example: ${e.id}${e.style === "new" ? " · new teaching style" : ""}`, kind: e.kind === "plan" ? "plan-example" : "exercise-example", text: lines.join("\n"), example: { id: e.id, json } };
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
    : "The player skipped the questionnaire. Before writing the plan, ask them (in one short message) what they play, their level in each area, what they already know, their voice type (if they sing) and minutes a day; then write the plan.";
  const { exercises, plan } = selectExamples(answers ?? DEFAULT_ANSWERS);
  const exerciseParts = exercises.map((e, i) => examplePart(e, i === 0 ? EXERCISES_HEADING : ""));
  // the week just finished, with the AI's own summary from it; a plan from before summaries falls back to the last three weeks in full
  const lastWeek = previous[0];
  const summary = lastWeek?.config.progress?.trim();
  const history = summary ? "" : previous.slice(0, 3).map(weekReport).join("\n\n");
  return [
    part("intro", "Intro", "intro", [
      "You are writing a 7-day drill plan for one student. They practise with attunr, a web app; each exercise is a drill that shows the tools it needs right in the plan, between its text. The lessons live elsewhere (see Links): the exercises say what to do with the tools. One sentence of why it works is welcome when it helps the student build their own drill, but it is never required.",
      "",
    ]),
    part("student", "The student", "student", [
      "## The student",
      ...(previous.length && answers ? ["This is what they said when they started. What they rated this week, and your progress summary below, count for more."] : []),
      profile,
      "",
    ]),
    ...(summary ? [
      part("week", "This week, by topic", "week", ["## This week, by topic", weekByTopic(lastWeek), "", BUILD_ON, ""]),
      part("progress", "Progress summary", "progress", [
        "## Your progress summary",
        "You wrote these notes with last week's plan. They are your memory of this student from all earlier weeks:",
        summary,
        "",
      ]),
    ] : []),
    ...(history ? [part("history", "Earlier weeks", "history", ["## Earlier weeks (newest first)", history, "", BUILD_ON, ""])] : []),
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
      "- Keep a progress summary and return it as \"progress\" in the JSON. It is your memory of this student: the next prompt gives it back to you, with the week's ratings, in place of the earlier weeks. Write one line per topic the student plays, starting with the topic's name: where they stand, what moved this week, what is stuck, what to try next. Rewrite it whole each week from your last summary plus this week's ratings; in a first week, write it from what they said above and what this plan starts. Trust ratings over what they said when they started. Keep it under about 300 words. Write it for yourself in plain notes: the student never sees it.",
      "- Singing keys sit inside their voice range; check the lowest and highest note of every exercise against it.",
      "- Never organise a plan around a genre. A style may justify a choice in one sentence (\"the scale used in blues\").",
      "- Serve their direction AND what a good teacher sees they need: weave in fundamentals (time feel, fretboard or keyboard knowledge, ear) even if they didn't ask, aimed at what they find hard.",
      "- Each day has a theme and 2 to 5 exercises whose minutes add up to about their daily time. Warm-up first, something musical (a song, a groove, improvising) last.",
      "- Vary the days; return to the week's key skill at least three times so it sticks, each time in a new form. Day 7 is a fun review that shows progress the student can feel: going back to something that was hard on day 1 and noticing it is easier now.",
      "- Every exercise has a \"focus\": exactly what it works on, as specific as \"A minor pentatonic · positions 1 & 2\" or \"G-C-D changes at 70 bpm\".",
      "- Concrete settings: keys, tempos, chords and strings, set in the tools and named in the text where the student needs them. Write the text as \"How to write an exercise\" below says.",
      "",
    ]),
    part("rules", "Rules for good exercises", "rules", [
      "## Rules for good exercises",
      "- One exercise, one skill. Its \"minutes\" are the truth: the timer runs exactly that long and the guitar-play-along and backing-track loop until the student stops them. Give each exercise the minutes its work needs and no more; never pad a short drill.",
      "- Variety inside an exercise: an exercise over 5 minutes is 2 or more blocks of 2 to 5 minutes each, and consecutive blocks on one idea change something real (tempo, key, position, direction, which note is lit, hearing it vs from memory). Never one tool for the whole of a long exercise. A block starts with a heading that has \"minutes\"; the block minutes add up to the exercise minutes; a heading without \"minutes\" is a sub-heading inside a block. Example: \"A minor pentatonic, 12 min\" = position 1 at 60 bpm (3) → crossing from position 1 to 2 (3) → the same in C (3) → 3 minutes improvising on just those notes.",
      "- Singing or playing: an exercise is one or the other, never both; no step asks the student to sing and play. A week may hold both kinds; tag \"sing\" or the instrument. Singing is a mic tool (staff with live pitch, melody-singer, run-singer, string-singer) or text that asks to sing. Playing is text that asks to play their instrument. Allowed in either: backing-band, a backing-track the student plays, sings or listens over, staff without mic, interval-ears, tuning-ears, note-finder; saying note names aloud while playing is fine. A listening-only ear exercise is fine.",
      "- Singing for longer is made musical: sing over chords (a backing-track), melody-singer tunes, call and response (the app plays, the student sings back), improvising on chord tones. A bare singing drill (chord tones up and down, a scale up and down) is at most one block of 3 minutes or less. Never use the guitar as the reference pitch (\"play the A, sing it back\").",
      "- Light what you name: every note a step names is lit in the tool after it. The root (Do) is never muted when it is part of the exercise. A note has three looks: highlighted (ringed), enabled (plain) and muted (faint). \"highlight\" is the few notes of interest (the roots, the one new note, the note that differs between two modes); \"enable\" is the notes the student plays (absent: all of them), drawn plain; scale notes outside the exercise are muted (the default for notes not enabled), or hidden with \"others\": \"hidden\". Context notes the student still plays or compares against stay enabled, not muted: muting is for notes of no interest. Never give both the same notes. One chart per step when the focus changes: step 1 shows Do, step 2 Do + Mi, step 4 the whole line. Reuse a tool when consecutive steps show the same notes; an exercise has at most 6 tools, so split into two exercises rather than exceed 6.",
      "- Show only what the exercise is about. When it works on the notes of a chord (the chord tones 1 3 5 b7 of A7), do not show the whole scale: use scale-neck's \"enable\", staff's \"notes\" or an arpeggio-neck to pick those degrees. The scale is for exercises about the scale. Name a highlighted note the way the text names it: a note name (\"highlight\": [\"c-sharp\"]) when the text says C♯, a degree (\"3\") when the text says \"the 3rd\"; \"mute\" fades notes and \"hide\" removes them.",
      "- A guitarist learning to tune by ear: string-singer sings the open strings into memory (drills \"strings\", then \"pairs\", then \"fifth-fret\"), tuning-ears trains hearing flat, sharp and in tune (start at 30 cents, one after the other; then fewer cents and \"together\" for the beats). Each is its own exercise: one sings, the other only listens.",
      "- Intervals and ear training stay inside one octave. A compound interval (a 9th, a 10th) is its own exercise: set \"wide\": true on interval-ears and tag the exercise \"multi-octave\". interval-ears' \"set\" must be exactly the intervals the steps name (m3 is 3, M3 is 4, P4 is 5, P5 is 7, m7 is 10).",
      "- A progression is practised several ways over the week, not one: hear it as arpeggios or comping (guitar-play-along with a progression shape, a different backing each time), play the shapes (chord-shapes), strum it in time (strum-along), improvise over it (guitar-play-along with solo-over). Prefer guitar-play-along whenever a guitarist should hear the app play a progression, backing-track whenever a singer should.",
      "- To improvise, solo or comp over a whole band (drums, bass and keys), use backing-track with a curated progression that fits the lesson (\"blues\" for a 12-bar blues, \"minor-blues\", \"dorian\" for a Dorian vamp) and the lesson's key; it loops until stopped and the student can mute a part to play it. Its \"parts\" set what the step needs: leave \"keys\" out when the student comps the chords, leave \"bass\" out when they play the bass line; \"always\" for a part the exercise leans on. Its chords must be the ones the text names: when no curated progression has them, give the lesson's chords as \"numerals\" in its key (or \"chords\"), one per bar.",
      "- Strumming chords in time is a strum-along: a metronome and the chords as boxes, one per bar (or beat), each holding its beats and strums, the playing one lit. Give the strum as its \"pattern\" (\"D D D D\", \"D U D U D U D U\", \"D . D U . U D U\"), matching the text. Never a guitar-play-along with a progression shape for the student's own strumming.",
      "- Any exercise that asks for a tempo (\"play it at 80\", \"60 bpm\") shows a tool that sounds the beat at that tempo: strum-along for strumming chords, a staff with its \"click\" for singing, else a backing-band offering its click or drums, a backing-track for improvising or singing over chords, or a guitar-play-along. Its \"bpm\" is the number the text names.",
      "- Triads and double stops are guitar-play-along steps too: a grip ({ \"grip\": [\"1\",\"3\",\"5\"], \"strings\": \"321\" }, a double stop on two strings) in a chord-steps shape, mixed with single notes into a riff (two notes, a triad, two notes, a double stop). The app finds the frets near the step before, so the same grip moved to another string set (\"432\", \"543\") is a new drill with the same chord. Never describe a grip's frets in text; the tab shows them.",
      "- A line over chords (guide tones, chord tones, an arpeggio part) is a guitar-play-along whose steps are those degrees: the app holds the chords under it so the student hears each note against its chord, never just a click, and its neck view keeps the whole line in place with the chord playing standing out. Use guitar-play-along's \"under\": \"drone\" only when one key root should sound under everything. A sung line over chords is different: the guitar-play-along is for the guitar, so the singer reads the line from a staff (\"notes\" the line's degrees, mic on) with a backing-track on those chords under it (\"parts\": { \"drums\": \"on\", \"bass\": \"off\", \"keys\": \"always\" } for a gentle start, the chords always there), which shows the chord playing.",
      "- When the student's voice type is known, set \"voice\" on every staff, melody-singer and run-singer tool to it; when it is not, and on every staff in an exercise that does not sing, use \"tenor\".",
      "- A staff the student sings from (mic on) labels its notes: set its \"labels\" to \"solfege\" when the text names notes as Do Re Mi, else \"degree\", so the singer reads every note by its number or syllable, never a bare note name.",
      "- You choose what to practise; the app computes notes, frets, tabs and timing. Never write frets or note lists the app can compute.",
      "- Do not put two exercises of the same kind next to each other in a day, and tag each with what kind it is.",
      "- \"staff\" means only the staff tool (the five lines of music, where the singer's pitch shows as a line). Say \"staff\" only for that tool, never for a guitar neck, a chord box or a tab, and do not explain what it is.",
      "- Explained words: the app adds an (i) with a short meaning and an article link to these words, so use them by name where they fit and do not define them in the text. List of words: " + GLOSSARY.map((t) => t.forms[0]).join(", ") + ".",
      "",
    ]),
    part("mistakes", "Common mistakes", "rules", [
      "## Common mistakes",
      "- Wrong: open A7 and D7 chord shapes with an A minor pentatonic scale-neck at \"boxes\": [1] (fret 5, far from the chords). Right: \"placement\": { \"by\": \"chords\" } (or { \"by\": \"open\" }), so the position sits next to the chords.",
      "- Wrong: text about C♯ with \"highlight\": [\"b3\"] (that is C). Right: \"add\": [\"c-sharp\"] (lit by itself) or \"highlight\": [\"c-sharp\"].",
      "- Wrong: \"Dm7 has F and C, G7 has B and F\" as prose only. Right: one sentence of why, then a guitar-play-along with a chord-steps shape (steps [\"1\",\"3\",\"b7\"]), \"view\": \"tab\", and \"guide\" naming each note.",
      "- Wrong: \"Sing 1 3 5 b7 up and back\" as plain text. Right: \"Sing {{1}} {{3}} {{5}} {{b7}} up and back\".",
      "- Wrong: \"play only the roots\" with \"highlight\": [\"1\"] and every note still in play, or \"enable\" and \"highlight\" both [\"1\",\"3\",\"5\"]. Right: \"enable\": [\"1\"] for only the roots; \"enable\": [\"1\",\"3\",\"5\"] with \"highlight\": [\"5\"] when 5 is the note just added.",
      "- Wrong: step 1 says \"sing Do\" with Do muted on the chart. Right: Do is lit; the root is never muted when it is part of the exercise.",
      "- Wrong: one chart showing all five steps of the line from the start. Right: a chart per step: step 1 shows Do, step 2 Do + Mi, step 4 the whole line.",
      "- Wrong: \"Fret Em: fingers 2 and 3 on the 2nd fret of the A and D strings\". Right: a chord-shapes tool with \"Em\" (it shows the finger on each note), and the text says \"Fret Em as shown\".",
      "- Wrong: \"strum down on every beat at 60\" with only chord-shapes, or with a guitar-play-along progression. Right: a strum-along with those chords and \"bpm\": 60.",
      "- Wrong: a 12-minute exercise with one tool and no blocks. Right: four headings with \"minutes\": 3, each changing tempo, key, position or the lit notes.",
      "- Wrong: \"Play the chord, then sing the 3rd\" in one exercise. Right: split it: one exercise plays the chord changes, another sings the 3rd over a backing-track.",
      "- Wrong: a 3-minute exercise whose text says \"hold each note 8 seconds\" and nothing about how long to keep going. Right: state the minutes per block (\"3 minutes: hold each note 8 seconds, then the next\"), so the text and the timer agree.",
      "- Wrong: a paragraph of why, or the same why in \"why\" and again in the first text. Right: one sentence in \"why\" (\"Guide tones move by a half step, so they make the changes audible.\"); the sections start with the first block.",
      "- Wrong: \"Do comes home to the drone; Re rubs against it. Five times, slowly.\" Right: \"Sing {{1}}, then step up to {{2}}. Watch your pitch line on the staff step up, then back down.\"",
      "- Wrong: \"Make up your own line\" over a scale-neck with \"enable\": [\"1\",\"3\",\"5\"]. Right: the whole position, no \"enable\", so every note is there to choose from.",
      "- Wrong: \"Cross at least once per phrase. Done at four clean runs in a row.\" Right: \"Use the slide on the G string to move between the positions. Land on {{c}} when Cm7 comes round.\"",
      "",
    ]),
    part("writing", "How to write an exercise", "rules", [
      "## How to write an exercise",
      "- Practice first: reading is the shortest part of every exercise, and every block is something to play, sing or hear now. At most one sentence of why, in \"why\" (\"Dorian differs from natural minor by one note, so practise that note.\"). No paragraphs of rationale, no a-ha moments to discover, no step-by-step technique (fingerings, posture, breathing); the tools show fingers and frets.",
      "- Say how to use the app more than how to play: what to press, what to start, where to look (\"Press Start exercise below: the drone and the mic start together, and your pitch shows on the staff.\"). Every Play names what it starts and where it is (\"Press Play below to start the metronome\", \"Press Play above to start the backing\"), never a bare \"Press Play.\"; the click is \"the metronome\" and a step is \"one note per beat\". Notes in the text are dots the student can tap to hear, so invite that.",
      "- Playful and exploratory, not prescriptive: invite the student to try, mix, make up, guess and check. No exact counts (\"five times\", \"ten right in a row\", \"done at four clean runs\"); the timer sets the length. Say loosely when to move on, without numbers or technique: \"try it at least a few times\", \"play until it feels comfortable\", \"until your fingers find it without looking\". No poetic lines (\"Re rubs against it\"). Plain, natural English: short sentences, but two steps that go together share one (\"Find it on the A string, then on the B string, and hop between the two.\"); never a string of two-word orders, never more than two steps chained. Guitar fingers go with frets: \"play frets 1 to 4 with fingers 1, 2, 3 and 4\", never \"play fingers 1 2 3 4\".",
      "- Clear phrasing. Say exactly what to do: \"play {{6}}, then {{1}}\", not \"resolve it to Do three times\". No jargon the text does not explain (\"cross at least once per phrase\"), no numbers out of nowhere (\"not seven\"). A target says when: \"land on {{c}} when Cm7 comes round\".",
      "- Where it helps, say in plain words which sense a drill builds: the hands (finding the note), the ears (hearing it), the voice (singing it) or timing (feeling the beat).",
      "- Point at progress the student can feel, never a score: what will start to get easier (\"soon the change from G to C happens without looking\").",
      "- Sometimes, not in every exercise, end with a block that makes the drill the student's own: \"Now pick another set of notes from the position and make up your own line.\" Its tool shows the whole position with every note enabled, so they choose from all of them.",
      "- Every singing step says what to sing on: the note names while learning the notes (\"sing the names: they help you remember each sound\"), else a vowel (\"on \\\"ah\\\"\", \"on \\\"oo\\\", which keeps the top note light\") or a change of vowel across a phrase (\"the call on \\\"oo\\\", the answer on \\\"ee\\\"\", \"move through \\\"ee-oh-oo-oh-ah\\\"\"). For a beginner, and for any high note, pick an easy vowel: \\\"oo\\\", \\\"ee\\\" or a hum; keep \\\"ah\\\" for low and middle notes, since an open \\\"ah\\\" is the hardest to keep in tune up high.",
      "- Keep the range to the level. The staff runs from the lowest Do in the voice's range up to its top, and \"mute\" and \"hide\" take a degree away in every octave, so they can't drop only the high notes. For a new or beginner singer, every note the text asks for sits three semitones or more under the top of their range (a tenor: A4 at most): pick a key where the drill fits low (a tenor's Do Mi Sol fits in C, D and A; in F and G it reaches C5 or B4), or say where to start (\"from the low {{1}}\"), and give any high note on \"oo\". An intermediate exercise can open eased, the drill in a lower key on \"oo\", then open the full range in a later staff. Advanced uses the whole range.",
      "- A run-singer step states the run's range (\"from La below Do up to the high Do\") and that each pass starts a semitone higher.",
      "- Guitar scale shapes are positions (\"position 1\", \"the position with the root on the A string\"), never boxes or patterns, in titles, headings and text alike; scale-neck's prop is still called \"boxes\".",
      "- The five-line notation is \"the staff\", never \"music sheet\" or \"stave\". For a new or beginner student, explain it the first time (\"the staff, the five lines of music, where your pitch shows as a line\").",
      "- Singing over a drone or a metronome is one staff with its own \"drone\" and/or \"click\" (and \"bpm\"), never a backing-band next to a staff. The staff has a \"Start microphone\" button and its backing its own Play; when a step has more than one thing to start (the mic and a drone, the mic and a backing-track), the app puts a \"Start exercise\" button above the step's first tool that starts them all together, and \"Stop exercise\" stops them all. So the text says \"Press Start exercise below\"; a second staff in the same step says \"press Play and Start microphone on the A staff\". Use a backing-band drone only when nothing listens: playing the instrument over a drone, or listening to one.",
      "- Vary the voice work: the same leap or chord tones in a new key and scale per block (a staff with its drone for each), calls and answers, short made-up tunes.",
      "- A melody or pattern the student sings or plays (Do Mi Sol, a leap, a tune, guide tones) comes back in a second key, with one plain line: \"The notes change, the pattern doesn't.\" When nothing else changes, give the block's heading \"keys\" (2-3 keys, the first the one its tools are written in): the student taps a key and every tool in the block moves to it. When the new key comes with a new task, write a later block or another tool.",
      "",
    ]),
    part("exercise-format", "Exercise format", "format", [
      "## Exercise format",
      "An exercise is a linear list of \"sections\", shown top to bottom in the order you write them. A tool shows what the text before it talks about, so put each tool right after that text; to change the view between steps, add another tool after the next step. A backing-band keeping time goes first. A guitar-play-along or backing-track has no length of its own: it loops until the student stops it, and the exercise's \"minutes\" set the timer. A heading with \"minutes\" starts a timed block that runs to the next such heading; the timer shows the block, and the tools do not switch by themselves, so put each block's tools after its heading. Every exercise is tagged, and the app shows the tags as chips on it: \"level\" (one of " + EXERCISE_LEVELS.join(", ") + ": the student's level in that area), \"area\" (one of " + EXERCISE_AREAS.join(", ") + ": the one area it practises; theory covers ear training) and \"tags\" (1 to 3 of " + Object.keys(EXERCISE_TAGS).join(", ") + ": what kind of practice it is). Notes in text: write each note you name as {{3}} (a degree, counted from the root of the tool after the text) or {{c-sharp}} (a note name); the app draws it as a dot the student can tap to hear.",
      "",
    ]),
    part("sections", "Section interface", "interface", [
      "### Sections (each is an object with \"type\" and its inputSchema)",
      ...sectionInterface(),
      "",
    ]),
    part("which-tool", "Which tool", "rules", [
      "### Which tool for what (pick by what the student does; the rules above say more about each)",
      "- Seeing notes on the guitar: scale-neck for a scale's positions; position-neck for one position across the whole neck, or the way from one position to the next (\"cross\"); arpeggio-neck for one chord's notes in a box; chord-shapes for chord grips to fret, with the fingers shown; note-finder for a game of finding notes.",
      "- Keeping time or key with nothing else playing: a backing-band, with its \"parts\" set to what the exercise needs: the click for a metronome, the drone for the key, drums and bass for a beat on one key with no chord changes. Offer only the parts the step uses; \"always\" for the one the exercise depends on (the drone in a drone exercise), \"off\" for a help the student may add (the click under a free-time drill). A singer gets a staff with its own \"drone\" and \"click\" instead.",
      "- Chords sounding under the student. The guitarist plays along with the app's guitar (arpeggios, comping, tab, notes on the neck): guitar-play-along with a progression shape. The guitarist strums the chords: strum-along. The guitarist improvises with the notes to aim for shown on the neck: guitar-play-along with solo-over. The student jams, solos or comps over a whole band (drums, bass, keys) on a common progression (a 12-bar blues, a minor vamp, a ii-V-I): backing-track. A singer sings over chords: backing-track on the lesson's chords, with a staff (mic on) for the line.",
      "- Playing a line on the guitar: guitar-play-along with melody (a tune from the book), arpeggio-part (part of each chord's arpeggio), chord-steps (degrees, grips and strums per chord, a riff) or two-scales (one scale, then the other).",
      "- Technique for the hands: finger-pattern (fingers on frets, dexterity), picking-drill (alternate picking, string skipping), legato-trill (hammer-ons and pull-offs).",
      "- Singing: staff with the mic for notes of a scale or chord; melody-singer for a tune; run-singer for a run that climbs a semitone each pass; interval-singer for a named interval from Do; string-singer for the guitar's open strings.",
      "- Ears, listening only: interval-ears to name intervals or chords; tuning-ears to hear flat, sharp or in tune.",
      "",
    ]),
    part("tools", "Tool interface", "interface", [
      "### Tools (what a \"tool\" section may hold: {\"type\": <tool name>, ...props}; the student gets no settings to change, apart from a heading's \"keys\", so set everything the exercise needs; up to 6 per exercise)",
      ...toolInterface(),
      "The tools must agree with the text: every note the steps ask them to play is in the view shown (the scale-neck or its \"add\"), every chord named is in a chord-shapes, guitar-play-along, strum-along or backing-track tool, the key and tempo match. Notes outside the scale (a chromatic passing note, the major 3rd over a dominant 7 in a minor blues, a borrowed note): say so plainly in the text, naming the note, what it is and why it works (\"C♯, not in A minor blues: the 3rd of A7, so slide into it over the A7\"), and put it in scale-neck's \"add\" (added notes are lit by themselves; don't highlight them again by degree). If the steps first play the plain scale and then extend it, give two scale-neck tools in that order.",
      "",
    ]),
    part("links", "Links", "links", [
      "### Links (resources for an exercise's \"learnBefore\" and \"exploreMore\"; any key or section value from these templates)",
      "Each exercise has two link slots, up to 3 hrefs each, never invented: \"learnBefore\" for lessons the student should read first because the exercise uses what they teach (shown at the top), \"exploreMore\" for pages that go deeper after it (shown at the bottom). Every exercise has at least one \"learnBefore\": the course lesson closest to what it drills (a lesson still being written counts); \"exploreMore\" is optional. The app shows each link with the page's own name, so write nothing about a link, and don't restate a lesson's content in \"why\" or the text: say what the exercise does.",
      ...linkResources(entries),
      "",
    ]),
    ...exerciseParts,
    examplePart(plan, "## Example plan"),
    part("answer-format", "Answer format", "format", [
      "## Answer format",
      `Reply with ONE JSON code block and nothing else: a PlanConfig with exactly ${PLAN_DAYS} days, shaped like the example plan above.`,
      "```ts",
      `interface PlanConfig { title: string; summary?: string; progress: string; days: PlanDay[] } // exactly ${PLAN_DAYS} days; progress: your notes on the student, see How to plan`,
      "interface PlanDay { theme: string; exercises: Exercise[] } // 2 to 5 exercises",
      "interface Exercise {",
      "  title: string;",
      "  minutes: number;",
      "  focus: string;",
      "  why?: string;",
      "  level: " + EXERCISE_LEVELS.map((l) => `"${l}"`).join(" | ") + ";",
      "  area: " + EXERCISE_AREAS.map((a) => `"${a}"`).join(" | ") + ";",
      "  tags: string[]; // 1 to 3, from the tags listed under Exercise format",
      "  topic: string; // the one topic it practises, from the list below: a topic of its area",
      "  concepts?: string[]; // up to 4 of that topic's concepts, from the list below",
      "  learnBefore: string[]; // at least one, see Links",
      "  sections: Section[]; // see Sections",
      "  exploreMore?: string[]; // see Links",
      "}",
      "```",
      "Topics, each with its concepts (topic id (name): concept ids):",
      ...TOPICS.map((t) => `- ${t.id} (${t.label}): ${conceptsOf(t.id).map((c) => c.id).join(", ")}`),
    ]),
  ];
}
