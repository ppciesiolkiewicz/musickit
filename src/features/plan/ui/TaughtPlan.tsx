import type { ReactNode } from "react";
import type { TaughtView } from "../model/today";
import type { StoredPlan } from "../model/types";
import { EarlierWeeks } from "./GivenPlans";

const panel = "flex flex-wrap items-start gap-3 rounded-2xl border border-l-4 border-slate-700 bg-slate-900/80 p-4";

/** A line in place of, or over, the week: what the student is looking at and why. */
function Line({ children }: { children: ReactNode }) {
  return (
    <section role="status" className={`${panel} border-l-sky-400`}>
      <p className="min-w-0 flex-1 text-sm text-slate-300">{children}</p>
    </section>
  );
}

/**
 * `/plan` for a teacher's student (`Account.taught`), drawn from `taughtView`: the week covering today, drawn by the host's
 * `week` (the same live view `/plan/given/<id>` uses, so ratings, ticks and the day timer work as there); a week still to
 * come, as the day it starts; the newest ended week under a line that their teacher hasn't made a new one; or one line
 * that there is no plan yet. The earlier weeks are listed under it. No questionnaire, no composing, no Get another plan.
 */
export default function TaughtPlanView({ view, week, streak }: {
  view: TaughtView;
  /** draws one of the student's weeks, live */
  week: (plan: StoredPlan) => ReactNode;
  /** the streak button, once its inputs have loaded */
  streak: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {streak && <div>{streak}</div>}
      {view.kind === "upcoming" && <Line>Your plan starts on {view.starts}.</Line>}
      {view.kind === "none" && <Line>Your teacher hasn&apos;t made a plan for you yet. When they make one, it shows here.</Line>}
      {view.kind === "ended" && <Line>Your teacher hasn&apos;t made a new plan yet. Until then, you can keep practising from your last plan below.</Line>}
      {(view.kind === "week" || view.kind === "ended") && week(view.plan)}
      <EarlierWeeks weeks={view.older} />
    </div>
  );
}
