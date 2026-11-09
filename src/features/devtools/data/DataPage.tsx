"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AREAS } from "@/features/plan/model/concepts";
import { EMPTY_STATE, type PlanState } from "@/features/plan/model/types";
import { TOPICS, topicById, topicsFor } from "@/features/plan/intake/topics";
import { PLAN_KEY, localPlanStore } from "@/features/plan/store/localPlanStore";
import { PROGRESS_KEY, localProgressStore } from "@/features/progress/localProgressStore";
import type { ProgressEntry } from "@/features/progress/log";
import { starText } from "@/features/progress/stars";
import { logRows, planRows } from "../model/dataView";

const BTN = "inline-flex min-h-8 cursor-pointer items-center rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const TH = "px-2 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-slate-400";
const TD = "px-2 py-1.5 align-top text-sm text-slate-200";

/** The raw JSON of a block, folded away, with a copy button. */
function Raw({ value }: { value: unknown }) {
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const [copied, setCopied] = useState(false);
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-200">Raw JSON</summary>
      <div className="mt-2 flex flex-col items-start gap-2">
        <button
          type="button"
          className={BTN}
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copied" : "Copy JSON"}
        </button>
        <pre className="max-h-96 w-full overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">{text}</pre>
      </div>
    </details>
  );
}

function Block({ title, about, children }: { title: string; about: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <p className="mb-3 text-xs text-slate-400">{about}</p>
      {children}
    </section>
  );
}

const EMPTY = <p className="text-sm text-slate-500">Nothing stored yet.</p>;

/**
 * /dev/data: what the practice plan keeps in this browser, read-only. The questionnaire answers, the plans, the progress
 * log (one row per rated exercise) and the progress summary the AI sent with each plan, which the app shows nowhere else.
 */
export default function DataPage() {
  const [state, setState] = useState<PlanState>(EMPTY_STATE);
  const [log, setLog] = useState<ProgressEntry[]>([]);
  const [topic, setTopic] = useState("");
  useEffect(() => {
    void localPlanStore.load().then(setState);
    void localProgressStore.list().then(setLog);
  }, []);

  const plans = useMemo(() => planRows(state), [state]);
  const rows = useMemo(() => logRows(log, topic), [log, topic]);
  const titles = useMemo(() => new Map(plans.map((p) => [p.id, p.title])), [plans]);
  const a = state.answers;

  return (
    <div className="flex flex-col gap-4">
      <Block title="Answers" about={`The first questionnaire, from localStorage "${PLAN_KEY}".`}>
        {a ? (
          <div className="flex flex-col gap-3">
            {AREAS.filter((ar) => a.areas.includes(ar.id)).map((ar) => (
              <div key={ar.id}>
                <h3 className="text-sm font-medium text-slate-200">{ar.label}</h3>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {topicsFor(ar.id).map((t) => (
                    <li key={t.id} className="text-sm text-slate-300">
                      <span className="text-slate-400">{t.label}:</span> {a.topics[t.id] === undefined ? <span className="text-slate-500">not answered</span> : t.lines[a.topics[t.id]]}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-sm text-slate-300">
              <span className="text-slate-400">Minutes a day:</span> {a.minutes}
              {a.styles && <> · <span className="text-slate-400">Styles:</span> {a.styles}</>}
              {a.notes && <> · <span className="text-slate-400">Notes:</span> {a.notes}</>}
            </p>
          </div>
        ) : EMPTY}
        <Raw value={a} />
      </Block>

      <Block title="Plans" about="The current plan and the history (newest first, 20 kept).">
        {plans.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className={TH}>Plan</th><th className={TH}>Started</th><th className={TH}>Rated</th><th className={TH}>Id</th></tr></thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-t border-slate-800">
                    <td className={TD}>{p.title}{p.current && <span className="ml-2 rounded bg-sky-500/20 px-1.5 py-0.5 text-xs text-sky-200">current</span>}</td>
                    <td className={TD}>{p.startedOn}</td>
                    <td className={`${TD} tabular-nums`}>{p.rated} / {p.total}</td>
                    <td className={`${TD} font-mono text-xs text-slate-400`}>{p.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : EMPTY}
        <Raw value={{ current: state.current, history: state.history }} />
      </Block>

      <Block title="Progress log" about={`One row per rated exercise, from localStorage "${PROGRESS_KEY}". Rows stay when a plan leaves the history.`}>
        <label className="mb-2 flex w-fit items-center gap-2 text-xs text-slate-400">
          Topic
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className="min-h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200">
            <option value="">All ({log.length})</option>
            {TOPICS.map((t) => <option key={t.id} value={t.id}>{AREAS.find((ar) => ar.id === t.area)!.label} · {t.label} ({log.filter((e) => e.topic === t.id).length})</option>)}
          </select>
        </label>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className={TH}>Rated</th><th className={TH}>Plan</th><th className={TH}>Exercise</th><th className={TH}>Topic</th><th className={TH}>Stars</th></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-slate-800">
                    <td className={`${TD} whitespace-nowrap tabular-nums text-slate-400`}>{e.at.slice(0, 16).replace("T", " ")}</td>
                    <td className={TD}>{titles.get(e.planId) ?? <span className="font-mono text-xs text-slate-500">{e.planId}</span>} <span className="text-slate-500">· day {e.day + 1}</span></td>
                    <td className={TD}>{e.title}{e.focus && <span className="block text-xs text-slate-500">{e.focus}</span>}</td>
                    <td className={TD}>{e.topic ? topicById(e.topic)?.label ?? e.topic : <span className="text-slate-500">none</span>}{e.concepts && <span className="block text-xs text-slate-500">{e.concepts.join(", ")}</span>}</td>
                    <td className={`${TD} whitespace-nowrap`}>{starText(e.stars)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : EMPTY}
        <Raw value={log} />
      </Block>

      <Block title="AI summaries" about="The progress notes the AI returned with each plan. Hidden from the student; the next prompt sends the newest one back.">
        {plans.some((p) => p.progress) ? (
          <div className="flex flex-col gap-3">
            {plans.filter((p) => p.progress).map((p) => (
              <div key={p.id}>
                <h3 className="text-sm font-medium text-slate-200">{p.title} <span className="text-xs font-normal text-slate-500">· started {p.startedOn}</span></h3>
                <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-sans text-sm text-slate-300">{p.progress}</pre>
              </div>
            ))}
          </div>
        ) : EMPTY}
        <Raw value={plans.filter((p) => p.progress).map((p) => ({ id: p.id, title: p.title, startedOn: p.startedOn, progress: p.progress }))} />
      </Block>
    </div>
  );
}
