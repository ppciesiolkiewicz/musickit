import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SEED_PLANS } from "@/features/library/seed";
import { sanitiseState } from "./model/state";
import { GivenPlanView } from "./GivenPlan";

/** A state with one given seven-day plan, made from a real seed plan the way a claim makes a copy. */
const seed = SEED_PLANS.find((p) => (p.plan as { days?: unknown[] }).days?.length === 7)!;
const state = sanitiseState({
  current: null,
  given: [{ id: "given-1", startedOn: "2026-11-15", done: {}, from: "s1", config: seed.plan }],
});
const plan = state.given[0];

const view = (id: string, date: string) =>
  renderToStaticMarkup(<GivenPlanView plan={state.given.find((p) => p.id === id)} date={date} day={null} onDay={() => {}} onRate={() => {}} times={[]} onTime={() => {}} onEdit={() => {}} controls={null} corner={null} />);

test("a given plan's page draws its week: the seven days, today marked, the day's exercises", () => {
  assert.ok(plan, "the seed plan parses as a stored plan");
  const html = view("given-1", "2026-11-17");
  assert.equal(html.match(/role="tab"/g)?.length, 7);
  assert.match(html, /Day 3 of 7/);
  assert.equal(html.match(/>Today</g)?.length, 1);
  assert.ok(html.includes(plan.config.title.replace(/&/g, "&amp;").replace(/'/g, "&#x27;")), "the plan's title");
  assert.match(html, /Day 3: /);
  assert.doesNotMatch(html, /isn&#x27;t in your plans/);
});

test("past its last day, every day is open and the page says no day count", () => {
  const html = view("given-1", "2026-12-30");
  assert.equal(html.match(/role="tab"/g)?.length, 7);
  assert.doesNotMatch(html, /Coming up/);
  assert.doesNotMatch(html, />Today</, "no day is today once the days are over");
  assert.doesNotMatch(html, /Day \d of 7/);
  assert.match(html, /Day 7: /);
});

test("an id not in the given plans draws the not-found state, with a link back to /plan", () => {
  const html = view("nope", "2026-11-17");
  assert.match(html, /This shared plan isn&#x27;t in your plans/);
  assert.match(html, /href="\/plan"/);
  assert.doesNotMatch(html, /role="tab"/);
});
