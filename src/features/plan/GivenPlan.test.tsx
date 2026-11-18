import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SEED_PLANS } from "@/features/library/seed";
import { sanitiseState } from "./model/state";
import { GivenPlanView } from "./GivenPlan";
import GivenPlans from "./ui/GivenPlans";
import { dayWords, isDayTitle } from "./model/today";

/** A state with one given seven-day plan, made from a real seed plan the way a claim makes a copy. */
const seed = SEED_PLANS.find((p) => (p.plan as { days?: unknown[] }).days?.length === 7)!;
const state = sanitiseState({
  current: null,
  given: [{ id: "given-1", startedOn: "2026-11-15", done: {}, from: "s1", config: seed.plan }],
});
const plan = state.given[0];

/** A shared plan of one day: a composed day someone shared from `/plan`, claimed. */
const oneDay = sanitiseState({
  current: null,
  given: [{ id: "one-1", startedOn: "2026-11-18", done: {}, from: "s2", config: { title: "Wednesday 18 November", days: [{ ...(seed.plan as { days: object[] }).days[0], theme: "Scales and basic chords" }] } }],
}).given[0];

const draw = (p: typeof plan | undefined, date: string) =>
  renderToStaticMarkup(<GivenPlanView plan={p} date={date} day={null} onDay={() => {}} onRate={() => {}} times={[]} onTime={() => {}} onEdit={() => {}} controls={null} corner={null} />);

const view = (id: string, date: string) =>
  renderToStaticMarkup(<GivenPlanView plan={state.given.find((p) => p.id === id)} date={date} day={null} onDay={() => {}} onRate={() => {}} times={[]} onTime={() => {}} onEdit={() => {}} controls={null} corner={null} />);

test("a given plan's page draws its week: the seven days, today marked, the day's exercises", () => {
  assert.ok(plan, "the seed plan parses as a stored plan");
  const html = view("given-1", "2026-11-17");
  assert.equal(html.match(/role="tab"/g)?.length, 7);
  assert.match(html, /Day 3 of 7 · started 15 November/);
  assert.doesNotMatch(html, /2026-11-15/, "the date reads as words, not as stored");
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
  assert.match(html, /7 days · started 15 November/);
  assert.match(html, /Day 7: /);
});

test("an id not in the given plans draws the not-found state, with a link back to /plan", () => {
  const html = view("nope", "2026-11-17");
  assert.match(html, /This shared plan isn&#x27;t in your plans/);
  assert.match(html, /href="\/plan"/);
  assert.doesNotMatch(html, /role="tab"/);
});

test("a shared plan of one day, while its day runs: one day, no day strip, no day count, its exercises with stars", () => {
  assert.ok(oneDay, "the one-day plan parses");
  const html = draw(oneDay, "2026-11-18");
  assert.doesNotMatch(html, /role="tab"/);
  assert.doesNotMatch(html, /Day 1 of 1/);
  assert.doesNotMatch(html, /1 days/);
  assert.match(html, /1 day · started 18 November/);
  assert.doesNotMatch(html, /Wednesday 18 November/, "the date title is not drawn: the start date says the day");
  assert.match(html, />Shared plan</);
  assert.match(html, /Scales and basic chords/);
  assert.match(html, /How did it go\?/, "its exercises can be rated");
});

test("a shared plan of one day, after its day: still one day, no strip, no day count", () => {
  const html = draw(oneDay, "2026-11-20");
  assert.doesNotMatch(html, /role="tab"/);
  assert.doesNotMatch(html, /Day 1 of 1/);
  assert.doesNotMatch(html, /1 days/);
  assert.match(html, /1 day · started 18 November/);
  assert.match(html, /How did it go\?/);
});

/** The same day, claimed a day later: the sharer's dated title, the receiver's start date. */
const lateDay = { ...oneDay, id: "one-2", startedOn: "2026-11-19" };

test("a shared composed day reads one date, the receiver's start, and its title is not the sharer's date", () => {
  const html = draw(lateDay, "2026-11-19");
  assert.match(html, /1 day · started 19 November/);
  assert.doesNotMatch(html, /18 November/);
  assert.match(html, />Shared plan</);
  assert.match(html, /Scales and basic chords/);
});

test("Plans shared with you: a shared composed day is listed as a shared plan with one date; a titled plan keeps its title", () => {
  const html = renderToStaticMarkup(<GivenPlans plans={[lateDay, plan]} />);
  assert.doesNotMatch(html, /18 November/);
  assert.match(html, />Shared plan</);
  assert.match(html, /1 day · started 19 November/);
  assert.ok(html.includes(plan.config.title.replace(/&/g, "&amp;").replace(/'/g, "&#x27;")));
});

test("Plans shared with you leaves out a plan the player removed; with only removed ones it draws nothing", () => {
  const html = renderToStaticMarkup(<GivenPlans plans={[{ ...lateDay, hidden: true }, plan]} />);
  assert.doesNotMatch(html, />Shared plan</);
  assert.equal(renderToStaticMarkup(<GivenPlans plans={[{ ...plan, hidden: true }]} />), "");
});

test("isDayTitle: the date title of a composed day, and nothing else", () => {
  assert.equal(isDayTitle("Wednesday 18 November"), true);
  assert.equal(isDayTitle(dayWords("2027-01-01", []).title), true);
  assert.equal(isDayTitle("Open chords, week 1"), false);
  assert.equal(isDayTitle("Wednesday 18 November and more"), false);
});

test("without onRate, onTime and onEdit (a teacher looking): the week as the player sees it, with no stars, no day timer and no Edit", () => {
  const live = view("given-1", "2026-11-17");
  assert.match(live, /How did it go\?/);
  assert.match(live, /Reset the day&#x27;s timer/);
  const html = renderToStaticMarkup(<GivenPlanView plan={plan} date="2026-11-17" day={null} onDay={() => {}} controls={null} corner={null} />);
  assert.equal(html.match(/role="tab"/g)?.length, 7, "the days can still be opened");
  assert.match(html, /Day 3 of 7 · started 15 November/);
  assert.match(html, /Day 3: /);
  assert.doesNotMatch(html, /How did it go\?/);
  assert.doesNotMatch(html, /Reset the day&#x27;s timer/);
  assert.doesNotMatch(html, />\s*Edit\s*</);
});
