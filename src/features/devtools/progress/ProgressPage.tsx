"use client";

import { useMemo, useState, type ReactNode } from "react";
import { outcome, type OutcomeInput } from "@/features/plan/model/outcome";
import { addDays, localDate, storedPlans } from "@/features/plan/model/schedule";
import { usePlan, useAllPlanTimes } from "@/features/plan/store/usePlan";
import { useProgress } from "@/features/progress/useProgress";

const TH = "px-2 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-slate-400";
const TD = "px-2 py-1.5 align-top text-sm text-slate-200";
const NUM = `${TD} tabular-nums`;

function Block({ title, about, children }: { title: string; about?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      {about && <p className="mb-3 text-xs text-slate-400">{about}</p>}
      {children}
    </section>
  );
}

function Table({ head, rows, empty = "Nothing." }: { head: string[]; rows: ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead><tr>{head.map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-slate-800">
              {cells.map((c, j) => <td key={j} className={typeof c === "number" ? NUM : TD}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const slots = (r: Record<string, number | string> | undefined) =>
  r && Object.keys(r).length ? Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(", ") : "—";

/** The progress outcome of the signed-in player (or this browser), its inputs and then its outputs, as of any date. */
export default function ProgressPage() {
  const { state, loaded: planLoaded } = usePlan();
  const { entries, loaded: entriesLoaded } = useProgress();
  const { times, loaded: timesLoaded } = useAllPlanTimes();
  const [asOf, setAsOf] = useState(() => localDate());

  const { answersHistory, teacherScores } = state;
  // every plan, the given ones too, as `/plan` and the server's `playerProgress` count them
  const plans = useMemo(() => storedPlans(state), [state]);
  const ready = planLoaded && entriesLoaded && timesLoaded;
  const result = useMemo(() => {
    if (!ready) return null;
    const input: OutcomeInput = { plans, entries, times, answersHistory, teacherScores };
    return outcome(input, asOf);
  }, [ready, plans, entries, times, answersHistory, teacherScores, asOf]);

  if (!ready || !result) return <p className="text-sm text-slate-400">Loading…</p>;

  const startedOn = new Map(plans.map((p) => [p.id, p.startedOn]));
  const dated = times.flatMap((t) => {
    const on = t.on && Object.keys(t.on).length ? Object.entries(t.on).map(([d, s]) => `${d} ${s}s`).join(", ") : null;
    const from = startedOn.get(t.planId);
    const dates = on ?? (from ? `${addDays(from, t.day)} (from plan day)` : "no date");
    return [[t.planId, t.day, dates, t.elapsed, slots(t.spent), slots(t.blocks)]];
  });
  const topics = result.areas.flatMap((a) => a.topics);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm text-slate-300">
        As of
        <input type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100" />
        <button type="button" onClick={() => setAsOf(localDate())} className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">Today</button>
      </label>

      <Block title="Inputs: answers history" about="Each finished questionnaire, oldest first.">
        <Table head={["At", "Answered topics (rung)"]} rows={answersHistory.map((a) => [a.at, Object.entries(a.topics).map(([t, r]) => `${t}: ${r}`).join(", ") || "—"])} />
      </Block>
      <Block title="Inputs: plans">
        <Table head={["Id", "Title", "Started on"]} rows={plans.map((p) => [p.id, p.config.title, p.startedOn])} />
      </Block>
      <Block title="Inputs: entries" about="The progress log, one row per rated exercise.">
        <Table
          head={["At", "Title", "Block", "Choice", "Topic", "Concepts", "Stars"]}
          rows={entries.map((e) => [e.at, e.title, e.blockId ?? "—", e.choiceId ?? "—", e.topic ?? "—", e.concepts?.join(", ") || "—", e.stars])}
        />
      </Block>
      <Block title="Inputs: day records" about="Dates come from the timer's own dates, else the plan's start plus the day.">
        <Table head={["Plan", "Day", "Dates", "Elapsed", "Spent by slot", "Block by slot"]} rows={dated} />
      </Block>

      <Block title="Outcome: streak and time" about={`As of ${result.asOf}.`}>
        <Table
          head={["Streak days", "Through", "Practiced days", "Seconds total", "Seconds sorted"]}
          rows={[[result.streak.days, result.streak.through ?? "—", result.streak.practised.join(", ") || "—", result.seconds.total, result.seconds.sorted]]}
        />
      </Block>
      <Block title="Outcome: per area">
        <Table
          head={["Area", "Ratings", "Seconds", "Topic scores"]}
          rows={result.areas.map((a) => [a.label, a.ratings, a.seconds, a.topics.map((t) => `${t.label} ${t.score === null ? "—" : t.score.toFixed(2)}`).join(", ")])}
        />
      </Block>
      <Block title="Outcome: per topic">
        <Table
          head={["Area", "Topic", "Rung", "Reached", "Score", "Ratings", "Seconds"]}
          rows={topics.map((t) => [t.area, t.label, t.rung ?? "—", t.reached ?? "—", t.score === null ? "—" : t.score.toFixed(2), t.ratings, t.seconds])}
        />
      </Block>
      <Block title="Outcome: per concept">
        <Table
          head={["Topic", "Concept", "Level", "State", "Ratings", "Last on", "Seconds"]}
          rows={topics.flatMap((t) => t.concepts.map((c) => [t.label, c.label, c.level, c.state, c.ratings, c.lastOn ?? "—", c.seconds]))}
        />
      </Block>
    </div>
  );
}
