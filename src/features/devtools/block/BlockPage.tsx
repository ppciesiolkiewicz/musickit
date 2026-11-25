"use client";

import Link from "next/link";
import { useMemo } from "react";
import { catalogue } from "@/features/plan/model/catalogue";
import ExamplePreview from "../prompt/ExamplePreview";
import type { StepBlock } from "../model/stepBlocks";

export interface StepInfo {
  ref: string;
  track: string;
  name: string;
  holds: string;
  level: string;
  /** step n of how many */
  index: number;
  of: number;
}

const PILL = "inline-block rounded-full border px-1.5 text-[10px] font-medium uppercase tracking-wider";
const SOURCE_TONE: Record<StepBlock["source"], string> = {
  "seed block": "border-lime-500/40 bg-lime-500/10 text-lime-200",
};

const HOW: Record<StepBlock["how"], { label: string; title: string }> = {
  named: { label: "step named", title: "The seed file lists this step" },
  read: { label: "step read from tools", title: "The exercise's tools are set to this step's level or stage" },
  level: { label: "level match only", title: "It tags this track at this step's level; nothing says which of the level's steps it is for" },
};

/**
 * The blocks for one path step, each rendered as the player sees it in a plan; several are variations of the step.
 * Opened from /admin/content/path in a new tab. `step` is null when the page was opened for one block by id.
 */
export default function BlockPage({ step, blocks, asked }: { step: StepInfo | null; blocks: StepBlock[]; /** what the address asked for */ asked: string }) {
  const entries = useMemo(() => catalogue(), []);
  return (
    <div className="flex flex-col gap-4">
      {step ? (
        <header>
          <p className="font-mono text-xs text-slate-500">{step.ref}</p>
          <h1 className="text-xl font-semibold text-slate-100">{step.track}, step {step.index + 1} of {step.of}: {step.name}</h1>
          <p className="text-sm text-slate-400">{step.holds && `${step.holds} · `}{step.level} · {blocks.length === 1 ? "1 block" : `${blocks.length} blocks`}</p>
        </header>
      ) : (
        <header><h1 className="font-mono text-lg text-slate-100">{asked}</h1></header>
      )}
      {blocks.length === 0 && (
        <p className="text-sm text-amber-300">
          {step ? "No block practises this step yet: it is a gap to seed." : "No block in the code has this id."}{" "}
          <Link href="/admin/content/path" className="text-sky-300 underline">Back to the path</Link>
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {blocks.map((b) => (
          <li key={b.id} className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-800/50 px-4 py-2.5">
              <span className="font-mono text-sm text-sky-200">{b.id}</span>
              <span className={`${PILL} ${SOURCE_TONE[b.source]}`}>{b.source}</span>
              <span className={`${PILL} ${b.how === "level" ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-slate-600 bg-slate-800/40 text-slate-400"}`} title={HOW[b.how].title}>
                {HOW[b.how].label}
              </span>
            </div>
            <div className="bg-slate-950/30 p-4"><ExamplePreview json={b.json} entries={entries} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
