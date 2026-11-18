import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SEED_PLANS } from "@/features/library/seed";
import { sanitiseState } from "@/features/plan/model/state";
import type { StudentRow, StudentView, TopicSlider } from "../model/types";
import { afterMake, madeLine, planInput, viewOf, type MakeForm, type Sent, type ViewState } from "../model/makeFlow";
import { ROTATE_TITLE, RotateQuestion, StudentPageView } from "./StudentPage";
import type { Access } from "./StudentsApp";

const ann: StudentRow = { id: "a1", name: "Ann", email: "ann@school.com", addedAt: "2026-11-10T10:00:00.000Z", claimedAt: null };
const topics: TopicSlider[] = [
  { topic: "guitar-chords", label: "Chords", area: "guitar", now: 1.3, atStart: 1 },
  { topic: "guitar-strumming", label: "Strumming", area: "guitar", now: 0.8, atStart: 0.8 },
  { topic: "voice-pitch", label: "Pitch", area: "voice", now: 0, atStart: 0 },
];
const seed = SEED_PLANS.find((p) => (p.plan as { days?: unknown[] }).days?.length === 7)!;
const week = sanitiseState({ current: null, given: [{ id: "w1", startedOn: "2026-11-16", done: {}, config: seed.plan, teacher: { madeAt: "2026-11-15T10:00:00.000Z" } }] }).given[0];
const TODAY = "2026-11-18";

const withWeek: StudentView = { student: ann, plan: week, topics };
const noWeek: StudentView = { student: ann, plan: null, topics: topics.map((t) => ({ ...t, atStart: null })) };
const opening = { "guitar-chords": 1.3, "guitar-strumming": 0.8, "voice-pitch": 0 };

const draw = ({ access = "teacher", state = { kind: "view", view: withWeek }, values = opening, sent = { kind: "idle" }, confirming = false }: { access?: Access; state?: ViewState; values?: Record<string, number>; sent?: Sent; confirming?: boolean } = {}) =>
  renderToStaticMarkup(
    <StudentPageView access={access} id="a1" state={state} today={TODAY} values={values} onValue={() => {}} comment="" onComment={() => {}} sent={sent} onMake={() => {}} confirming={confirming} onConfirm={() => {}} onRetry={() => {}} day={null} onDay={() => {}} />,
  );

