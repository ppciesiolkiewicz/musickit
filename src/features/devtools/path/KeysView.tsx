"use client";

import { AREAS, type Area } from "@/features/plan/model/concepts";
import { KEY_LADDERS, KEY_RUNGS, RUNG_OF_LEVEL, type KeyRung } from "@/features/plan/model/keys";
import type { Level } from "@/features/plan/model/types";
import { keyName } from "@/features/theory/keySlug";

/*
 * /admin/content/path → "Keys": the key ladders (plan/model/keys.ts) against the levels. A level does not go through every key:
 * each column shows the keys that level adds and, fainter, the earlier keys it keeps in the Key selector.
 */

const LEVELS: { id: Level; label: string }[] = [
  { id: "new", label: "New" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];
const ANSWERS: Record<KeyRung, string> = { 0: "One key", 1: "Two or three keys", 2: "The common keys", 3: "Most keys", 4: "Any key" };
const AREA_TONE: Record<Area, string> = {
  guitar: "border-amber-400/60 bg-amber-500/15 text-amber-100",
  voice: "border-rose-400/60 bg-rose-500/15 text-rose-100",
  theory: "border-violet-400/60 bg-violet-500/15 text-violet-100",
};

function Keys({ list, tone }: { list: number[]; tone: string }) {
  return <>{list.map((k) => <span key={k} className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${tone}`}>{keyName(k)}</span>)}</>;
}

/** One cell: the keys of rung `rung`, bright when this column adds them, with the rungs below fainter. `same`: the column adds nothing. */
function Cell({ area, rung, same }: { area: Area; rung: KeyRung; same: boolean }) {
  const ladder = KEY_LADDERS[area];
  return (
    <td className="border-l border-slate-800 px-3 py-2 align-top">
      <div className="flex flex-wrap items-center gap-1">
        <Keys list={ladder.slice(0, rung).flat()} tone="border-slate-700 text-slate-500" />
        <Keys list={ladder[rung]} tone={same ? "border-slate-600 text-slate-300" : AREA_TONE[area]} />
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{same ? "nothing new" : rung === 0 ? "the first key" : `adds ${ladder[rung].length} · ${ladder.slice(0, rung + 1).flat().length} of 12`}</p>
    </td>
  );
}

export default function KeysView({ area: picked }: { area: Area }) {
  const top = RUNG_OF_LEVEL.advanced;
  const beyond = KEY_RUNGS.filter((r) => r > top);
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-sm text-slate-400">
        The keys a plan is in, by level. A level does not go through every key: it adds the bright keys, and keeps the faint ones in the Key selector under Earlier.
        An exercise opens in the bright keys of the player&apos;s column. The answer to the keys question, when there is one, picks the column instead of the level.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full border-collapse text-left text-sm text-slate-300">
          <thead>
            <tr className="text-xs text-slate-400">
              <th className="px-3 py-2 font-medium" rowSpan={2}>Area</th>
              <th className="border-l border-slate-800 px-3 pt-2 font-medium" colSpan={LEVELS.length}>By level (no answer to the keys question)</th>
              <th className="border-l border-slate-800 px-3 pt-2 font-medium" colSpan={beyond.length}>Only by the answer</th>
            </tr>
            <tr className="text-xs text-slate-200">
              {LEVELS.map((l) => <th key={l.id} className="border-l border-slate-800 px-3 pb-2 font-semibold">{l.label}</th>)}
              {beyond.map((r) => <th key={r} className="border-l border-slate-800 px-3 pb-2 font-semibold">&ldquo;{ANSWERS[r]}&rdquo;</th>)}
            </tr>
          </thead>
          <tbody>
            {AREAS.map((a) => (
              <tr key={a.id} className={`border-t border-slate-800 ${a.id === picked ? "bg-slate-900/60" : ""}`}>
                <th className="px-3 py-2 align-top font-medium text-slate-100">{a.label}</th>
                {LEVELS.map((l, i) => <Cell key={l.id} area={a.id} rung={RUNG_OF_LEVEL[l.id]} same={i > 0 && RUNG_OF_LEVEL[LEVELS[i - 1].id] === RUNG_OF_LEVEL[l.id]} />)}
                {beyond.map((r) => <Cell key={r} area={a.id} rung={r} same={false} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-100">The keys question</h3>
        <p className="mb-2 max-w-3xl text-xs text-slate-400">One answer for every area: it is the column each area&apos;s exercises open in, whatever the level.</p>
        <table className="border-collapse text-left text-xs text-slate-300">
          <thead><tr className="text-slate-500"><th className="py-1 pr-4 font-medium">Answer</th>{AREAS.map((a) => <th key={a.id} className="py-1 pr-4 font-medium">{a.label} opens in</th>)}<th className="py-1 font-medium">Same as level</th></tr></thead>
          <tbody>
            {KEY_RUNGS.map((r) => (
              <tr key={r} className="border-t border-slate-800">
                <td className="py-1.5 pr-4 text-slate-100">{ANSWERS[r]}</td>
                {AREAS.map((a) => <td key={a.id} className="py-1.5 pr-4"><span className="flex flex-wrap gap-1"><Keys list={KEY_LADDERS[a.id][r]} tone={AREA_TONE[a.id]} /></span></td>)}
                <td className="py-1.5 text-slate-400">{LEVELS.filter((l) => RUNG_OF_LEVEL[l.id] === r).map((l) => l.label).join(", ") || "none: only the answer reaches it"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
