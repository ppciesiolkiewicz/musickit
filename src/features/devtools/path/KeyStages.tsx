"use client";

import type { Area } from "@/features/plan/model/concepts";
import { playerKeys, trackKeys } from "@/features/plan/model/keyStages";
import { PATH } from "@/features/plan/model/path";
import type { ProgressEntry } from "@/features/progress/log";
import { keyName } from "@/features/theory/keySlug";

/*
 * /dev/path → Path: the key stages of each track that states its own key order (`Track.keys`, plan/model/path.ts).
 * A step is first played in the first group; each later group is a key stage inside the step, opened once the player
 * found the step easy in a key of the stage before (plan/model/keyStages.ts). With a player's ratings (`entries`), each
 * step shows the keys open on it, and the keys earned on the whole track are marked.
 */
export default function KeyStages({ area, entries, selected }: { area: Area; /** a player's progress log; null: no player chosen */ entries: ProgressEntry[] | null; /** the track picked on the path, shown alone; null: every track with a key order */ selected: string | null }) {
  const all = PATH.filter((t) => t.area === area && t.keys);
  const tracks = selected && all.some((t) => t.id === selected) ? all.filter((t) => t.id === selected) : all;
  if (!tracks.length) return selected ? null : <p className="text-xs text-slate-500">No track of this area has its own key order yet: its blocks take the area&apos;s key ladder (the Keys view).</p>;
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">Key stages</h2>
        <p className="max-w-3xl text-xs text-slate-400">
          The order a track&apos;s keys are learned in. A block that can change key opens in the first key; a later group opens on a step once a play of that step, rated 4 or 5, opened in a key of the group before. A key stage is inside a step, so the next step can open beside it. {entries ? "Bright: open on the step. Ringed: earned on the track." : "Pick a player (Me) to see their open and earned keys."}
        </p>
      </div>
      {tracks.map((t) => {
        const groups = trackKeys(t);
        const earned = entries ? new Set(playerKeys(t, `${t.id}:1`, entries, 0).earned) : new Set<number>();
        return (
          <div key={t.id} className="flex flex-col gap-1.5">
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
              <span className="font-medium">{t.label}</span>
              {groups.map((g, i) => (
                <span key={i} className="flex items-center gap-1 rounded border border-slate-700 px-1.5 py-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">{i === 0 ? "first" : `stage ${i + 1}`}</span>
                  {g.map((k) => <span key={k} className={`rounded px-1 text-[11px] font-semibold ${earned.has(k) ? "text-emerald-200 ring-1 ring-emerald-400/70" : "text-slate-300"}`}>{keyName(k)}</span>)}
                </span>
              ))}
            </p>
            {entries && (
              <table className="border-collapse text-xs">
                <tbody>
                  {t.steps.map((st, i) => {
                    const ref = `${t.id}:${i + 1}`;
                    const open = new Set(playerKeys(t, ref, entries, 0).open);
                    return (
                      <tr key={ref} className="border-t border-slate-800">
                        <td className="py-1 pr-3 font-mono text-[10px] text-slate-500">{ref}</td>
                        <td className="py-1 pr-4 text-slate-300">{st.name}</td>
                        <td className="py-1">
                          <span className="flex flex-wrap gap-1">
                            {groups.flat().map((k) => <span key={k} className={`rounded border px-1 text-[11px] font-semibold ${open.has(k) ? "border-sky-400/70 bg-sky-500/20 text-sky-50" : "border-slate-800 text-slate-600"}`}>{keyName(k)}</span>)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </section>
  );
}
