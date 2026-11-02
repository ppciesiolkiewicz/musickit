"use client";

import { useState } from "react";
import type { PropDoc } from "@/features/exercises/docs";
import { keySlug } from "@/features/theory/keySlug";
import { PENTATONICS } from "@/features/theory/pentatonics";
import { MODE_PAGES } from "@/features/theory/scales";
import { VOICES } from "@/features/theory/singing";
import { COMP_PATTERNS } from "@/lib/practice/comping";
import type { Props } from "./stories";

/*
 * Storybook-style controls, read off the component's documented prop types (docs.generated.json): a select for a
 * union of strings, chips for degrees and small number sets, a number or text box, and a JSON box for the rest.
 * Each control edits the props as the AI writes them; × unsets the prop.
 */

const DEGREES = ["1", "b2", "2", "b3", "3", "4", "#4", "b5", "5", "#5", "b6", "6", "b7", "7"];
const KEYS = Array.from({ length: 12 }, (_, pc) => keySlug(pc));
const SCALES = [...PENTATONICS.map((p) => p.slug), ...MODE_PAGES.map((m) => m.slug)];
const VOICE_NAMES = Object.keys(VOICES);
/** number lists with a known range, by prop name */
const NUMBER_CHIPS: Record<string, number[]> = {
  boxes: [1, 2, 3, 4, 5],
  positions: [1, 2, 3, 4, 5],
  strings: [1, 2, 3, 4, 5, 6],
  set: Array.from({ length: 12 }, (_, i) => i + 1),
};

/** Type aliases the docs name instead of spelling out, as the unions they are. */
const ALIASES: Record<string, string[]> = {
  Voicing: ["open", "barre"],
  DegreesFrom: ["chord", "key"],
  CompPattern: COMP_PATTERNS.map((c) => c.id),
  Degree: DEGREES,
};

