"use client";

import { useState } from "react";
import { DIFF_CLASS } from "./palette";
import ChordDiagram from "./ChordDiagram";
import { Info, Stepper, Tag } from "./ui";
import { type RichShape, VARIANT, shapeFormula, shapeName, rootFretFor, STRING_SHORT, STYLE_TAGS, tagText } from "@/lib/chordKit/shapeTools";
import { MODE_LIST } from "@/lib/chordKit/theory";
import { strumShape } from "@/lib/chordKit/playback";

export interface Placement {
  /** chord name in the key, e.g. "Gmaj7" */
  name: string;
  roman?: string;
  mode?: string;
  rootPc: number;
  /** degrees of each chord tone in the key, "1 · 3 · 5 · 7" */
  degrees?: string;
}

interface Props {
  shape: RichShape;
  placements?: Placement[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/** One card per shape. Slide the shape with the stepper, tap the diagram to hear it, tap a chord to place it. */
export default function ShapeCard({ shape, placements, selectedTags, onToggleTag }: Props) {
  const minOff = Math.min(...shape.f.filter((v): v is number => v !== null));
  const maxOff = Math.max(...shape.f.filter((v): v is number => v !== null));
  const lowest = 1 - minOff >= 1 ? 1 - minOff : 1;
  const highest = 17 - maxOff;

  const placed = (placements ?? []).map((p) => ({ ...p, fret: rootFretFor(shape, p.rootPc) })).sort((a, b) => a.fret - b.fret);
  const [fret, setFret] = useState(placed[0]?.fret ?? lowest);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    strumShape(shape, fret);
    setPlaying(true);
    setTimeout(() => setPlaying(false), 600);
  };
  const tagBtn = (t: string, tone: "form" | "style" | "mode" | "degree") => (
    <Tag key={t} tone={tone} on={selectedTags.includes(t)} onClick={() => onToggleTag(t)}>
      {tagText(t)}
    </Tag>
  );
  const fitsOpen = shape.fit.length;

  return (
    <article className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h4 className="text-sm font-medium text-slate-100">{shapeName(shape.suf)}</h4>
        {shape.v && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">{shape.v}</span>}
        {placements && <span className="ml-auto text-[11px] text-slate-500">{placed.length} chord{placed.length === 1 ? "" : "s"}</span>}
      </header>

      <ChordDiagram shape={shape} rootFret={fret} onPlay={play} active={playing} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stepper
          label="Root fret"
          value={`fret ${fret}`}
          onDec={() => setFret((f) => Math.max(lowest, f - 1))}
          onInc={() => setFret((f) => Math.min(highest, f + 1))}
          decDisabled={fret <= lowest}
          incDisabled={fret >= highest}
        />
        <span className="text-[11px] text-slate-500">{STRING_SHORT[shape.rs]} string root<Info label="About the root fret">The fret where the root note sits. The shape is movable: slide it up or down the neck and it becomes the same chord on another root. The stepper moves it one fret at a time. The root is on the {STRING_SHORT[shape.rs]} string.</Info></span>
      </div>

      <p className="text-xs text-slate-400">
        intervals: <span className="text-slate-300">{shapeFormula(shape)}</span>
        <Info label="About these intervals">
          R is the root. The other labels say how far each note sits above it: 3 is a major third, ♭3 a minor third, 5 the fifth, ♭7 the dominant seventh, 7 the major seventh. 9, 11 and 13 are the 2nd, 4th and 6th an octave up.
        </Info>
      </p>

      {placements && (
        <ul className="flex flex-col gap-1">
          {placed.map((p) => (
            <li key={p.name + p.fret}>
              <button
                type="button"
                onClick={() => setFret(p.fret)}
                className={`flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-2 py-1 text-left text-xs transition hover:bg-slate-800/70 ${p.fret === fret ? "bg-slate-800/80 ring-1 ring-sky-500/60" : ""}`}
              >
                <b className="text-slate-100">{p.name}</b>
                {p.roman && <span className="text-sky-300">{p.roman}</span>}
                {p.mode && <span className="text-teal-300">{p.mode}</span>}
                <span className="ml-auto tabular-nums text-slate-500">fret {p.fret}</span>
                {p.degrees && <span className="basis-full text-[11px] text-slate-500">degrees {p.degrees}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-1">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${DIFF_CLASS[shape.diff]}`}>
          <button type="button" onClick={() => onToggleTag("x:" + shape.diff)} aria-pressed={selectedTags.includes("x:" + shape.diff)}>
            {shape.diff}
          </button>
        </span>
        {shape.tags.map((t) => tagBtn(t, STYLE_TAGS.includes(t) ? "style" : "form"))}
      </div>

      {VARIANT[shape.suf] && (
        <p className="text-xs text-slate-400">
          <b className="text-slate-300">Variant:</b> {VARIANT[shape.suf]}
        </p>
      )}

      <div className="text-xs text-slate-400">
        <b className="text-slate-300">Fits {fitsOpen} mode{fitsOpen === 1 ? "" : "s"}</b>
        <Info label="How does a chord fit a mode?">
          A mode fits when every note of the chord belongs to it, counting the mode from the chord&rsquo;s own root. Each mode is also a rotation of a parent scale, so the same notes sit on another degree there. For example, a minor 7 chord fits Dorian from its root, and it is also the 2nd chord of the major scale a whole step below.
        </Info>
        <div className="mt-1.5 flex flex-wrap gap-1">{shape.fit.map((m) => tagBtn("m:" + m, "mode"))}</div>
        {placements && <FitLines shape={shape} placed={placed} />}
      </div>

      {shape.note && <p className="text-xs italic text-slate-500">{shape.note}</p>}
    </article>
  );
}

/** For each fitting mode: which degree of which parent scale this chord is. */
function FitLines({ shape, placed }: { shape: RichShape; placed: { name: string; rootPc: number }[] }) {
  const [open, setOpen] = useState(false);
  const TONIC_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  const first = placed[0];
  if (!first) return null;
  return (
    <div className="mt-1.5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="text-[11px] text-sky-300 hover:underline">
        {open ? "Hide" : "Show"} which degree it is in each parent scale
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 text-[11px] text-slate-400">
          {shape.fit.map((nm) => {
            const m = MODE_LIST.find((x) => x.name === nm)!;
            const parentPc = (first.rootPc - m.family.parent[m.k] + 12) % 12;
            return (
              <li key={nm}>
                <b className="text-slate-300">{nm}</b> · {first.name}: {ORD[m.k]} of {TONIC_NAMES[parentPc]} {m.family.parentName.replace(" scale", "")}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
