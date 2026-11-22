import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SEED_PLANS, seedPlan } from "@/features/library/seed";
import { sanitiseState } from "./model/state";
import type { TodayFailure } from "./model/today";
import DayPlan, { TodayStatus } from "./ui/DayPlan";

const seed = seedPlan(SEED_PLANS.find((p) => (seedPlan(p) as { days?: unknown[] }).days?.length === 7)!);
const plan = sanitiseState({
  current: { id: "own-1", startedOn: "2026-11-18", done: {}, composed: { attempt: 0, declined: [], short: false }, config: { title: "Wednesday 18 November", days: [(seed as { days: object[] }).days[0]] } },
}).current!;

const draw = (anotherFailed: TodayFailure | null) => renderToStaticMarkup(
  <DayPlan plan={plan} streak={null} controls={null} onAnother={() => {}} asking={false} none={false} anotherFailed={anotherFailed} onRate={() => {}} times={[]} onTime={() => {}} onEdit={() => {}} onEditing={() => {}} corner={null} />,
);

test("Get another plan, logged out: the line has a Log in link back to /plan, like today's plan's", () => {
  const html = draw("logged-out");
  assert.match(html, /You&#x27;re logged out/);
  assert.match(html, /href="\/login\?next=%2Fplan"[^>]*>Log in</);
  assert.doesNotMatch(draw("offline"), /Log in</);
});

test("the later lines say what to do: check this device's date and time", () => {
  assert.match(draw("later"), /Check this device&#x27;s date and time/);
  const status = renderToStaticMarkup(<TodayStatus view={{ kind: "failed", failure: "later" }} onRetry={() => {}} answers={null} />);
  assert.match(status, /Check this device&#x27;s date and time/);
  assert.doesNotMatch(status, /<button/);
});

// --- section headings (DayShape1)

/** Today's plan with its first exercise in `first`'s area and the rest in guitar, and the stored section areas. */
const laidOut = (sections: ("voice" | "guitar")[] | undefined, first: "voice" | "guitar" = "voice") => {
  const d = plan.config.days[0];
  const exercises = d.exercises.map((e, i) => ({ ...e, area: i < 1 ? first : "guitar" as const }));
  const day = { ...d, exercises, ...(sections ? { sections } : {}) };
  return renderToStaticMarkup(
    <DayPlan plan={{ ...plan, config: { ...plan.config, days: [day] } }} streak={null} controls={null} onAnother={() => {}} asking={false} none={false} anotherFailed={null} onRate={() => {}} times={[]} onTime={() => {}} onEdit={() => {}} onEditing={() => {}} corner={null} />,
  );
};

test("a day laid out in two sections has each area's name above its exercises", () => {
  const html = laidOut(["voice", "guitar"]);
  assert.equal(html.match(/<h3[^>]*>Voice<\/h3>/g)?.length, 1);
  assert.equal(html.match(/<h3[^>]*>Guitar<\/h3>/g)?.length, 1);
  assert.ok(html.indexOf(">Voice</h3>") < html.indexOf(">Guitar</h3>"));
});

test("a day stored before sections, and a day of one section, draw with no area heading", () => {
  assert.doesNotMatch(laidOut(undefined), /<h3[^>]*>(Voice|Guitar)<\/h3>/);
  assert.doesNotMatch(laidOut(["guitar"], "guitar"), /<h3[^>]*>(Voice|Guitar)<\/h3>/);
});
