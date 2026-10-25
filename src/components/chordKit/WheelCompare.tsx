"use client";

import { useState } from "react";
import ScaleWheel from "@/components/theory/ScaleWheel";
import { FAMILIES, modeSteps } from "@/features/theory/theory";
import { MODE_PAGES, degreeLabels } from "@/features/theory/scales";
import { Chip, Select } from "@/components/ui";

const MAJOR_SLUG = "major-ionian";
const MINOR_SLUG = "natural-minor-aeolian";
const PILLS = [
  { slug: MAJOR_SLUG, label: "Major" },
  { slug: MINOR_SLUG, label: "Natural minor" },
];
const stepsOf = (slug: string) => {
  const p = MODE_PAGES.find((m) => m.slug === slug)!;
  return modeSteps(FAMILIES[p.familyIndex], p.modeIndex);
};

/**
 * The scale's wheel with another scale dashed behind it, and the scales to compare it with as pills: major, natural minor, and a
 * pill dropdown of every other mode. Hovering a pill previews it; clicking one (or picking from the dropdown) keeps it, which is
 * also how a touch screen compares.
 */
export default function WheelCompare({ slug, steps, labels, active, onNote }: {
  /** this scale, left out of the choices */
  slug: string;
  steps: number[];
  labels: string[];
  active: number | null;
  onNote: (degree: number) => void;
}) {
  const pills = PILLS.filter((p) => p.slug !== slug);
  const groups = FAMILIES.map((f, fi) => ({
    label: f.label,
    options: MODE_PAGES.filter((m) => m.familyIndex === fi && m.slug !== slug && !PILLS.some((p) => p.slug === m.slug)).map((m) => ({ value: m.slug, label: m.name })),
  })).filter((g) => g.options.length > 0);

  const [pinned, setPinned] = useState(pills[0].slug);
  const [other, setOther] = useState(groups[0].options[0].value);
  const [hover, setHover] = useState<string | null>(null);
  const shown = hover ?? pinned;
  const cmp = stepsOf(shown);
  const name = PILLS.find((p) => p.slug === shown)?.label ?? MODE_PAGES.find((m) => m.slug === shown)!.name;

  // "♭3 for 3": each degree this scale changes, against the one it is compared with
  const mine = degreeLabels(steps);
  const theirs = degreeLabels(cmp);
  const diffs = steps.flatMap((s, d) => (s === cmp[d] ? [] : [`${mine[d]} for ${theirs[d]}`]));

  return (
    <figure className="flex flex-col items-center gap-2 self-center justify-self-center">
      <ScaleWheel steps={steps} labels={labels} compare={cmp} active={active} onNote={onNote} size={220} />
      <figcaption className="flex max-w-68 flex-col items-center gap-1.5 text-center text-[11px] text-slate-500">
        <span>
          Dashed: <b className="font-medium text-slate-300">{name}</b>.{" "}
          {diffs.length > 0 ? <>Ringed: the notes that differ, {diffs.join(", ")}.</> : "Same notes."}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Hover to compare</span>
        <span className="flex flex-wrap items-center justify-center gap-1.5" onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}>
          {pills.map((p) => (
            <Chip key={p.slug} on={pinned === p.slug} onClick={() => setPinned(p.slug)} onHover={(h) => setHover(h ? p.slug : null)}>
              {p.label}
            </Chip>
          ))}
          <span
            onPointerEnter={(e) => e.pointerType === "mouse" && setHover(other)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
            onClick={() => setPinned(other)}
          >
            <Select
              value={other}
              onChange={(v) => {
                setOther(v);
                setPinned(v);
                setHover(null);
              }}
              groups={groups}
              aria-label="Compare with another mode"
              size="sm"
              pill
              highlighted={pinned === other}
            />
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
