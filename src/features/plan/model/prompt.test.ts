import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogue } from "./catalogue";
import { buildPrompt, promptParts, weekByTopic, weekReport } from "./prompt";
import { TOPICS } from "../intake/topics";
import { DEFAULT_ANSWERS } from "../intake/answers";
import { selectExamples } from "./exampleSelection";
import { EXERCISE_EXAMPLES } from "../examples";
import { TOOLS } from "./tools";
import type { PlanAnswers, StoredPlan } from "./types";

const last: StoredPlan = {
  id: "p", startedOn: "2026-10-24", done: { "0:0": true },
  config: { title: "Week 1", days: Array.from({ length: 7 }, (_, i) => ({ theme: `T${i}`, exercises: [{ title: `Ex ${i}`, minutes: 5, sections: [{ type: "text" as const, text: "x" }] }] })) },
};
const EX = selectExamples(DEFAULT_ANSWERS);
const EXAMPLE_IDS = [...EX.exercises.map((e) => `example:${e.id}`), `example:${EX.plan.id}`];
const ORDER = ["intro", "student", "how-to-plan", "rules", "mistakes", "writing", "exercise-format", "sections", "which-tool", "tools", "links", ...EXAMPLE_IDS, "answer-format"];

test("prompt parts have unique ids in the documented order", () => {
  assert.deepEqual(promptParts(DEFAULT_ANSWERS, []).map((p) => p.id), ORDER);
  const next = promptParts(DEFAULT_ANSWERS, [], [last]).map((p) => p.id);
  assert.deepEqual(next, [...ORDER.slice(0, 2), "week", ...ORDER.slice(2)]);
  const older = promptParts(DEFAULT_ANSWERS, [], [last, { ...last, id: "q" }]).map((p) => p.id);
  assert.deepEqual(older, [...ORDER.slice(0, 2), "week", "history", ...ORDER.slice(2)]);
  assert.equal(new Set(next).size, next.length);
});

test("the which-tool guide names every tool", () => {
  const guide = promptParts(DEFAULT_ANSWERS, []).find((p) => p.id === "which-tool")?.text ?? "";
  for (const t of Object.keys(TOOLS)) assert.match(guide, new RegExp(`\\b${t}\\b`), t);
});

