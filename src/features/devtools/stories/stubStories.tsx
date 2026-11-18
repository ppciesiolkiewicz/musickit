"use client";

import { RhythmGame } from "@/features/rhythm";
import type { Props } from "./stories";
import { STUBS, type StubSpec } from "./stubs";
import type { UiGroup } from "./uiStories";

/* The stubs of stubs.ts as stories: a card in place of the tool, and what exists today under it. */

const TODAY = { "rhythm-game": () => <RhythmGame /> };

/** The card a stub draws in place of a tool: what it would do, who waits on it, and the props this story gives it. */
function StubCard({ spec, props }: { spec: StubSpec; props: Props }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4 text-sm text-slate-300">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">Stub · not built · not in the prompt or the seed</p>
        <p>{spec.what}</p>
        <p className="text-xs text-slate-400"><span className="text-slate-500">Waits on it:</span> {spec.waits}</p>
        {spec.open && <p className="text-xs text-slate-400"><span className="text-slate-500">Open:</span> {spec.open}</p>}
        <p className="text-xs text-slate-500">tasks.txt · {spec.task}</p>
        <pre className="overflow-x-auto rounded bg-slate-950/60 p-2 text-[11px] text-slate-400">{JSON.stringify({ type: spec.id, ...props }, null, 2)}</pre>
      </div>
      {spec.today && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">What exists today</p>
          {TODAY[spec.today]()}
        </div>
      )}
    </div>
  );
}

/** The sidebar's Missing tools section. */
export const STUB_GROUPS: UiGroup[] = STUBS.map((spec) => ({
  id: spec.id,
  title: spec.title,
  keywords: [...spec.keywords, "stub", "missing"],
  doc: { description: `${spec.what}\n\nPlanned props, a first guess to argue with.`, props: spec.props },
  stories: spec.stories,
  render: (props) => <StubCard spec={spec} props={props} />,
  stub: true,
}));
