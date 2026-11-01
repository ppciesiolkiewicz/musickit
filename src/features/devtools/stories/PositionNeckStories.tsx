"use client";

import { useState } from "react";
import { View as PositionNeck } from "@/features/exercises/basics/position-neck";
import { parseTool } from "@/features/plan/model/tools";

type Props = Record<string, unknown>;

/** Set-ups to try: the examples that need it, then the awkward keys and crossings. Each is the tool as the AI writes it. */
const STORIES: { name: string; props: Props }[] = [
  { name: "Joining boxes: A minor pentatonic 1 & 2", props: { scale: "minor-pentatonic", key: "a", positions: [1, 2], highlight: ["1", "4", "5"] } },
  { name: "Joining boxes: the crossing 1 → 2 (G string)", props: { scale: "minor-pentatonic", key: "a", cross: { from: 1, to: 2 }, highlight: ["4", "5"] } },
  { name: "Crossing 1 → 2 on the B string", props: { scale: "minor-pentatonic", key: "a", cross: { from: 1, to: 2, string: 2 } } },
  { name: "Crossing 2 → 3, others hidden", props: { scale: "minor-pentatonic", key: "a", cross: { from: 2, to: 3 }, outside: "hidden" } },
  { name: "Crossing 5 → 1 (position 5 an octave down)", props: { scale: "minor-pentatonic", key: "a", cross: { from: 5, to: 1 } } },
  { name: "Dorian: root on the A string (placement)", props: { scale: "dorian", key: "d", placement: { by: "root", string: 5 }, highlight: ["1", "6"] } },
  { name: "Dorian: root on the low E (placement)", props: { scale: "dorian", key: "d", placement: { by: "root", string: 6 }, highlight: ["1", "6"] } },
  { name: "E minor pentatonic: open position", props: { scale: "minor-pentatonic", key: "e", positions: [1] } },
  { name: "G major: positions 2, 3, 4", props: { scale: "major-ionian", key: "g", positions: [2, 3, 4] } },
  { name: "C minor pentatonic 1 & 2, no picker", props: { scale: "minor-pentatonic", key: "c", positions: [1, 2], picker: false } },
];

/** One component, many set-ups: pick a story or edit its JSON, see it as the plan would show it. */
export default function PositionNeckStories() {
  const [i, setI] = useState(0);
  const [text, setText] = useState(JSON.stringify(STORIES[0].props, null, 2));
  const pick = (n: number) => { setI(n); setText(JSON.stringify(STORIES[n].props, null, 2)); };
  let raw: Props | null = null;
  try { raw = JSON.parse(text); } catch { raw = null; }
  const tool = raw && parseTool({ type: "position-neck", ...raw });
  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <nav className="flex flex-col gap-1" aria-label="Stories">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">position-neck</p>
        {STORIES.map((s, n) => (
          <button key={s.name} type="button" onClick={() => pick(n)} className={`rounded px-2 py-1 text-left text-sm ${n === i ? "bg-sky-500/15 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}>{s.name}</button>
        ))}
      </nav>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          {tool && tool.type === "position-neck" ? (
            <PositionNeck slug={tool.scale} pc={tool.key} positions={tool.positions} placement={tool.placement} cross={tool.cross} add={tool.add} enable={tool.enable} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} outside={tool.outside} picker={tool.picker} />
          ) : (
            <p className="text-sm text-rose-300">{raw ? "The tool doesn't parse (unknown scale or key?)" : "Not valid JSON"}</p>
          )}
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Props, as the AI writes them
          <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} rows={8} className="rounded-lg border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-200" />
        </label>
        {tool && <pre className="overflow-x-auto text-[11px] text-slate-500">parsed: {JSON.stringify(tool)}</pre>}
      </div>
    </div>
  );
}