test("course ratings come after the week, or after the student without one", () => {
  const course = [{ title: "S › A", stars: 2 as const }];
  assert.deepEqual(promptParts(DEFAULT_ANSWERS, [], [last], course).map((p) => p.id), [...ORDER.slice(0, 2), "week", "course", ...ORDER.slice(2)]);
  const parts = promptParts(DEFAULT_ANSWERS, [], [], course);
  assert.deepEqual(parts.map((p) => p.id), [...ORDER.slice(0, 2), "course", ...ORDER.slice(2)]);
  const text = parts.find((p) => p.id === "course")!.text;
  assert.match(text, /## Course sections they rated/);
  assert.match(text, /- S › A: 2★ Struggling/);
  assert.match(promptParts(DEFAULT_ANSWERS, [], [], [{ title: "S › B", stars: 4, note: "fast" }]).find((p) => p.id === "course")!.text, /- S › B: 4★ Solid — "fast"/);
});

test("buildPrompt is the join of its parts", () => {
  const e = catalogue();
  const joined = (a: Parameters<typeof promptParts>) => promptParts(...a).map((p) => p.text).join("\n");
  const cases: Parameters<typeof promptParts>[] = [[DEFAULT_ANSWERS, e], [null, []], [DEFAULT_ANSWERS, e, [last]], [DEFAULT_ANSWERS, e, [last], [{ title: "S › A", stars: 3 }]]];
  for (const a of cases) assert.equal(buildPrompt(...a), joined(a));
});

test("every part has a label and text", () => {
  for (const p of promptParts(DEFAULT_ANSWERS, catalogue(), [last])) assert.ok(p.label && p.text.trim(), p.id);
});

test("example parts carry parseable JSON, every library exercise first and the plan last", () => {
  const ex = promptParts(DEFAULT_ANSWERS, []).filter((p) => p.example);
  assert.deepEqual(ex.map((p) => p.example?.id), [...EXERCISE_EXAMPLES.map((e) => e.id), EX.plan.id]);
  for (const p of ex) {
    assert.ok(JSON.parse(p.example!.json));
    assert.ok(p.text.includes(p.example!.json));
    const forLine = p === ex.at(-1) ? "" : "For: [^\\n]+, level [^\\n]+\\n";
    assert.match(p.text, new RegExp(`### Example: ${p.example!.id}\\n${forLine}Why it's good: `));
  }
  assert.deepEqual(ex.map((p) => p.kind), [...EXERCISE_EXAMPLES.map(() => "exercise-example"), "plan-example"]);
  assert.match(ex[0].text, /pitch the student's exercises at their own levels/);
  assert.ok(JSON.parse(ex.at(-1)!.example!.json).days.length === 7);
});

const rated: PlanAnswers = {
  areas: ["guitar", "voice", "theory"],
  topics: { "guitar-barre-chords": 1, "guitar-basic-chords": 3, "theory-scales-keys": 0 },
  voice: { type: "tenor", range: { low: 48, high: 72 } },
  minutes: 20, styles: "blues", notes: "I rush",
};
const student = (a: PlanAnswers) => promptParts(a, []).find((p) => p.id === "student")!.text;

test("student part: a rough level per area, the line picked per topic, voice, minutes, styles as flavour", () => {
  const t = student(rated);
  assert.match(t, /- Guitar \(about Intermediate\):/);
  assert.match(t, /Barre chords: I can hold an F or Bm, but it buzzes/);
  assert.match(t, /Basic chords: I play whole songs with open chords and a strumming pattern/);
  assert.match(t, /Scales: \(not answered\)/);
  assert.match(t, /Scales & keys: Not yet/);
  assert.match(t, /- Voice \(about Beginner\):/);
  assert.doesNotMatch(t, /★|unsure/);
  assert.doesNotMatch(student({ ...rated, areas: ["guitar"] }), /Tenor|Pitch:/);
  assert.match(t, /Tenor/);
  assert.match(t, /C3/);
  assert.match(t, /C5/);
  assert.doesNotMatch(t, /Focus this week/);
  assert.match(t, /about 20 minutes/);
  assert.match(t, /blues \(flavour only/);
  assert.match(t, /I rush/);
});

test("the prompt drops repeats arithmetic and the old singing rule, and teaches blocks", () => {
  const all = buildPrompt(rated, catalogue());
  const rules = promptParts(rated, catalogue()).filter((p) => !p.example).map((p) => p.text).join("\n");
  assert.doesNotMatch(rules, /repeats/);
  assert.doesNotMatch(all, /"repeats"/);
  assert.match(all, /split into two exercises rather than exceed 6/);
  assert.doesNotMatch(all, /Always pair singing with playing/);
  assert.match(all, /at most one block of 3 minutes or less/);
  assert.match(all, /"minutes": 3/);
  assert.match(all, /Why it's good:/);
});

test("skipped questionnaire: the student part asks for the answers", () => {
  assert.match(promptParts(null, []).find((p) => p.id === "student")!.text, /skipped the questionnaire/);
});

test("the rules ask for the student's voice type on staff and singer tools", () => {
  const rules = promptParts(DEFAULT_ANSWERS, []).filter((p) => p.kind === "rules").map((p) => p.text).join("\n");
  assert.match(rules, /set "voice" on every staff, melody-singer and run-singer tool/);
  assert.match(promptParts(null, []).find((p) => p.id === "student")!.text, /their level in each area/);
});

const topicWeek = (progress?: string): StoredPlan => ({
  id: "w", startedOn: "2026-11-01", done: { "0:0": true, "1:0": true }, feedback: "Barre still hurts",
  rated: { "0:0": { stars: 4, at: "2026-11-02T10:00:00.000Z" }, "1:0": { stars: 2, at: "2026-11-03T10:00:00.000Z" } },
  config: {
    title: "Week 1", ...(progress ? { progress } : {}),
    days: Array.from({ length: 7 }, (_, i) => ({
      theme: `T${i}`,
      exercises: [
        i === 0 ? { title: "Barre drill", minutes: 5, level: "beginner" as const, area: "guitar" as const, topic: "guitar-barre-chords", focus: "F barre" }
          : i === 1 ? { title: "Spider", minutes: 5, level: "beginner" as const, area: "guitar" as const, topic: "guitar-techniques" }
          : i === 2 ? { title: "Mystery", minutes: 5 }
          : { title: `Scale ${i}`, minutes: 5, area: "guitar" as const, topic: "guitar-scales" },
      ],
    })),
  },
});
const kinds = (prev: StoredPlan[]) => promptParts(rated, [], prev).map((p) => p.kind);
const partOf = (prev: StoredPlan[], id: string) => promptParts(rated, [], prev).find((p) => p.id === id)?.text ?? "";

test("first week: no week, progress or history part", () => {
  for (const k of ["week", "progress", "history"]) assert.ok(!kinds([]).includes(k as never), k);
});

test("weekByTopic: every exercise under its topic with its stars, skipped ones marked, untagged ones under Other", () => {
  const t = weekByTopic(topicWeek());
  assert.match(t, /^Plan "Week 1", started 2026-11-01:/);
  assert.match(t, /### Guitar · Barre chords\n- Day 1: \[4★ Solid\] Barre drill \(beginner · F barre\)/);
  assert.match(t, /### Guitar · Techniques\n- Day 2: \[2★ Struggling\] Spider \(beginner\)/);
  assert.match(t, /### Guitar · Scales\n- Day 4: \[skipped\] Scale 3\n- Day 5: \[skipped\] Scale 4/);
  assert.match(t, /### Other\n- Day 3: \[skipped\] Mystery/);
  assert.ok(t.indexOf("Scales") < t.indexOf("Barre chords") && t.indexOf("Techniques") < t.indexOf("### Other"), "topics in questionnaire order, Other last");
  assert.match(t, /Player's notes on the week: Barre still hurts$/);
});

test("next week, the last plan has a summary: the week by topic and the summary word for word, no earlier weeks", () => {
  const prev = [topicWeek("Barre chords: F buzzes less.\nTechniques: spider slow."), last];
  assert.deepEqual(promptParts(rated, [], prev).map((p) => p.id).slice(0, 5), ["intro", "student", "week", "progress", "how-to-plan"]);
  assert.ok(!kinds(prev).includes("history"));
  assert.ok(partOf(prev, "week").includes(weekByTopic(prev[0])));
  assert.match(partOf(prev, "week"), /1-2 stars: make it easier/);
  assert.ok(partOf(prev, "progress").includes("Barre chords: F buzzes less.\nTechniques: spider slow."));
  assert.match(partOf(prev, "student"), /what they said when they started/);
  assert.doesNotMatch(partOf([], "student"), /when they started/);
});

test("next week, no summary anywhere: the week by topic, then up to two earlier weeks in full, and no word of a summary", () => {
  const older = (id: string): StoredPlan => ({ ...last, id, config: { ...last.config, title: `Old ${id}` } });
  const prev = [topicWeek(), older("a"), older("b"), older("c")];
  assert.deepEqual(promptParts(rated, [], prev).map((p) => p.id).slice(0, 5), ["intro", "student", "week", "history", "how-to-plan"]);
  assert.ok(partOf(prev, "week").includes(weekByTopic(prev[0])));
  const history = partOf(prev, "history");
  assert.ok(history.includes(weekReport(prev[1])) && history.includes(weekReport(prev[2])));
  assert.ok(!history.includes('Plan "Week 1"') && !history.includes("Old c"));
  assert.match(partOf(prev, "student"), /what they said when they started/);
  assert.doesNotMatch(partOf(prev, "student"), /progress summary/);
});

test("the newest summary is used wherever it sits, with the weeks practised since it in full", () => {
  const plain = (id: string): StoredPlan => ({ ...last, id, config: { ...last.config, title: `Plain ${id}` } });
  const prev = [topicWeek(), plain("a"), { ...topicWeek("Scales: position 1 solid."), id: "s", config: { ...topicWeek("Scales: position 1 solid.").config, title: "With summary" } }, { ...topicWeek("Older notes."), id: "o" }];
  assert.deepEqual(promptParts(rated, [], prev).map((p) => p.id).slice(0, 6), ["intro", "student", "week", "progress", "history", "how-to-plan"]);
  assert.ok(partOf(prev, "progress").includes("Scales: position 1 solid."));
  assert.ok(!partOf(prev, "progress").includes("Older notes."));
  const history = partOf(prev, "history");
  assert.ok(history.includes(weekReport(prev[1])) && history.includes(weekReport(prev[2])), "the weeks after the summary was written");
  assert.ok(!history.includes(weekReport(prev[3])));
  assert.match(partOf(prev, "student"), /your progress summary below/);
});

test("the prompt asks for the progress summary and the topic tags, and lists every topic with its concepts", () => {
  for (const prev of [[], [topicWeek("x")]]) {
    const rules = partOf(prev, "how-to-plan");
    assert.match(rules, /"progress"/);
    assert.match(rules, /one line per topic/);
    assert.match(rules, /under about 300 words/);
    const format = partOf(prev, "answer-format");
    assert.match(format, /progress: string;/);
    assert.match(format, /topic: string;/);
    assert.match(format, /concepts\?: string\[\];/);
    for (const t of TOPICS) assert.ok(format.includes(`- ${t.id} (${t.label})`), t.id);
    assert.match(format, /- guitar-barre-chords \(Barre chords\): bm-f-barre/);
  }
});
