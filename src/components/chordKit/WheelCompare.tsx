"use client";

import { useState, type ReactNode } from "react";
import ScaleWheel from "@/components/theory/ScaleWheel";
import { FAMILIES, modeSteps } from "@/features/theory/theory";
import { MODE_PAGES, degreeLabels, type ModePage } from "@/features/theory/scales";
import { PENTATONICS, pentatonicContext, pentatonicSteps, type PentatonicScale } from "@/features/theory/pentatonics";
import { Chip, Select } from "@/components/ui";

/** A scale to compare with: its shape from the root, a degree label per note ("♭3") and its step pattern. */
export interface CompareChoice {
  id: string;
  label: string;
  steps: number[];
  degrees: string[];
  pattern: string[];
}

export function modeChoice(page: ModePage, label = page.name): CompareChoice {
  const steps = modeSteps(FAMILIES[page.familyIndex], page.modeIndex);
  return { id: page.slug, label, steps, degrees: degreeLabels(steps), pattern: pentatonicSteps(steps) };
}

export function pentatonicChoice(scale: PentatonicScale): CompareChoice {
  const p = pentatonicContext(0, scale);
  return { id: scale.slug, label: scale.name, steps: p.steps, degrees: p.formula, pattern: pentatonicSteps(p.steps) };
}

const pageOf = (slug: string) => MODE_PAGES.find((m) => m.slug === slug)!;
export const MAJOR_CHOICE = modeChoice(pageOf("major-ionian"), "Major");
export const MINOR_CHOICE = modeChoice(pageOf("natural-minor-aeolian"), "Natural minor");

/** Every mode, grouped by family, leaving out the ids given. */
export const modeGroups = (skip: string[]) =>
  FAMILIES.map((f, fi) => ({ label: f.label, choices: MODE_PAGES.filter((m) => m.familyIndex === fi && !skip.includes(m.slug)).map((m) => modeChoice(m)) }));

/** Every pentatonic, leaving out the ids given. */
export const pentatonicGroup = (skip: string[]) => ({ label: "Pentatonics", choices: PENTATONICS.filter((s) => !skip.includes(s.slug)).map(pentatonicChoice) });

/**
 * How note i of a scale stands against a compared one: `out` when the other scale lacks it (ringed, like on the wheel), and between two
 * seven-note scales the other's label for the same degree ("6" against a ♭6).
 */
export function compareMark(steps: number[], i: number, other: CompareChoice | null): { out: boolean; theirs?: string } {
  if (!other) return { out: false };
  const out = !other.steps.includes(steps[i]);
  return { out, theirs: out && steps.length === 7 && other.steps.length === 7 ? other.degrees[i] : undefined };
}

/** Ringed like the wheel: a note the compared scale does not have. */
export const OUT_RING = "outline-2 outline-dashed outline-offset-2 outline-slate-300";

/**
 * A small note floating just above its children while a comparison is hovered, over whatever sits above, so nothing moves.
 * `text` null hides it.
 */
export function Peek({ text, children, className = "" }: { text: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={`relative ${className}`}>
      {children}
      {text && (
        <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-0.5 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900/95 px-1.5 py-0.5 text-[10px] text-slate-300 shadow-lg shadow-black/30">
          {text}
        </span>
      )}
    </span>
  );
}

/**
 * "♭3 for 3" for two seven-note scales, degree by degree; otherwise what each has that the other lacks:
 * "only here: ♭3, ♭7 · only in Major: 2, 4, 7".
 */
function describe(steps: number[], degrees: string[], other: CompareChoice): string {
  if (steps.length === 7 && other.steps.length === 7) {
    const diffs = steps.flatMap((s, d) => (s === other.steps[d] ? [] : [`${degrees[d]} for ${other.degrees[d]}`]));
    return diffs.length ? `Ringed: the notes that differ, ${diffs.join(", ")}.` : "Same notes.";
  }
  const mine = steps.flatMap((s, i) => (other.steps.includes(s) ? [] : [degrees[i]]));
  const theirs = other.steps.flatMap((s, i) => (steps.includes(s) ? [] : [other.degrees[i]]));
  if (!mine.length && !theirs.length) return "Same notes.";
  return [mine.length && `Ringed, only here: ${mine.join(", ")}.`, theirs.length && `Only in ${other.label}: ${theirs.join(", ")}.`].filter(Boolean).join(" ");
}

/**
 * The scale's wheel with another scale dashed behind it (the first pill, at rest), and the scales to compare it with: a few as
 * pills and the rest in a pill dropdown. Hovering one swaps the dashed shape and shows what differs in a card floating over the
 * page, so nothing below moves. A tap does the same on a touch screen; nothing is kept.
 */
export default function WheelCompare({ steps, degrees, wheelDegrees, labels, active, onNote, pills, groups, onCompare }: {
  steps: number[];
  /** degree label per note ("♭3"), for the card */
  degrees: string[];
  /** seven-note degree per note, for colour (see ScaleWheel) */
  wheelDegrees?: number[];
  /** what the dots show, in the chosen label system */
  labels: string[];
  active: number | null;
  onNote: (i: number) => void;
  /** always shown; the first is the dashed shape at rest */
  pills: CompareChoice[];
  groups: { label: string; choices: CompareChoice[] }[];
  /** hears the hovered comparison (null when none), so the page can mark its other parts */
  onCompare?: (choice: CompareChoice | null) => void;
}) {
  const menu = groups.filter((g) => g.choices.length > 0);
  const all = [...pills, ...menu.flatMap((g) => g.choices)];
  const [other, setOther] = useState(menu[0].choices[0].id);
  const [hover, setHoverId] = useState<string | null>(null);
  const setHover = (id: string | null) => {
    setHoverId(id);
    onCompare?.(all.find((c) => c.id === id) ?? null);
  };
  const hovered = all.find((c) => c.id === hover);
  const shown = hovered ?? pills[0];

  return (
    <figure className="relative flex flex-col items-center gap-2 self-center justify-self-center">
      <ScaleWheel steps={steps} degrees={wheelDegrees} labels={labels} compare={shown.steps} active={active} onNote={onNote} size={220} />
      <figcaption className="flex max-w-68 flex-col items-center gap-1.5 text-center text-[11px] text-slate-500">
        <span className="max-w-full truncate">Dashed: <b className="font-medium text-slate-300">{shown.label}</b> · ringed: not in it</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Hover to compare</span>
        <span className="flex flex-wrap items-center justify-center gap-1.5" onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}>
          {pills.map((c) => (
            <Chip key={c.id} on={hover === c.id} onClick={() => setHover(hover === c.id ? null : c.id)} onHover={(h) => setHover(h ? c.id : null)}>
              {c.label}
            </Chip>
          ))}
          <span onPointerEnter={(e) => e.pointerType === "mouse" && setHover(other)} onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}>
            <Select
              value={other}
              onChange={(v) => {
                setOther(v);
                setHover(v);
              }}
              groups={menu.map((g) => ({ label: g.label, options: g.choices.map((c) => ({ value: c.id, label: c.label })) }))}
              aria-label="Compare with another scale"
              size="sm"
              pill
              highlighted={hover === other}
            />
          </span>
        </span>
      </figcaption>
      {/* what differs, floating over whatever is below so the page never jumps */}
      {hovered && (
        <div role="status" className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-68 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-left text-xs text-slate-300 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Compared with</div>
          <div className="mb-1.5 text-sm font-medium text-slate-100">{hovered.label}</div>
          {describe(steps, degrees, hovered)}
        </div>
      )}
    </figure>
  );
}
