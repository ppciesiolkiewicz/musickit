"use client";

import { useState, type KeyboardEvent } from "react";
import {
  allOptions, familyOf, isAll, moreProps, moreValues, parseMoreText, toggleAll, toggleOption, updateSubject, withMore,
  type Family, type FamilyControl, type FamilyValue, type FamilyValues, type Subject,
} from "@/features/stage";

/** "More" fields' text as props: the valid ones by name (blank is `undefined`, which takes the prop off) and the names that aren't valid. */
export function moreOf(f: Family, text: Record<string, string>): { more: Record<string, unknown>; invalid: string[] } {
  const more: Record<string, unknown> = {};
  const invalid: string[] = [];
  for (const p of moreProps(f)) {
    const parsed = parseMoreText(text[p.name] ?? "");
    if (parsed.ok) more[p.name] = parsed.value;
    else invalid.push(p.name);
  }
  return { more, invalid };
}

const chip = (on: boolean) =>
  `rounded-md px-2 py-0.5 text-xs ring-1 ${on ? "bg-sky-500/20 text-sky-100 ring-sky-400/70" : "text-slate-300 ring-slate-700 hover:ring-slate-500"}`;
const field = "rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-100 outline-none focus:border-sky-500";

/**
 * A family's props as a form: its main controls (toggles with "All", a pick of one, typed text) and a folded "More" with its
 * component's other props as JSON fields. Controlled: the palette's step two adds from it, `FamilyEditor` edits a widget with it.
 * Enter in a field is `onSubmit`; a toggle or pick changes at once (`onValues(next, true)`), typing does not (`false`) until
 * Enter or the field is left (`onSettle`).
 */
export default function FamilyStep({ family, values, moreText, dropped = [], keepOne = false, onValues, onMoreText, onSubmit, onSettle }: {
  family: Family;
  values: FamilyValues;
  moreText: Record<string, string>;
  /** "More" props the component threw away */
  dropped?: string[];
  /** a toggle can't untick its last option (a widget on the stage keeps one box) */
  keepOne?: boolean;
  onValues: (next: FamilyValues, immediate: boolean) => void;
  onMoreText: (next: Record<string, string>) => void;
  onSubmit: () => void;
  onSettle?: () => void;
}) {
  const props = moreProps(family);
  const { invalid } = moreOf(family, moreText);
  const set = (c: FamilyControl, v: FamilyValue, immediate: boolean) => onValues({ ...values, [c.name]: v }, immediate);
  const enter = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="flex flex-col gap-2.5 px-4 py-2">
      {family.controls.map((c) => {
        const id = `family-${family.id}-${c.name}`;
        if (c.kind === "multi") {
          const all = allOptions(c);
          const pick = (next: (string | number)[]) => (keepOne && next.length === 0 ? undefined : set(c, next as FamilyValue, true));
          return (
            <div key={c.name} role="group" aria-label={c.label} className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs text-slate-400">{c.label}</span>
              {all && (
                <button type="button" aria-pressed={isAll(c, values[c.name])} onClick={() => pick(toggleAll(c, values[c.name]))} className={chip(isAll(c, values[c.name]))}>
                  All
                </button>
              )}
              {c.options?.map((o) => {
                const on = Array.isArray(values[c.name]) && (values[c.name] as (string | number)[]).includes(o.value);
                return (
                  <button key={String(o.value)} type="button" aria-pressed={on} onClick={() => pick(toggleOption(c, values[c.name], o.value))} className={chip(on)}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          );
        }
        if (c.kind === "choice")
          return (
            <label key={c.name} htmlFor={id} className="flex items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs text-slate-400">{c.label}</span>
              <select
                id={id}
                value={String(values[c.name] ?? c.default)}
                onChange={(e) => {
                  const o = c.options?.find((x) => String(x.value) === e.target.value);
                  if (o) set(c, o.value, true);
                }}
                onKeyDown={enter}
                className={field}
              >
                {c.options?.map((o) => (
                  <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                ))}
              </select>
            </label>
          );
        return (
          <label key={c.name} htmlFor={id} className="flex items-center gap-1.5">
            <span className="w-24 shrink-0 text-xs text-slate-400">{c.label}</span>
            <input id={id} value={String(values[c.name] ?? "")} onChange={(e) => set(c, e.target.value, false)} onKeyDown={enter} onBlur={onSettle} className={`${field} flex-1`} />
          </label>
        );
      })}
      {props.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer select-none text-slate-400 hover:text-slate-200">More</summary>
          <div className="mt-2 flex flex-col gap-1.5">
            {props.map((p) => {
              const id = `family-${family.id}-more-${p.name}`;
              const bad = invalid.includes(p.name);
              const unused = !bad && dropped.includes(p.name);
              return (
                <label key={p.name} htmlFor={id} className="flex items-center gap-1.5" title={p.description}>
                  <span className="w-24 shrink-0 font-mono text-slate-400">{p.name}</span>
                  <input
                    id={id}
                    value={moreText[p.name] ?? ""}
                    placeholder={p.type}
                    aria-invalid={bad}
                    onChange={(e) => onMoreText({ ...moreText, [p.name]: e.target.value })}
                    onKeyDown={enter}
                    onBlur={onSettle}
                    className={`${field} flex-1 ${bad ? "border-rose-500" : ""}`}
                  />
                  {(bad || unused) && <span className="shrink-0 text-[11px] text-rose-300">{bad ? "not JSON" : "not used"}</span>}
                </label>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

/** A widget on the stage, edited in place: its family's step two, each change put on the stage at once (typing on Enter or leaving the field). */
export function FamilyEditor({ subject, onUpdate }: { subject: Subject; onUpdate: (subject: Subject) => void }) {
  const family = familyOf(subject);
  const [values, setValues] = useState<FamilyValues>(() => (family?.read(subject) ?? {}));
  const [moreText, setMoreText] = useState<Record<string, string>>(() => (family ? moreValues(subject, family) : {}));
  const [dropped, setDropped] = useState<string[]>([]);
  if (!family) return null;

  const apply = (v: FamilyValues, text: Record<string, string>) => {
    const { more, invalid } = moreOf(family, text);
    // a field that isn't valid JSON keeps what the widget has
    for (const name of invalid) delete more[name];
    const next = withMore(updateSubject(subject, v), more);
    setDropped(next.dropped);
    if (JSON.stringify(next.subject) !== JSON.stringify(subject)) onUpdate(next.subject);
  };

  return (
    <FamilyStep
      family={family}
      values={values}
      moreText={moreText}
      dropped={dropped}
      keepOne
      onValues={(next, immediate) => {
        setValues(next);
        if (immediate) apply(next, moreText);
      }}
      onMoreText={setMoreText}
      onSubmit={() => apply(values, moreText)}
      onSettle={() => apply(values, moreText)}
    />
  );
}
