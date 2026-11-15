import type { ReactNode } from "react";
import { CRITERIA, type Assessment } from "../model/assess";

/** The colour of a mark: green near the reference, amber behind it, rose well behind. */
export const markTone = (score: number, max: number): string => (score / max >= 0.8 ? "text-emerald-300" : score / max >= 0.5 ? "text-amber-300" : "text-rose-300");

function Points({ title, tone, items }: { title: string; tone: string; items: string[] }) {
  return (
    <div className="min-w-0">
      <h4 className={`text-xs font-semibold ${tone}`}>{title} ({items.length})</h4>
      {items.length ? (
        <ul className="mt-1 flex list-disc flex-col gap-1 pl-4 text-xs text-slate-300">
          {items.map((x) => <li key={x}>{x}</li>)}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-slate-500">None.</p>
      )}
    </div>
  );
}

/**
 * One plan as the judge marked it against the reference plan: the score, the summary, a mark per criterion, and where it is
 * stronger, weaker or wrong. `heading` names the two plans; `actions` are the buttons beside it.
 */
export default function AssessmentPanel({ a, heading, stale, actions }: { a: Assessment; heading: string; stale: boolean; actions?: ReactNode }) {
  const v = a.verdict;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {v && <span className={`text-2xl font-semibold tabular-nums ${markTone(v.score, 10)}`}>{v.score}/10</span>}
        <span className="text-sm text-slate-200">{heading}</span>
        <span className="text-xs text-slate-500">{(a.durationMs / 1000).toFixed(0)} s · {a.at.slice(0, 16).replace("T", " ")}</span>
        {actions && <span className="ml-auto flex gap-3 text-xs">{actions}</span>}
      </div>
      {stale && <p className="text-xs text-amber-300/90">Marked against an older reference plan. Run the assessment again to mark it against the newest one.</p>}
      {a.error && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{a.error}</p>}
      {v && (
        <>
          {v.summary && <p className="max-w-prose text-sm text-slate-300">{v.summary}</p>}
          <table className="text-xs">
            <tbody>
              {CRITERIA.map((c) => {
                const m = v.criteria.find((x) => x.id === c.id);
                return (
                  <tr key={c.id} className="border-t border-slate-800 align-top">
                    <td className="whitespace-nowrap py-1 pr-3 text-slate-400">{c.label}</td>
                    <td className={`whitespace-nowrap py-1 pr-3 tabular-nums ${m ? markTone(m.score, 5) : "text-slate-600"}`}>{m ? `${m.score}/5` : "no mark"}</td>
                    <td className="py-1 text-slate-300">{m?.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="grid gap-3 md:grid-cols-3">
            <Points title="Mistakes" tone="text-rose-300" items={v.mistakes} />
            <Points title="Weaker than the reference" tone="text-amber-300" items={v.weaker} />
            <Points title="Stronger than the reference" tone="text-emerald-300" items={v.stronger} />
          </div>
        </>
      )}
      {a.reply && (
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-400">Raw reply</summary>
          <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/60 p-2 font-mono text-[11px] text-slate-300">{a.reply}</pre>
        </details>
      )}
    </div>
  );
}
