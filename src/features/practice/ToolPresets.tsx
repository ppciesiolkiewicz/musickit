"use client";

import { useMemo, useState } from "react";
import ExerciseTool from "@/features/plan/ui/ExerciseTool";
import { parseTool } from "@/features/plan/model/tools";

export interface Preset {
  label: string;
  props: Record<string, unknown>;
}

/**
 * A plan tool on a page of its own: a row of set-ups (the Variant selector) over the tool, as the plan would draw it.
 * Each set-up is the tool's props as a plan writes them; one that doesn't parse is left out.
 */
export default function ToolPresets({ type, presets, heading }: { type: string; presets: Preset[]; heading?: string }) {
  const tools = useMemo(() => presets.map((p) => ({ label: p.label, tool: parseTool({ type, ...p.props }) })).filter((p) => p.tool), [type, presets]);
  const [at, setAt] = useState(0);
  const pick = tools[at] ?? tools[0];
  if (!pick?.tool) return null;
  return (
    <section className="flex flex-col gap-3">
      {heading && <h2 className="text-lg font-semibold text-slate-100">{heading}</h2>}
      {tools.length > 1 && (
        <div role="radiogroup" aria-label="Variant" className="flex flex-wrap gap-1.5">
          {tools.map((p, i) => (
            <button
              key={p.label}
              type="button"
              role="radio"
              aria-checked={i === at}
              onClick={() => setAt(i)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${i === at ? "border-sky-400 bg-sky-500/15 text-sky-100" : "border-slate-600 text-slate-300 hover:border-slate-400"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <ExerciseTool key={`${type}:${at}`} tool={pick.tool} />
    </section>
  );
}
