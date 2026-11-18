"use client";

import { useMemo, useState } from "react";
import { moved } from "@/features/students/model/sliders";
import TopicSliders from "@/features/students/ui/TopicSliders";
import { labSliders, receive, sampleStudents } from "../model/teacherSliderLab";

const RUNGS = ["New", "Beginner", "Intermediate", "Advanced"];
const SAMPLES = sampleStudents();

/** The teacher's sliders on three made-up students: where each opens, where its start-of-plan tick sits, and what the plan maker gets for a slider moved. */
export default function TeacherSlidersLab() {
  const [id, setId] = useState(SAMPLES[0].id);
  const sample = SAMPLES.find((s) => s.id === id)!;
  const sliders = useMemo(() => labSliders(sample), [sample]);
  const start = useMemo(() => Object.fromEntries(sliders.map((t) => [t.topic, t.now])), [sliders]);
  const [values, setValues] = useState<Record<string, number>>({});
  const now = { ...start, ...values };
  const sent = moved(start, now);
  const rows = useMemo(() => receive(sample, sent), [sample, sent]);
  const pick = (next: typeof id) => { setId(next); setValues({}); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {SAMPLES.map((s) => (
          <button key={s.id} type="button" aria-pressed={s.id === id} onClick={() => pick(s.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${s.id === id ? "border-sky-500 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-200 hover:bg-slate-800"}`}>
            {s.label}
          </button>
        ))}
        <button type="button" onClick={() => setValues({})} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">Reset sliders</button>
      </div>
      <p className="text-xs text-slate-400">
        {sample.entries.length} ratings, as of {sample.asOf}. Each slider opens at the topic&apos;s score today; the tick is its score the day before the
        current week began. Only a moved slider is sent.
      </p>
      <div className="grid gap-6 desk:grid-cols-2 desk:items-start">
        <div className="min-w-0">
          <TopicSliders topics={sliders} values={now} onChange={(topic, v) => setValues((o) => ({ ...o, [topic]: v }))} />
        </div>
        <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">What the plan maker receives</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-slate-500">
                <tr>{["Topic", "Slider", "Rung, before → after", "Score, before → after"].map((h) => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.topic} className={`border-t border-slate-800 ${r.moved ? "text-slate-100" : ""}`}>
                    <td className="py-1 pr-3 align-top">{r.label}</td>
                    <td className="py-1 pr-3 align-top">{r.moved ? sent[r.topic].toFixed(1) : "not moved"}</td>
                    <td className="py-1 pr-3 align-top">{r.rungBefore} {RUNGS[r.rungBefore]} → {r.rungAfter} {RUNGS[r.rungAfter]}</td>
                    <td className="py-1 pr-3 align-top">{r.scoreBefore ?? "–"} → {r.scoreAfter ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
