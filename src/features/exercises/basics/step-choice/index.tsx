"use client";

import { useState } from "react";
import { keyName } from "@/features/theory/keySlug";

/** What one chip sets, parsed: a key as a pitch class, a tempo, a position 1-5. */
export interface Option { key?: number; bpm?: number; position?: number }
type Part = "key" | "bpm" | "position";
const PARTS: Part[] = ["key", "bpm", "position"];
const ROW: Record<Part, string> = { key: "Key", bpm: "Tempo", position: "Position" };
const NAMED = { stage: "Stage", variant: "Variant" };

/** A part's value alone, as a plain chip shows it under its row name: "A", "80", "2". */
const value = (o: Option, p: Part): string => (p === "key" ? keyName(o.key ?? 0) : String(o[p]));
/** A part's value with its unit, for a named chip's second line. */
const phrase = (o: Option, p: Part): string => (p === "key" ? keyName(o.key ?? 0) : p === "bpm" ? `${o.bpm} bpm` : `Position ${o.position}`);

/** Everything an option sets, in the order key, tempo, position: "A · 80 bpm · Position 2". */
export function optionText(o: Option): string {
  return PARTS.filter((p) => typeof o[p] === "number").map((p) => phrase(o, p)).join(" · ");
}

/**
 * The versions a step can be practised in, as chips. Named ("stage" or "variant"), a chip reads "Stage 2" over what it
 * sets; without a name, for options of one part, the row carries the part's name and each chip its value. In an exercise
 * the step owns the picked option (`value`, `onChange`, an index into `options`) and sets every tool in it
 * (`applyOption`); alone (a story) it keeps its own.
 */
export function View({ options, label, value: picked, onChange }: { options: Option[]; label?: "stage" | "variant"; value?: number; onChange?: (index: number) => void }) {
  const [own, setOwn] = useState(0);
  const at = picked ?? own;
  const pick = (i: number) => {
    setOwn(i);
    onChange?.(i);
  };
  const parts = PARTS.filter((p) => typeof options[0]?.[p] === "number");
  // one part and no name: the row is the part ("Key  G  A"); else numbered chips that say what they set
  const plain = !label && parts.length === 1 ? parts[0] : null;
  const name = NAMED[label ?? "variant"];
  return (
    <div role="radiogroup" aria-label={plain ? ROW[plain] : name} data-tour="step-choice-options" className="flex flex-wrap items-center gap-1.5">
      {plain && <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-400">{ROW[plain]}</span>}
      {options.map((o, i) => {
        const on = i === at;
        const tone = on ? "border-sky-400/70 bg-sky-500/20 text-sky-50" : "border-slate-600 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:text-slate-100";
        if (plain)
          return (
            <button key={i} type="button" role="radio" aria-checked={on} onClick={() => pick(i)} className={`h-8 min-w-10 rounded-full border px-3 text-sm font-semibold tabular-nums transition active:scale-[0.97] ${tone}`}>
              {value(o, plain)}
            </button>
          );
        return (
          <button key={i} type="button" role="radio" aria-checked={on} onClick={() => pick(i)} className={`flex min-w-24 flex-col items-start rounded-xl border px-3 py-1.5 text-left transition active:scale-[0.97] ${tone}`}>
            <span className="text-sm font-semibold">{name} {i + 1}</span>
            <span className={`text-xs tabular-nums ${on ? "text-sky-100/80" : "text-slate-400"}`}>{optionText(o)}</span>
          </button>
        );
      })}
    </div>
  );
}
