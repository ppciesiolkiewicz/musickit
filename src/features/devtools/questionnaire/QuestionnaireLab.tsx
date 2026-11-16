"use client";

import { useState, type ReactNode } from "react";
import { DEFAULT_ANSWERS, levelOf, type PlanAnswers } from "@/features/plan/intake/answers";
import { questionSteps, type SetAnswer } from "@/features/plan/intake/ui/Questionnaire";
import { topicById, topicsFor } from "@/features/plan/intake/topics";
import { AREAS, CONCEPTS } from "@/features/plan/model/concepts";
import { reach } from "@/features/plan/model/reach";
import { selectExamples } from "@/features/plan/model/exampleSelection";
import { startOutcome } from "@/features/plan/model/outcome";

const LEVELS = ["new", "beginner", "intermediate", "advanced"];
const fresh = (): PlanAnswers => ({ ...DEFAULT_ANSWERS, areas: [...DEFAULT_ANSWERS.areas], topics: {} });

const CHIP_LABEL = { known: "known", reach: "within reach", open: "open", ahead: "ahead" } as const;
const CHIP_STYLE: Record<keyof typeof CHIP_LABEL, string> = {
  known: "border-emerald-500/60 bg-emerald-500/15 text-emerald-200",
  reach: "border-sky-400 bg-sky-500/20 text-sky-100 font-semibold",
  open: "border-dashed border-slate-500 text-slate-300",
  ahead: "border-slate-800 text-slate-500",
};

function Chip({ kind, text }: { kind: keyof typeof CHIP_LABEL; text: string }) {
  return <span className={`rounded border px-1.5 py-0.5 text-[11px] ${CHIP_STYLE[kind]}`}>{text}</span>;
}

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
          <p className="mb-2 text-xs text-slate-400">
            Each skill&apos;s steps for these answers (<code>reach</code> in plan/model/reach.ts): known, within reach (a few per
            topic, by its line), open (nothing to learn first, but the topic&apos;s places are full) or ahead. &quot;start&quot; is
            where the questionnaire puts them.
          </p>
          <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            {(["known", "reach", "open", "ahead"] as const).map((k) => <span key={k} className="inline-flex items-center gap-1"><Chip kind={k} text={CHIP_LABEL[k]} /></span>)}
          </p>
          {draft.areas.length === 0 ? noArea : draft.areas.map((area) => {
            const marks = reach({ topics: draft.topics });
            return (
              <div key={area} className="mb-4 last:mb-0">
                <h3 className="mb-1 text-xs font-semibold text-slate-400">{areaLabel(area)}</h3>
                <Table
                  head={["Skill", "Topic", "Steps"]}
                  rows={CONCEPTS.filter((c) => c.area === area).map((c) => [
                    c.label,
                    topicById(c.topic)?.label ?? c.topic,
                    <span key="s" className="flex flex-wrap gap-1">
                      {c.steps.map((st, i) => {
                        const r = marks.get(`${c.id}:${i + 1}`)!;
                        const kind = r.mark === "ahead" && r.open ? "open" : r.mark;
                        return <Chip key={i} kind={kind} text={`${i + 1}. ${st.name}${r.start ? " · start" : ""}`} />;
                      })}
                    </span>,
                  ])}
                />
              </div>
            );
          })}
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