const buttons = (html: string) => [...html.matchAll(/<button[^>]*>.*?<\/button>/g)].map((m) => m[0]);
/** The `Slider` atom's thumb for a topic, found by its accessible name. */
const slider = (html: string, label: string) => html.match(new RegExp(`<span[^>]*role="slider"[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? "";

const form = (values: Record<string, number>, comment = ""): MakeForm => ({ start: opening, values, comment });

test("the page sends only the sliders the teacher moved, and the comment only with a week", () => {
  assert.deepEqual(planInput(TODAY, false, form(opening), true), { today: TODAY, rotate: false, scores: {}, comment: "" });
  const values = { ...opening, "guitar-chords": 1.7 };
  assert.deepEqual(planInput(TODAY, true, form(values, "Busy week"), true), { today: TODAY, rotate: true, scores: { "guitar-chords": 1.7 }, comment: "Busy week" });
  assert.equal(planInput(TODAY, false, form(values, "Busy week"), false).comment, "", "no week: no comment");
});

test("afterMake: a failed make keeps the sliders and the comment; a made one empties the comment and counts the sliders as unmoved", () => {
  const before = form({ ...opening, "guitar-chords": 2.4 }, "Busy week");
  const failed = afterMake({ ok: false, code: "no-blocks", error: "The library has no exercises yet." }, before, "Ann", false, TODAY);
  assert.deepEqual(failed, { form: before, sent: { kind: "failed", error: "The library has no exercises yet." }, reload: false });
  const made = afterMake({ ok: true, planId: "p1", start: "2026-11-23", short: false, comment: "stored" }, before, "Ann", false, TODAY);
  assert.deepEqual(made.form, { start: before.values, values: before.values, comment: "" });
  assert.equal(made.reload, true);
  assert.deepEqual(made.sent, { kind: "made", line: "attunr made Ann's next plan. It starts on Monday 23 November. Your words about this week are saved." });
  assert.deepEqual(planInput(TODAY, false, made.form, true).scores, {}, "nothing is sent twice before the reload");
});

test("viewOf: the student with every slider opening at the score today, at a tenth; a failure as the error state", () => {
  const loaded = viewOf({ ok: true, student: ann, plan: null, topics: [{ ...topics[0], now: 1.3333 }] });
  assert.deepEqual(loaded.opening, { "guitar-chords": 1.3 });
  assert.equal(loaded.state.kind, "view");
  assert.deepEqual(viewOf({ ok: false, code: "not-found", error: "x" }), { state: { kind: "error", code: "not-found", error: "x" }, opening: null });
});

test("with a week: the student's name, their week read-only, the sliders by area, the comment box and both buttons", () => {
  const html = draw();
  assert.match(html, />Ann</);
  assert.equal(html.match(/role="tab"/g)?.length, 7, "the week's days");
  assert.doesNotMatch(html, /How did it go\?/, "no stars");
  assert.doesNotMatch(html, /Reset the day&#x27;s timer/, "no timer");
  assert.match(html, /aria-label="Guitar"/);
  assert.match(html, /aria-label="Voice"/);
  const chords = slider(html, "Chords");
  assert.ok(chords, "the Slider atom, named by the topic");
  assert.match(chords, /aria-valuemin="0"/);
  assert.match(chords, /aria-valuemax="3"/);
  assert.doesNotMatch(html, /type="range"/, "no native range input");
  assert.match(html, />Chords</, "the topic's name as text");
  assert.match(html, /Beginner, 30% to Intermediate/, "the value in words");
  assert.match(html, /At the start of this week: Beginner/, "the start-of-week mark");
  for (const w of ["New", "Beginner", "Intermediate", "Advanced"]) assert.match(html, new RegExp(`>${w}</span>`));
  assert.match(html, /<label for="teacher-comment"[^>]*>Anything else about this week\?</);
  assert.ok(buttons(html).some((b) => b.includes("Make next week&#x27;s plan")));
  assert.ok(buttons(html).some((b) => b.includes("Rotate this week&#x27;s plan")));
});

test("no week: No plan yet, no Rotate, no comment box, no start-of-week mark", () => {
  const html = draw({ state: { kind: "view", view: noWeek } });
  assert.match(html, /No plan yet\./);
  assert.ok(buttons(html).some((b) => b.includes("Make next week&#x27;s plan")));
  assert.ok(!buttons(html).some((b) => b.includes("Rotate")), "no Rotate");
  assert.doesNotMatch(html, /Anything else about this week\?/);
  assert.doesNotMatch(html, /At the start of this week/);
});

test("a week that has ended: no Rotate (Make next week's plan starts today)", () => {
  const html = renderToStaticMarkup(
    <StudentPageView access="teacher" id="a1" state={{ kind: "view", view: withWeek }} today="2026-12-01" values={opening} onValue={() => {}} comment="" onComment={() => {}} sent={{ kind: "idle" }} onMake={() => {}} confirming={false} onConfirm={() => {}} onRetry={() => {}} day={null} onDay={() => {}} />,
  );
  assert.ok(!buttons(html).some((b) => b.includes("Rotate")));
  assert.match(html, />Last plan</);
});

test("a 409 no-blocks shows its line and keeps the sliders where the teacher put them", () => {
  const error = "The library has no exercises yet that fit your student's answers, so no plan was made.";
  const html = draw({ values: { ...opening, "guitar-chords": 2.4 }, sent: { kind: "failed", error } });
  assert.match(html, /The library has no exercises yet that fit your student&#x27;s answers/);
  assert.match(html, /Intermediate, 40% to Advanced/, "chords where the teacher put it, not at 1.3");
  assert.doesNotMatch(html, /Beginner, 30% to Intermediate/);
});

test("while a plan is made the buttons and sliders wait; after, the line says what was made", () => {
  const busy = draw({ sent: { kind: "busy" } });
  assert.match(busy, /Making the plan…/);
  assert.ok(buttons(busy).filter((b) => b.includes("plan")).every((b) => / disabled=""/.test(b)));
  assert.match(slider(busy, "Chords"), /data-disabled=""/);
  const made = draw({ sent: { kind: "made", line: "attunr made Ann's next plan. It starts on Monday 23 November." } });
  assert.match(made, /It starts on Monday 23 November\./);
});

test("Rotate asks once: what changes, what stays, and both buttons", () => {
  // the Modal draws into document.body once mounted, so the server render shows nothing of it: its body is drawn here
  assert.doesNotMatch(draw({ confirming: true }), /Replace the plan/);
  const html = renderToStaticMarkup(<RotateQuestion name="Ann" onReplace={() => {}} onKeep={() => {}} />);
  assert.match(html, /attunr makes Ann a new plan for the same dates, from the sliders as you set them\./);
  assert.match(html, /takes the place of the one Ann is in now/);
  assert.match(html, /Ann&#x27;s ratings stay and still count toward their next plans\./);
  assert.ok(buttons(html).some((b) => b.includes("Replace the plan")));
  assert.ok(buttons(html).some((b) => b.includes("Keep this plan")));
  assert.equal(ROTATE_TITLE, "Replace this week's plan?");
});

test("madeLine: what was made, from which date, a short week, the comment", () => {
  assert.equal(madeLine("Ann", { start: "2026-11-23", short: false, comment: "none" }, false, TODAY), "attunr made Ann's next plan. It starts on Monday 23 November.");
  assert.equal(madeLine("Ann", { start: TODAY, short: false, comment: "none" }, false, TODAY), "attunr made Ann's next plan. It starts today, Wednesday 18 November.");
  assert.equal(madeLine("Ann", { start: "2026-11-16", short: false, comment: "stored" }, true, TODAY), "attunr replaced Ann's plan for this week. The new plan keeps the same dates, from Monday 16 November. Your words about this week are saved.");
  assert.match(madeLine("Ann", { start: "2026-11-23", short: true, comment: "none" }, false, TODAY), /Some days are shorter than the minutes you picked/);
  assert.match(madeLine("Ann", { start: TODAY, short: false, comment: "no-week" }, false, TODAY), /weren't kept, because Ann had no plan this week/);
});

test("a 404 shows the not-found state with a link back to Students", () => {
  const html = draw({ state: { kind: "error", code: "not-found", error: "That student isn't on your list." } });
  assert.match(html, /That student isn&#x27;t on your list\./);
  assert.match(html, /href="\/students"[^>]*>.*Open Students</);
  assert.doesNotMatch(html, /type="range"/);
});

test("another failure: its line and Try again", () => {
  const html = draw({ state: { kind: "error", code: "offline", error: "attunr can't reach the server." } });
  assert.match(html, /can&#x27;t reach the server/);
  assert.ok(buttons(html).some((b) => b.includes("Try again")));
});

test("signed out or not a teacher: the Students page's lines, Log in coming back here", () => {
  const out = draw({ access: "logged-out" });
  assert.match(out, /Log in to see your students\./);
  assert.match(out, /href="\/login\?next=%2Fstudents%2Fa1"/);
  assert.match(draw({ access: "not-teacher" }), /Only a teacher&#x27;s account can have students/);
  assert.match(draw({ access: "no-accounts" }), /running without accounts here/);
});
