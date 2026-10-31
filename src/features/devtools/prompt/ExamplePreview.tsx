"use client";

import { useMemo } from "react";
import type { CatalogueEntry } from "@/features/plan/model/catalogue";
import ExerciseCard from "@/features/plan/ui/ExerciseCard";
import { parsePreview, previewPlanText } from "../model/preview";
import PlanPreview from "./PlanPreview";

/** One example rendered: an exercise as the plan's exercise card, a plan as the week view; the parser's warnings above. */
export default function ExamplePreview({ json, entries }: { json: string; entries: CatalogueEntry[] }) {
  const p = useMemo(() => parsePreview(json, entries), [json, entries]);
  if (!p.ok) return <p role="alert" className="text-sm text-rose-300">Doesn&apos;t parse: {p.error}</p>;
  return (
    <div className="flex flex-col gap-3">
      {p.warnings.length > 0 && (
        <ul className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300/90">{p.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      )}
      {p.exercise ? (
        <ExerciseCard exercise={p.exercise} index={0} />
      ) : (
        <PlanPreview reply={previewPlanText(json)} />
      )}
    </div>
  );
}