/** The strings a union of string literals (or a known alias) allows; null when it is something else. */
const literals = (type: string): string[] | null => {
  const parts = type.split("|").map((s) => s.trim());
  if (!parts.every((p) => /^"[^"]*"$/.test(p) || p in ALIASES)) return null;
  return [...new Set(parts.flatMap((p) => (p in ALIASES ? ALIASES[p] : [p.slice(1, -1)])))];
};
/** A union of number literals: `2 | 3 | 4`. */
const numberLiterals = (type: string): number[] | null => {
  const parts = type.split("|").map((s) => s.trim());
  return parts.length > 1 && parts.every((p) => /^\d+$/.test(p)) ? parts.map(Number) : null;
};

type Control =
  | { kind: "select"; options: string[] }
  | { kind: "numberSelect"; options: number[] }
  | { kind: "fixed" }
  | { kind: "bool" }
  | { kind: "number" }
  | { kind: "text" }
  | { kind: "list" }
  | { kind: "chips"; options: string[] }
  | { kind: "numberChips"; options: number[] }
  | { kind: "json" };

/** The control a documented prop gets. */
export function controlOf(p: PropDoc): Control {
  const t = p.type.trim();
  const lit = literals(t);
  if (lit) return lit.length === 1 ? { kind: "fixed" } : { kind: "select", options: lit };
  const nums = numberLiterals(t);
  if (nums) return { kind: "numberSelect", options: nums };
  if (t === "boolean") return { kind: "bool" };
  if (t === "number") return { kind: "number" };
  if (t === "string") {
    if (p.name === "key") return { kind: "select", options: KEYS };
    if (p.name === "scale") return { kind: "select", options: SCALES };
    if (p.name === "voice") return { kind: "select", options: VOICE_NAMES };
    return { kind: "text" };
  }
  if (t === "string[]") return { kind: "list" };
  if (t === "(Degree | string)[]") return { kind: "chips", options: DEGREES };
  const arr = /^\(?(.*?)\)?\[\]$/.exec(t);
  const inner = arr && literals(arr[1]);
  if (inner) return { kind: "chips", options: inner };
  if (t === "number[]" && NUMBER_CHIPS[p.name]?.length) return { kind: "numberChips", options: NUMBER_CHIPS[p.name] };
  return { kind: "json" };
}

const box = "rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-xs text-slate-200";
const chip = (on: boolean) => `rounded px-1.5 py-0.5 font-mono text-[11px] ${on ? "bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/60" : "bg-slate-800/70 text-slate-400 hover:text-slate-200"}`;

/** One row per documented prop; props set but not documented get a JSON row too. */
export default function Controls({ docs, value, onChange }: { docs: PropDoc[]; value: Props; onChange: (next: Props) => void }) {
  const set = (name: string, v: unknown) => {
    const next = { ...value };
    if (v === undefined) delete next[name];
    else next[name] = v;
    onChange(next);
  };
  const extra = Object.keys(value).filter((k) => !docs.some((d) => d.name === k));
  return (
    <table className="w-full text-left text-xs">
      <thead className="text-[10px] uppercase tracking-wide text-slate-500">
        <tr><th className="py-1 pr-3 font-semibold">Prop</th><th className="py-1 pr-3 font-semibold">Control</th><th className="py-1 font-semibold">Description</th></tr>
      </thead>
      <tbody>
        {docs.map((d) => (
          <Row key={d.name} doc={d} value={value[d.name]} set={(v) => set(d.name, v)} />
        ))}
        {extra.map((k) => (
          <Row key={k} doc={{ name: k, type: "unknown", required: false, description: "not in the component's docs" }} value={value[k]} set={(v) => set(k, v)} />
        ))}
      </tbody>
    </table>
  );
}

function Row({ doc, value, set }: { doc: PropDoc; value: unknown; set: (v: unknown) => void }) {
  const c = controlOf(doc);
  return (
    <tr className="border-t border-slate-800 align-top">
      <td className="py-1.5 pr-3">
        <span className={`font-mono ${value === undefined ? "text-slate-400" : "text-slate-100"}`}>{doc.name}</span>
        {doc.required && <span className="text-rose-300" title="required">*</span>}
        <span className="block font-mono text-[10px] text-slate-600">{doc.type}</span>
      </td>
      <td className="py-1.5 pr-3">
        <div className="flex items-start gap-1">
          <Input c={c} value={value} set={set} />
          {value !== undefined && c.kind !== "fixed" && (
            <button type="button" onClick={() => set(undefined)} title="Unset" className="px-1 text-slate-500 hover:text-rose-300">×</button>
          )}
        </div>
      </td>
      <td className="max-w-md py-1.5 text-slate-500">{doc.description}</td>
    </tr>
  );
}

function Input({ c, value, set }: { c: Control; value: unknown; set: (v: unknown) => void }) {
  switch (c.kind) {
    case "fixed":
      return <span className="font-mono text-slate-400">{JSON.stringify(value)}</span>;
    case "select":
      return (
        <select value={typeof value === "string" ? value : ""} onChange={(e) => set(e.target.value || undefined)} className={box}>
          <option value="">—</option>
          {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "numberSelect":
      return (
        <select value={typeof value === "number" ? value : ""} onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))} className={box}>
          <option value="">—</option>
          {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "bool":
      return (
        <select value={value === undefined ? "" : String(value)} onChange={(e) => set(e.target.value === "" ? undefined : e.target.value === "true")} className={box}>
          <option value="">—</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    case "number":
      return <input type="number" value={typeof value === "number" ? value : ""} onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))} className={`${box} w-20`} />;
    case "text":
      return <input value={typeof value === "string" ? value : ""} onChange={(e) => set(e.target.value || undefined)} className={`${box} w-44`} />;
    case "list":
      return <ListInput value={value} set={set} />;
    case "chips":
    case "numberChips": {
      const cur = Array.isArray(value) ? (value as unknown[]) : [];
      const toggle = (o: string | number) => {
        const next = cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o];
        set(next.length ? next : undefined);
      };
      // values the chips don't offer (note names in a degree list) stay, shown after them
      const other = cur.filter((x) => !(c.options as unknown[]).includes(x));
      return (
        <div className="flex max-w-xs flex-wrap gap-1">
          {(c.options as (string | number)[]).map((o) => (
            <button key={o} type="button" onClick={() => toggle(o)} className={chip(cur.includes(o))}>{o}</button>
          ))}
          {other.map((o) => <span key={String(o)} className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] text-amber-200">{String(o)}</span>)}
        </div>
      );
    }
    case "json":
      return <JsonInput value={value} set={set} />;
  }
}

/** Comma-separated strings; the text is kept while typing so a trailing comma survives. */
function ListInput({ value, set }: { value: unknown; set: (v: unknown) => void }) {
  const shown = Array.isArray(value) ? value.join(", ") : "";
  const [text, setText] = useState(shown);
  const [was, setWas] = useState(shown);
  if (shown !== was) { setWas(shown); setText(shown); }
  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const items = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
        const next = items.length ? items : undefined;
        setWas(next ? next.join(", ") : "");
        set(next);
      }}
      placeholder="a, b, c"
      className={`${box} w-56`}
    />
  );
}

/** Any value as JSON, applied once it parses. */
function JsonInput({ value, set }: { value: unknown; set: (v: unknown) => void }) {
  const shown = value === undefined ? "" : JSON.stringify(value);
  const [text, setText] = useState(shown);
  const [was, setWas] = useState(shown);
  if (shown !== was) { setWas(shown); setText(shown); }
  let ok = true;
  try { if (text.trim()) JSON.parse(text); } catch { ok = false; }
  return (
    <textarea
      value={text}
      rows={Math.min(4, Math.max(1, Math.ceil(text.length / 40)))}
      spellCheck={false}
      onChange={(e) => {
        setText(e.target.value);
        if (!e.target.value.trim()) { setWas(""); return set(undefined); }
        try {
          const v = JSON.parse(e.target.value);
          setWas(JSON.stringify(v));
          set(v);
        } catch { /* kept as typed until it parses */ }
      }}
      className={`${box} w-64 font-mono ${ok ? "" : "border-rose-500/70"}`}
    />
  );
}
