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
