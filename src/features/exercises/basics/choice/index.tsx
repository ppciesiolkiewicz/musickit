"use client";

import { useState } from "react";
import { keyName } from "@/features/theory/keySlug";
import { findPentatonic } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";
import { TOOL_LEVELS, type ToolLevel } from "../levels";

/**
 * The chips of a choice of options: the student taps one and every tool under the choice (a section's, or the block's)
 * is set to it (`applyChoice` in the plan model). Not a tool: it sits in a section's header, draws nothing else and makes
 * no sound. An open choice draws nothing here (the note's key bar is the editor's).
 */

/** What one chip sets, parsed: a key as a pitch class, a scale slug, a tempo, a position 1-7, a level as an index into `TOOL_LEVELS`. */
export interface Option { key?: number; scale?: string; bpm?: number; position?: number; level?: number }
type Part = "key" | "scale" | "bpm" | "position" | "level";
const PARTS: Part[] = ["key", "scale", "bpm", "position", "level"];
const ROW: Record<Part, string> = { key: "Key", scale: "Scale", bpm: "Tempo", position: "Position", level: "Level" };
/** A level as a chip names it. */
const LEVEL_NAME: Record<ToolLevel, string> = { new: "Brand new", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const levelName = (o: Option): string => LEVEL_NAME[TOOL_LEVELS[o.level ?? 0] ?? "new"];
const scaleName = (slug: string): string => findModePage(slug)?.name ?? findPentatonic(slug)?.name ?? slug;
const NAMED = { stage: "Stage", variant: "Variant" };

/** A part's value alone, as a plain chip shows it under its row name: "A", "80", "2". */
const value = (o: Option, p: Part): string => (p === "key" ? keyName(o.key ?? 0) : p === "level" ? levelName(o) : p === "scale" ? scaleName(o.scale ?? "") : String(o[p]));
/** A part's value with its unit, for a named chip's second line. */
const phrase = (o: Option, p: Part): string => (p === "key" ? keyName(o.key ?? 0) : p === "scale" ? scaleName(o.scale ?? "") : p === "bpm" ? `${o.bpm} bpm` : p === "level" ? levelName(o) : `Position ${o.position}`);

/** Everything an option sets, in the order key, scale, tempo, position, level: "A · 80 bpm · Position 2". */
export function optionText(o: Option): string {
  return PARTS.filter((p) => o[p] !== undefined).map((p) => phrase(o, p)).join(" · ");
}

/**
 * The versions a section can be practised in, as chips. Named ("stage" or "variant"), a chip reads "Stage 2" over what it
 * sets; without a name, for options of one part, the row carries the part's name and each chip its value. In an exercise
 * the reader owns the picked option (`value`, `onChange`, an index into `options`); alone (a story) it keeps its own.
 */
export function View({ options, label, value: picked, onChange }: { options: Option[]; label?: "stage" | "variant"; value?: number; onChange?: (index: number) => void }) {
  const [own, setOwn] = useState(0);
  const at = picked ?? own;
  const pick = (i: number) => {
    setOwn(i);
    onChange?.(i);
  };
  const parts = PARTS.filter((p) => options[0]?.[p] !== undefined);
  // one part and no name: the row is the part ("Key  G  A"); else numbered chips that say what they set
  const plain = !label && parts.length === 1 ? parts[0] : null;
  const name = NAMED[label ?? "variant"];
  return (
    <div role="radiogroup" aria-label={plain ? ROW[plain] : name} data-tour="choice-options" className="flex flex-wrap items-center gap-1.5">
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
