"use client";

import { useMemo, useState } from "react";
import ChordDiagram from "./ChordDiagram";
import NoteNeck, { type NeckDot } from "@/components/theory/NoteNeck";
import { CAGED_LETTERS, cagedBoxes, type CagedLetter } from "@/lib/chordKit/caged";
import { neighbours, regionOf, type Neighbour } from "@/lib/chordKit/neighbours";
import { STRING_GROUPS, INVERSIONS, triadVoicings } from "@/lib/chordKit/triads";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { strumShape, strum } from "@/lib/chordKit/playback";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { Chip, ChipRow, Info } from "@/components/ui";

const KEYS = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const COLOUR: Record<string, string> = { I: "#f8fafc", IV: "#38bdf8", V: "#f59e0b", ii: "#a78bfa", vi: "#34d399", iii: "#f472b6" };

/** The region (CAGED shape of I) that overlaps a given fret window most, for a new key. */
function closestLetter(rootPc: number, from: number, to: number): CagedLetter {
  let best: CagedLetter = "C", score = -Infinity;
  for (const L of CAGED_LETTERS) {
    const r = regionOf(rootPc, L);
    if (!r) continue;
    const s = Math.min(r.to, to) - Math.max(r.from, from) - Math.abs((r.from + r.to) / 2 - (from + to) / 2) * 0.01;
    if (s > score) [best, score] = [L, s];
  }
  return best;
}

/** One chord of the key in the shape that sits under the hand. */
function Bubble({ n, selected, onSelect, onMakeI }: { n: Neighbour; selected: boolean; onSelect: () => void; onMakeI?: () => void }) {
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${selected ? "border-sky-500/70 bg-sky-500/10" : "border-slate-800 bg-slate-950/50"}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold" style={{ color: COLOUR[n.roman] }}>{n.roman}</span>
        <span className="text-base text-slate-100">{n.name}</span>
      </div>
      {n.box ? (
        <>
          <span className="text-xs text-slate-400">{n.letter} shape</span>
          <div className="w-full max-w-[10rem]">
            <ChordDiagram shape={n.box.shape} rootFret={n.box.rootFret} onPlay={() => { onSelect(); strumShape(n.box!.shape, n.box!.rootFret); }} active={selected} />
          </div>
        </>
      ) : <span className="py-6 text-xs text-slate-500">off the neck here</span>}
      {onMakeI && n.box && <button type="button" onClick={onMakeI} className="text-xs text-sky-300 hover:underline">make this I →</button>}
    </div>
  );
}

/** I IV V and the relative minors ii vi iii, each in the CAGED shape that sits in the same few frets as the I chord. */
export default function NeighboursView() {
  const [rootPc, setRootPc] = useState(DEFAULT_KEY_PC);
  const [letter, setLetter] = useState<CagedLetter>("C");
  const [sel, setSel] = useState("I");
  const [triads, setTriads] = useState(false);
  const region = regionOf(rootPc, letter);
  const list = useMemo(() => neighbours(rootPc, letter), [rootPc, letter]);
  const order = useMemo(() => cagedBoxes(rootPc, "major").map((b) => b.letter), [rootPc]);
  const selected = list.find((n) => n.roman === sel) ?? list[1];

  const walk = (d: number) => setLetter(order[(order.indexOf(letter) + d + order.length) % order.length]);
  const makeI = (n: Neighbour) => {
    if (region) setLetter(closestLetter(n.rootPc, region.from, region.to));
    setRootPc(n.rootPc);
    setSel("I");
  };

  const dots: NeckDot[] = selected.box
    ? selected.box.frets.flatMap((f, s) => (f === null ? [] : [{ string: s, fret: f, label: KEYS[(OPEN_MIDI[s] + f) % 12], fill: COLOUR[selected.roman], big: (OPEN_MIDI[s] + f) % 12 === selected.rootPc }]))
    : [];
  const voicings = !triads || !region ? [] : STRING_GROUPS.flatMap((g) => ([0, 1, 2] as const).flatMap((inv) =>
    triadVoicings(selected.rootPc, selected.quality === "major" ? "maj" : "min", inv, g).filter((v) => v.frets.every((f) => f >= region.from - 1 && f <= region.to + 1)),
  ));

  return (
    <section id="neighbours" className="scroll-mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="mb-1 text-base font-medium text-slate-100">
        Shape neighbours: a key without moving your hand
        <Info label="About shape neighbours">Each CAGED shape of the I chord pins your hand to a few frets. The other common chords of the key are already there in other CAGED shapes. Going round C → A → G → E → D: if I is shape X, then V is X+2, IV is X−2, vi is the minor form of X+1, ii of X−1 and iii of X−2. At the very bottom or top of the neck a shape can fall off, and the nearest shape is shown instead.</Info>
      </h2>
      <p className="mb-3 max-w-3xl text-sm text-slate-400">
        Open position is the C-shape region of C major: C, F (E shape), G, Am, Dm and Em all sit in the first three frets. Slide the region up the neck and the same family comes with it in new shapes. The layout follows the circle of fifths: IV on the left, V on the right, each with its relative minor below.
      </p>
      <div className="flex flex-col gap-2">
        <ChipRow label="Key">{KEYS.map((k, pc) => <Chip key={k} on={pc === rootPc} onClick={() => { if (region) setLetter(closestLetter(pc, region.from, region.to)); setRootPc(pc); }}>{k}</Chip>)}</ChipRow>
        <ChipRow label="I chord shape">
          {order.map((L) => <Chip key={L} on={L === letter} onClick={() => setLetter(L)}>{L}</Chip>)}
          <button type="button" onClick={() => walk(-1)} className="rounded-full border border-slate-700 px-2 text-sm text-slate-300" aria-label="Region down the neck">←</button>
          <button type="button" onClick={() => walk(1)} className="rounded-full border border-slate-700 px-2 text-sm text-slate-300" aria-label="Region up the neck">→</button>
        </ChipRow>
      </div>
      <div className="mt-3 min-w-0">
        <NoteNeck to={17} dots={dots} window={region ?? undefined} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {list.map((n) => (
          <Bubble key={n.roman} n={n} selected={n.roman === selected.roman} onSelect={() => setSel(n.roman)} onMakeI={n.roman === "IV" || n.roman === "V" ? () => makeI(n) : undefined} />
        ))}
      </div>
      <div className="mt-3">
        <Chip on={triads} onClick={() => setTriads((v) => !v)}>Triads of {selected.name} in this region</Chip>
        {triads && (
          voicings.length ? (
            <ul className="mt-2 grid gap-1 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
              {voicings.map((v, i) => (
                <li key={i}>
                  <button type="button" onClick={() => strum(v.midi)} className="cursor-pointer rounded px-1 text-left hover:bg-slate-800/70">
                    <span className="text-slate-500">{v.group.label.replace(/ \(.*/, "")}</span> · {INVERSIONS[v.inversion].short} · frets {v.frets.join("-")}
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-slate-500">No closed triad of {selected.name} fits inside these frets.</p>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-300"><b className="text-slate-100">Try this:</b> play I–IV–V–I in this region, then press → and play it again in the next region. Five regions, one key, and you never jump more than a couple of frets.</p>
    </section>
  );
}
