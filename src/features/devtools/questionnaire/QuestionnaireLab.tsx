"use client";

import { useState, type ReactNode } from "react";
import { DEFAULT_ANSWERS, levelOf, type PlanAnswers } from "@/features/plan/intake/answers";
import { questionSteps, type SetAnswer } from "@/features/plan/intake/ui/Questionnaire";
import { topicById, topicsFor } from "@/features/plan/intake/topics";
import { AREAS, CONCEPTS, conceptById, conceptsFor } from "@/features/plan/model/concepts";
import { placement } from "@/features/plan/intake/placement";
import { selectExamples } from "@/features/plan/model/exampleSelection";
import { startOutcome } from "@/features/plan/model/outcome";

const LEVELS = ["new", "beginner", "intermediate", "advanced"];
const fresh = (): PlanAnswers => ({ ...DEFAULT_ANSWERS, areas: [...DEFAULT_ANSWERS.areas], topics: {} });

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-100">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="text-slate-500">
          <tr>{head.map((h) => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-800">
              {r.map((c, j) => <td key={j} className="py-1 pr-3 align-top">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const areaLabel = (id: string) => AREAS.find((a) => a.id === id)?.label ?? id;

export default function QuestionnaireLab() {
  const [draft, setDraft] = useState<PlanAnswers>(fresh);
  const set: SetAnswer = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const steps = questionSteps(draft, set);
  const { plan, exercises } = selectExamples(draft);
  const noArea = <p className="text-xs text-slate-500">No area chosen</p>;

  return (
    <div className="grid gap-6 desk:grid-cols-2 desk:items-start">
      <div className="min-w-0 space-y-4">
        <button type="button" onClick={() => setDraft(fresh())} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">Reset answers</button>
        {steps.map((s) => (
          <div key={String(s.title)} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="text-base font-semibold text-slate-100">{s.title}</h2>
            {s.hint && <div className="mt-1 text-sm text-slate-400">{s.hint}</div>}
            <div className="mt-3">{s.body}</div>
          </div>
        ))}
      </div>

      <div className="min-w-0 space-y-4">
        <Section title="Topics">
          {draft.areas.length === 0 ? noArea : (
            <Table
              head={["Area", "Topic", "Rung", "Level"]}
              rows={draft.areas.flatMap((area) => topicsFor(area).map((t) => {
                const r = draft.topics[t.id];
                return [areaLabel(area), t.label, r === undefined ? "unanswered" : r, r === undefined ? "–" : LEVELS[r]];
              }))}
            />
          )}
        </Section>

        <Section title="Area levels">
          {draft.areas.length === 0 ? noArea : (
            <Table
              head={["Area", "Mean rung", "Level"]}
              rows={draft.areas.map((area) => {
                const rungs = topicsFor(area).flatMap((t) => draft.topics[t.id] ?? []);
                const mean = rungs.length ? (rungs.reduce<number>((s, r) => s + r, 0) / rungs.length).toFixed(2) : "–";
                return [areaLabel(area), mean, levelOf(draft, area)];
              })}
            />
          )}
        </Section>

        <Section title="Concepts">
          {draft.areas.length === 0 ? noArea : draft.areas.map((area) => {
            const inIds = new Set(conceptsFor(area, levelOf(draft, area)).map((c) => c.id));
            const all = CONCEPTS.filter((c) => c.area === area);
            const sorted = [...all.filter((c) => inIds.has(c.id)), ...all.filter((c) => !inIds.has(c.id))];
            return (
              <div key={area} className="mb-3 last:mb-0">
                <h3 className="mb-1 text-xs font-semibold text-slate-400">{areaLabel(area)}</h3>
                <Table
                  head={["", "Concept", "Level", "Topic"]}
                  rows={sorted.map((c) => [inIds.has(c.id) ? "in" : "out", c.label, c.level, topicById(c.topic)?.label ?? c.topic])}
                />
              </div>
            );
          })}
        </Section>

        <Section title="Starting steps">
          {(() => {
            const placed = placement(draft.topics);
            if (!placed.length) return <p className="text-xs text-slate-400">No topic answered yet.</p>;
            return (
              <Table
                head={["Skill", "Topic", "Starts on"]}
                rows={placed.map((p) => {
                  const c = conceptById(p.concept)!;
                  const where = p.step === null ? "done: every step is under their level" : `${p.step + 1} of ${c.steps.length}: ${c.steps[p.step].name}${p.state === "ahead" ? " (ahead of their level)" : ""}`;
                  return [c.label, topicById(c.topic)?.label ?? c.topic, where];
                })}
              />
            );
          })()}
        </Section>

        <Section title="Examples picked">
          <p className="mb-2 text-xs text-slate-300">Plan: {plan.id}, {plan.level}, {plan.areas.join(", ")}</p>
          <Table head={["Exercise", "Areas", "Level"]} rows={exercises.map((e) => [e.id, e.areas.join(", "), e.level])} />
        </Section>

        <Section title="Starting outcome">
          {startOutcome(draft.topics).map(({ area, topics }) => (
            <div key={area} className="mb-3 last:mb-0">
              <h3 className="mb-1 text-xs font-semibold text-slate-400">{areaLabel(area)}</h3>
              <Table head={["Topic", "Score"]} rows={topics.map((t) => [t.label, t.score === null ? "–" : t.score])} />
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}
