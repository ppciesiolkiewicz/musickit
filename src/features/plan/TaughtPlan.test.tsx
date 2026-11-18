import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SEED_PLANS } from "@/features/library/seed";
import { sanitiseState } from "./model/state";
import { taughtView } from "./model/today";
import { GivenPlanView } from "./GivenPlan";
import GivenPlans from "./ui/GivenPlans";
import TaughtPlanView from "./ui/TaughtPlan";
import type { StoredPlan } from "./model/types";

/** A teacher's student's document: the week running now, an older week, an upcoming one, and a plan someone shared. */
const seed = SEED_PLANS.find((p) => (p.plan as { days?: unknown[] }).days?.length === 7)!;
const days = (seed.plan as { days: object[] }).days;
const week = (id: string, startedOn: string) => ({ id, startedOn, done: {}, teacher: { madeAt: `${startedOn}T09:00:00.000Z` }, config: { title: "", days } });
const state = sanitiseState({
  current: null,
  given: [week("now", "2026-11-16"), week("old", "2026-11-09"), { id: "shared", startedOn: "2026-11-10", done: {}, from: "s1", config: seed.plan }],
});
const TODAY = "2026-11-18";

/** The page as `/plan` draws it for a teacher's student, the week through the same view `/plan/given/<id>` uses. */
const draw = (s = state, date = TODAY) =>
  renderToStaticMarkup(
    <TaughtPlanView
      view={taughtView(s, date)}
      week={(p: StoredPlan) => <GivenPlanView plan={p} date={date} day={null} onDay={() => {}} onRate={() => {}} times={[]} onTime={() => {}} onEdit={() => {}} controls={null} corner={null} />}
      streak={null}
    />,
  );

test("a teacher's student's /plan draws the week covering today, named by its dates, with stars and the day strip", () => {
  const html = draw();
  assert.equal(html.match(/role="tab"/g)?.length, 7);
  assert.match(html, /Day 3 of 7 · started 16 November/);
  assert.match(html, /Week of 16 November/);
  assert.match(html, />Today</);
});

test("no composer controls: no Change my answers, no Get another plan, no Start, no Share plan", () => {
  const html = draw();
  for (const word of ["Change my answers", "Get another plan", ">Start<", "Share plan", "putting today"]) assert.ok(!html.includes(word), word);
});

test("older weeks are listed as links to their own page; the shared plan is not among them", () => {
  const html = draw();
  assert.match(html, /Earlier plans/);
  assert.match(html, /href="\/plan\/given\/old"/);
  assert.match(html, /Week of 9 November/);
  assert.doesNotMatch(html, /href="\/plan\/given\/now"/, "the week drawn is not listed again");
  assert.doesNotMatch(html, /href="\/plan\/given\/shared"/);
});

test("with every week ended, the newest is drawn under a line that the teacher hasn't made a new one", () => {
  const html = draw(state, "2026-12-01");
  assert.match(html, /Your teacher hasn&#x27;t made a new plan yet/);
  assert.match(html, /7 days · started 16 November/);
});

test("a week still to come: when it starts, in words", () => {
  const s = sanitiseState({ current: null, given: [week("next", "2026-11-23")] });
  const html = draw(s);
  assert.match(html, /Your plan starts on Monday 23 November\./);
  assert.doesNotMatch(html, /role="tab"/);
});

test("no week at all: one line that the teacher hasn't made a plan yet", () => {
  const html = draw(sanitiseState({ current: null, given: [] }));
  assert.match(html, /Your teacher hasn&#x27;t made a plan for you yet/);
  assert.doesNotMatch(html, /role="tab"|Earlier plans/);
});

test("Plans shared with you leaves out the weeks a teacher made", () => {
  const html = renderToStaticMarkup(<GivenPlans plans={state.given} />);
  assert.match(html, /href="\/plan\/given\/shared"/);
  assert.doesNotMatch(html, /href="\/plan\/given\/(now|old)"/);
  assert.equal(renderToStaticMarkup(<GivenPlans plans={state.given.filter((p) => p.teacher)} />), "");
});

test("a teacher's week on its own page (no `from`) draws, with a title from its dates", () => {
  const html = renderToStaticMarkup(<GivenPlanView plan={state.given[0]} date={TODAY} day={null} onDay={() => {}} controls={null} corner={null} />);
  assert.match(html, /Week of 16 November/);
  assert.equal(html.match(/role="tab"/g)?.length, 7);
});
