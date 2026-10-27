"use client";

import { useMemo, useState, type ReactNode } from "react";
import BoxNeck, { type Layers } from "./BoxNeck";
import { LabelSelect, useLabelSystem } from "@/features/theory/useLabelSystem";
import { hoverLabel, intervalName, noteLabel, type LabelSystem } from "@/features/theory/labels";
import ChordDiagram from "./ChordDiagram";
import { fretWidthFactor } from "./Fretboard";
import { DOT_INK, degreeColour } from "@/features/theory/scales";
import {
  CAGED_THEORY, NECK_END, boxArpeggio, boxCells, boxChords, boxScaleChords, cagedBoxes, cagedContext, ladderMidi, laneAt, laneStarts, layerNotes,
  type ArpKind, type CagedBox, type CagedCell, type CagedQuality,
} from "@/lib/chordKit/caged";
import { STRING_PLAIN, STRING_SHORT } from "@/lib/chordKit/shapeTools";
import type { Shape } from "@/lib/chordKit/shapes";
import { arpeggioMidi } from "@/lib/chordKit/arpeggios";
import { shapesForChord } from "@/lib/chordKit/chordShapes";
import { playTimed, strum, strumShape } from "@/lib/chordKit/playback";
import { generateMelody, melodyTiming, scalePool } from "@/lib/chordKit/melody";
import TuneButton from "./TuneButton";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { Chip, Info, InfoTip, Section, Select } from "@/components/ui";
import { degreeInfo } from "@/features/theory/degreeInfo";
import { BarRow, ScaleSettingsBar, UNDER_BAR, WithSettings } from "./ScaleSettings";
import { DegreeLegend } from "@/components/theory/DegreeLegend";

const LANE_COLOURS = ["#f43f5e", "#c084fc", "#facc15", "#4ade80", "#60a5fa"];
const play = "rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25";

/** CAGED system: five chord forms, the neck box each one marks out, and the arpeggio, scale and pentatonic inside it. */
export default function CagedExplorer({ initialRoot = DEFAULT_KEY_PC, initialQuality = "major", side = false, children }: {
  initialRoot?: number; initialQuality?: CagedQuality;
  /** the settings as a column on the right (the CAGED page); off when embedded, where they float over the top */
  side?: boolean;
  /** more of the page, under the boxes and beside the settings */
  children?: ReactNode;
} = {}) {
  const [rootPc, setRootPc] = useState(initialRoot);
  const [quality, setQuality] = useState<CagedQuality>(initialQuality);
  const [arpKind, setArpKind] = useState<ArpKind>("triad");
  const [labelSystem] = useLabelSystem();
  const [badges, setBadges] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  const th = CAGED_THEORY[quality];
  const ctx = useMemo(() => cagedContext(rootPc, quality), [rootPc, quality]);
  const boxes = useMemo(() => cagedBoxes(rootPc, quality), [rootPc, quality]);
  const notes = useMemo(() => layerNotes(rootPc, quality, arpKind), [rootPc, quality, arpKind]);
  const keyName = ctx.names[0];

  const bar = (
    <ScaleSettingsBar tonicPc={rootPc} onTonic={setRootPc} side={side} config={{
      scale: {
        name: quality === "major" ? "major" : "minor",
        picker: (
          <Select size="sm" className="mr-1" value={quality} onChange={setQuality} aria-label="Major or minor"
            options={[{ value: "major" as const, label: "Major" }, { value: "minor" as const, label: "Minor" }]} />
        ),
      },
      rows: (
        <>
          <BarRow label="Arpeggio" info="Triad uses the three notes of the chord (root, 3rd, 5th). 7th adds the seventh, giving a maj7 chord in major or m7 in minor.">
            <Chip on={arpKind === "triad"} onClick={() => setArpKind("triad")}>Triad</Chip>
            <Chip on={arpKind === "seventh"} onClick={() => setArpKind("seventh")}>{quality === "major" ? "Maj7" : "Min7"}</Chip>
          </BarRow>
          <BarRow label="Badges" info="With note names as labels, a badge on each dot gives its interval from the root.">
            <Chip on={badges && labelSystem === "note"} onClick={() => setBadges((v) => !v)}>Intervals</Chip>
          </BarRow>
        </>
      ),
    }} />
  );

  return (
    <WithSettings side={side} bar={bar}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
        <DegreeLegend />
        <Info label="What is the CAGED system?">
          Open chords come in five shapes, named after the chords C, A, G, E and D. Each can be slid up the neck as a barre chord, and each time it lands on the same chord in a different place. Slide all five and they link up in the order C, A, G, E, D, then C again an octave higher, covering the whole neck. Around each chord shape is a box of notes: that is where its arpeggio, scale and pentatonic live. Learn the five boxes and you can play the same key anywhere on the neck.
        </Info>
      </div>

      <NotesTable rootPc={rootPc} quality={quality} arpKind={arpKind} />

      <KeyChords rootPc={rootPc} quality={quality} keyName={keyName} />

      <Overview boxes={boxes} keyName={keyName} quality={quality} rootPc={rootPc} arpKind={arpKind} labelSystem={labelSystem} selected={selected} />

      <div className="flex flex-col gap-4">
        {boxes.map((box, i) => (
          <BoxCard key={box.letter} box={box} index={i} rootPc={rootPc} quality={quality} arpKind={arpKind} labelSystem={labelSystem} badges={badges} notes={notes} selected={selected === i} onSelect={() => setSelected((v) => (v === i ? null : i))} />
        ))}
      </div>
      {children}
    </WithSettings>
  );
}

/** The notes of the selection as bubbles: the interval above, the note name inside. One row each for the arpeggio, the scale and the pentatonic. */
function NotesTable({ rootPc, quality, arpKind }: { rootPc: number; quality: CagedQuality; arpKind: ArpKind }) {
  const th = CAGED_THEORY[quality];
  const ctx = useMemo(() => cagedContext(rootPc, quality), [rootPc, quality]);
  const arp = useMemo(() => boxArpeggio(ctx, arpKind), [ctx, arpKind]);
  const fromSemis = (semis: number[]) => semis.map((s) => { const d = th.scale.indexOf(s); return { semi: s, name: d >= 0 ? ctx.names[d] : "?", deg: d >= 0 ? d : null }; });
  const rows = [
    { title: notesTitle(arpKind, quality), notes: arp.notes.map((n) => { const semi = (n.pc - rootPc + 12) % 12; const d = th.scale.indexOf(semi); return { semi, name: n.name, deg: d >= 0 ? d : null }; }) },
    { title: th.pentName, notes: fromSemis(th.pent) },
    { title: th.scaleName, notes: fromSemis(th.scale) },
  ];
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5" aria-label="Notes of the selection">
      <div className="flex flex-col divide-y divide-slate-800/80">
        {rows.map((r) => (
          <div key={r.title} className="flex flex-wrap items-end gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
            <span className="w-36 shrink-0 pb-2 text-xs text-slate-400">{r.title}</span>
            <div className="flex flex-wrap gap-2">
              {r.notes.map((n) => (
                <div key={n.semi} className="flex w-10 flex-col items-center gap-1">
                  <span className="text-xs tabular-nums text-slate-400">{intervalName(n.semi)}</span>
                  <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${n.semi === 0 ? "ring-2 ring-slate-50" : "ring-1 ring-slate-950"}`} style={{ backgroundColor: n.deg === null ? "#f43f5e" : degreeColour(n.deg), color: DOT_INK }}>{n.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
/** The basic chord on every degree of the key, with the easiest shape. */
function KeyChords({ rootPc, quality, keyName }: { rootPc: number; quality: CagedQuality; keyName: string }) {
  const ctx = useMemo(() => cagedContext(rootPc, quality), [rootPc, quality]);
  const items = useMemo(() => ctx.chords.map((c, d) => ({ c, d, pick: shapesForChord(ctx, d, ["easy", "medium", "hard"], { fit: "triad" })[0] })), [ctx]);
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5" aria-label={`Chords in ${keyName} ${quality}`}>
      <h2 className="mb-2 text-sm font-medium text-slate-100">
        Chords in {keyName} {quality}
        <Info label="About these chords">The chord built on each note of the scale, with the simplest way to play it: an open chord when there is one, otherwise the first barre shape. The Roman numeral is the degree: capitals are major chords, lower case minor. Tap a diagram to hear it.</Info>
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {items.map(({ c, d, pick }) => (
          <div key={d} className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 ${d === 0 ? "border-sky-500/60 bg-sky-500/10" : "border-slate-800 bg-slate-950/50"}`}>
            <span className="text-xs text-slate-400">{c.roman}</span>
            <span className="text-base font-medium text-slate-100">{c.triadName}</span>
            {pick ? (
              <div className="w-full max-w-[8rem]"><ChordDiagram shape={pick.shape} rootFret={pick.fret} onPlay={() => strumShape(pick.shape, pick.fret)} ctx={ctx} /></div>
            ) : <span className="py-6 text-xs text-slate-500">no easy shape</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
const ChordGrid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;

/** One chord in a box's chord lists: an optional line over the name (its Roman numeral), the diagram, and a caption. The head line keeps its height when empty, so every card lines up. */
function ChordCard({ name, shape, rootFret, ctx, caption, head }: { name: string; shape: Shape; rootFret: number; ctx: ReturnType<typeof cagedContext>; caption: string; head?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
      <span className="flex min-h-6 items-center gap-1.5 text-xs text-slate-400">{head}</span>
      <span className="text-sm font-medium text-slate-100">{name}</span>
      <div className="w-24"><ChordDiagram shape={shape} rootFret={rootFret} onPlay={() => strumShape(shape, rootFret)} ctx={ctx} /></div>
      <span className="text-xs text-slate-500">{caption}</span>
    </div>
  );
}

/** A degree's name, job and notes, for the tooltip by its Roman numeral. */
function DegreeNote({ ctx, degree }: { ctx: ReturnType<typeof cagedContext>; degree: number }) {
  const d = degreeInfo(ctx, degree), c = ctx.chords[degree];
  return (
    <>
      <span className="font-medium text-slate-100">{c.roman} · {c.triadName} · {d.name}</span>
      <span>Notes: {d.notes.join(" ")}</span>
      <span>{d.text}</span>
    </>
  );
}
const notesTitle = (kind: ArpKind, q: CagedQuality) => (kind === "triad" ? (q === "major" ? "Major triad" : "Minor triad") : q === "major" ? "Maj7 arpeggio" : "Min7 arpeggio");

const STRING_LETTERS = ["E", "A", "D", "G", "B", "e"];

/** The neck map on its own, for the teacher studio: the five boxes of a key up the whole neck. */
export function CagedNeckMap({ rootPc, quality }: { rootPc: number; quality: CagedQuality }) {
  const [labelSystem] = useLabelSystem();
  const boxes = useMemo(() => cagedBoxes(rootPc, quality), [rootPc, quality]);
  const keyName = useMemo(() => cagedContext(rootPc, quality).names[0], [rootPc, quality]);
  return <Overview boxes={boxes} keyName={keyName} quality={quality} rootPc={rootPc} arpKind="triad" labelSystem={labelSystem} selected={null} embedded />;
}

/** One box on its own, for the teacher studio: its title, then the chord, arpeggio, pentatonic and scale in one row. */
export function CagedBoxPanels({ rootPc, quality, letter }: { rootPc: number; quality: CagedQuality; letter: CagedBox["letter"] }) {
  const [labelSystem] = useLabelSystem();
  const boxes = useMemo(() => cagedBoxes(rootPc, quality), [rootPc, quality]);
  const notes = useMemo(() => layerNotes(rootPc, quality, "triad"), [rootPc, quality]);
  const index = boxes.findIndex((b) => b.letter === letter);
  const box = boxes[index];
  if (!box) return null;
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <h2 className="mb-2 flex items-center gap-2 text-base font-medium text-slate-100">
        <span className="inline-block rounded px-1.5" style={{ background: LANE_COLOURS[index % 5], color: DOT_INK }}>{box.letter}</span>
        {box.letter} shape · root on {STRING_PLAIN[box.shape.rs]}
        <span className="ml-auto text-sm font-normal text-slate-400">{box.chordName} · frets {box.from}–{box.to}</span>
      </h2>
      <BoxPanels box={box} rootPc={rootPc} quality={quality} arpKind="triad" labelSystem={labelSystem} badges notes={notes} className="grid grid-cols-4 gap-3" />
    </section>
  );
}

/** The whole neck at a glance: a CSS grid with one column per fret and one row per string. Each CAGED box is a run of columns with its own colour. */
function Overview({ boxes, keyName, quality, rootPc, arpKind, labelSystem, selected, embedded = false }: {
  boxes: CagedBox[]; keyName: string; quality: CagedQuality; rootPc: number; arpKind: ArpKind; labelSystem: LabelSystem; selected: number | null;
  /** in the teacher studio: no label picker, and no bleed past the page margins */
  embedded?: boolean;
}) {
  const cells = useMemo(() => boxCells(rootPc, quality, { ...boxes[0], from: 0, to: NECK_END }, arpKind).filter((c) => c.arpRole), [boxes, rootPc, quality, arpKind]);
  const lab = (c: CagedCell) => noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText, role: c.arpRole });
  const sorted = [...boxes].sort((p, q) => p.from - q.from);
  const frets = Array.from({ length: NECK_END + 1 }, (_, f) => f);
  const cellAt = (s: number, f: number) => cells.find((c) => c.string === s && c.fret === f);
  // Every string is cut into lanes by its own notes: lane k starts at the string's k-th note and runs until the next one (laneAt).
  const laneBox = (k: number) => ((k % LANE_COLOURS.length) + LANE_COLOURS.length) % LANE_COLOURS.length;
  const colour = (k: number) => LANE_COLOURS[laneBox(k)];
  // a selected box stands out on the map; the others fade back
  const selLane = selected === null ? -1 : sorted.indexOf(boxes[selected]);
  const alpha = (k: number) => (selLane < 0 ? "var(--lane-alpha, 26%)" : laneBox(k) === selLane ? "55%" : "8%");
  const rowFrets = useMemo(() => [0, 1, 2, 3, 4, 5].map((s) => cells.filter((c) => c.string === s).map((c) => c.fret).sort((p, q) => p - q)), [cells]);
  const SECTIONS = sorted.length;
  const starts = laneStarts(rowFrets, SECTIONS);
  const labelSpans = starts.map((st, k) => {
    const from = Math.min(NECK_END, st);
    const to = k === SECTIONS - 1 ? NECK_END + 1 : Math.max(from + 1, starts[k + 1]);
    return { k, from, to };
  });
  const COL0 = 2; // grid column 1 holds the string names
  return (
    <section className={`rounded-2xl border border-slate-800 p-2.5 ${embedded ? "bg-slate-950" : "bleed bg-slate-900/40"}`}>
      <h2 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-100">
        <span>
          {keyName} {quality}: the five boxes up the neck
          <Info label="Reading the map">Every note of the chord on the whole neck. Each colour is one CAGED box, named after the open chord shape it is built around and numbered by position up the neck. On every string a colour starts halfway under a chord note and runs to halfway under the next one, so the first note on a string starts the first colour, the second note the second colour, and so on. The pattern repeats after the 12th fret. Tap a note to hear it.</Info>
        </span>
        {!embedded && <LabelSelect className="ml-auto" />}
      </h2>
      <div className="[--row:1.6rem] sm:[--row:2.6rem]">
        <div
          className="grid gap-y-0 text-[9px] sm:text-xs"
          style={{ gridTemplateColumns: `1rem ${frets.map((f) => `minmax(0,${fretWidthFactor(f).toFixed(3)}fr)`).join(" ")}`, gridTemplateRows: "auto repeat(6, var(--row)) auto" }}
          role="group" aria-label="Chord tones on the whole neck with the five CAGED boxes marked"
        >
          {labelSpans.map(({ k, from, to }) => (
            <div key={k} className={`flex whitespace-nowrap px-1 pb-1.5 text-[10px] font-semibold sm:text-xs ${k === SECTIONS - 1 ? "justify-end" : "justify-center"}`} style={{ gridRow: 1, gridColumn: `${from + COL0} / ${to + COL0}`, color: colour(k) }}>
              {sorted[k].letter}<span className="hidden sm:inline">&nbsp;shape · Position {k + 1}</span>
            </div>
          ))}
          {[5, 4, 3, 2, 1, 0].map((s, r) => (
            <div key={`n${s}`} className="grid place-items-center text-slate-500" style={{ gridRow: r + 2, gridColumn: 1 }}>{STRING_LETTERS[s]}</div>
          ))}
          {[5, 4, 3, 2, 1, 0].flatMap((s, r) =>
            frets.map((f) => {
              // before a string's first note sits the box that wraps round from below the nut (lane -1)
              const lane = f < (rowFrets[s][0] ?? 0) ? -1 : laneAt(rowFrets[s], f), c = cellAt(s, f);
              const line = "var(--color-slate-400)";
              const tint = (k: number) => `color-mix(in srgb, ${colour(k)} ${alpha(k)}, transparent)`;
              // a lane starts under its note: the colour changes halfway across the note's fret, not at its left edge
              const fill = c && rowFrets[s][lane] === f
                ? `linear-gradient(to right, ${tint(lane - 1)} 50%, ${tint(lane)} 50%)`
                : `linear-gradient(${tint(lane)}, ${tint(lane)})`;
              return (
                <div
                  key={`${s}-${f}`}
                  className="grid place-items-center"
                  style={{
                    gridRow: r + 2, gridColumn: f + COL0,
                    backgroundImage: `linear-gradient(${line}, ${line}), ${fill}`,
                    backgroundSize: `100% ${0.8 + s * 0.32}px, 100% 100%`,
                    backgroundPosition: "center, 0 0",
                    backgroundRepeat: "no-repeat",
                    borderLeft: f === 1 ? "4px solid #cbd5e1" : f > 1 ? "1px solid #3a4a66" : undefined,
                    borderTopLeftRadius: r === 0 && f === 0 ? 8 : undefined, borderBottomLeftRadius: r === 5 && f === 0 ? 8 : undefined,
                    borderTopRightRadius: r === 0 && f === NECK_END ? 8 : undefined, borderBottomRightRadius: r === 5 && f === NECK_END ? 8 : undefined,
                  }}
                >
                  {c && (
                    <button
                      type="button"
                      onClick={() => strum([c.midi], { gapMs: 0, holdMs: 700 })}
                      aria-label={`${lab(c)} on string ${STRING_LETTERS[s]}, fret ${f}`}
                      className={`group cursor-sound grid size-4 place-items-center rounded-full text-[8px] font-bold sm:size-7 sm:text-xs ${c.isRoot ? "ring-2 ring-slate-50" : "ring-1 ring-slate-950"}`}
                      style={{ backgroundColor: c.scaleDegree === null ? "#f43f5e" : degreeColour(c.scaleDegree), color: DOT_INK }}
                    >
                      <span className="group-hover:hidden">{lab(c)}</span>
                      <span className="hidden group-hover:inline">{hoverLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText })}</span>
                    </button>
                  )}
                </div>
              );
            }),
          )}
          {frets.map((f) => (
            <div key={`fn${f}`} className="pt-1.5 text-center text-slate-500" style={{ gridRow: 8, gridColumn: f + COL0 }}>{f === 0 ? <><span className="sm:hidden">0</span><span className="hidden sm:inline">open</span></> : f}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BoxCard({ box, index, rootPc, quality, arpKind, labelSystem, badges, notes, selected, onSelect }: {
  box: CagedBox; index: number; rootPc: number; quality: CagedQuality; arpKind: ArpKind; labelSystem: LabelSystem; badges: boolean; notes: ReturnType<typeof layerNotes>; selected: boolean; onSelect: () => void;
}) {
  const ctx = useMemo(() => cagedContext(rootPc, quality), [rootPc, quality]);
  const related = useMemo(() => boxChords(rootPc, quality, box).filter((c) => c.shape.suf !== box.shape.suf || c.rootFret !== box.rootFret).slice(0, 8), [rootPc, quality, box]);
  const scaleChords = useMemo(() => boxScaleChords(rootPc, quality, box), [rootPc, quality, box]);
  const fretText = `frets ${box.from}–${box.to}`;

  return (
    <section id={`box-${box.letter}`} className={`bleed ${UNDER_BAR}`}>
      <Section
        lead={<>
          <span className="inline-block rounded px-1.5 text-base font-medium" style={{ background: LANE_COLOURS[index % 5], color: DOT_INK }}>{box.letter}</span>
          <span className="h-5 w-px bg-slate-700" aria-hidden />
          <Chip on={selected} onClick={onSelect} title="Highlight this box on the neck map">{selected ? "Selected" : "Select"}</Chip>
          <span className="h-5 w-px bg-slate-700" aria-hidden />
        </>}
        title={<>{box.letter} shape · root on {STRING_PLAIN[box.shape.rs]}</>}
        info={<>The {box.letter} shape is the open {box.letter} chord form moved up the neck as a barre chord. Here it gives {box.chordName}. The box of notes around it, frets {box.from} to {box.to}, holds the arpeggio, scale and pentatonic.</>}
        meta={fretText}
        accent={LANE_COLOURS[index % 5]}
      >
        <BoxPanels box={box} rootPc={rootPc} quality={quality} arpKind={arpKind} labelSystem={labelSystem} badges={badges} notes={notes} />
        {scaleChords.length > 0 && (
          <div className="mt-3">
            <Section level={2}
              title={`Chords inside this box (${scaleChords.length})`}
              info="The chords of the key, starting with the box's own CAGED chord as the I, each with a shape whose every note falls inside this box, so you can change chord without leaving the position. The Roman numeral is the chord's degree in the key: capitals are major, lower case minor, ° diminished. Tap one to hear it.">
              <ChordGrid>
                {scaleChords.map((c) => (
                  <ChordCard key={c.degree} name={c.name} shape={c.shape} rootFret={c.rootFret} ctx={ctx} caption={`fret ${c.rootFret}`}
                    head={<>{c.roman}<InfoTip hover align="center" label={`About the ${c.roman} chord`}><DegreeNote ctx={ctx} degree={c.degree} /></InfoTip></>} />
                ))}
              </ChordGrid>
            </Section>
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-3">
            <Section level={2} defaultOpen={false}
              title={`Other ${ctx.names[0]}${quality === "minor" ? " minor" : ""} chords inside this box (${related.length})`}
              info="Chords on the same root from the chord explorer whose every note falls inside this box, easiest first. They fit the same arpeggio, pentatonic and scale as the main shape. Tap one to hear it.">
            <ChordGrid>
              {related.map((c) => (
                <ChordCard key={c.shape.id} name={c.name} shape={c.shape} rootFret={c.rootFret} ctx={ctx} caption={c.shape.v ?? `fret ${c.rootFret}`} />
              ))}
            </ChordGrid>
            </Section>
          </div>
        )}
      </Section>
    </section>
  );
}

/** A box's four necks side by side: its chord, arpeggio, pentatonic and scale, each with Play (and a tune for the scales). */
function BoxPanels({ box, rootPc, quality, arpKind, labelSystem, badges, notes, className = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4" }: {
  box: CagedBox; rootPc: number; quality: CagedQuality; arpKind: ArpKind; labelSystem: LabelSystem; badges: boolean; notes: ReturnType<typeof layerNotes>; className?: string;
}) {
  const th = CAGED_THEORY[quality];
  const ctx = useMemo(() => cagedContext(rootPc, quality), [rootPc, quality]);
  const cells = useMemo(() => boxCells(rootPc, quality, box, arpKind), [rootPc, quality, box, arpKind]);
  const onNote = (c: CagedCell) => strum([c.midi], { gapMs: 0, holdMs: 700 });
  // a short tune from the box's scale (or the pentatonic part of it), new every click
  const playTune = (semis: number[], tuneId: string) => {
    const pool = scalePool(48 + rootPc, th.scale).filter((n) => semis.includes(th.scale[n.degree]));
    playTimed(melodyTiming(generateMelody(pool, th.scale)).map((n) => ({ midi: n.note.midi, ms: n.ms, velocity: n.velocity })), tuneId);
  };
  const only = (k: keyof Layers): Layers => ({ chord: false, arp: false, pent: false, scale: false, [k]: true });
  const panels = [
    { key: "chord", title: "CAGED / Chord", layers: only("chord"), notes: `${box.chordName}, root on the ${STRING_SHORT[box.shape.rs]} string${box.rootFret > 0 ? `, fret ${box.rootFret}` : ", open"}`, onPlay: () => strumShape(box.shape, box.rootFret) },
    { key: "arp", title: notes.arpTitle, layers: only("arp"), notes: notes.arp.join(" "), onPlay: () => strum(arpeggioMidi(boxArpeggio(ctx, arpKind)), { gapMs: 230, holdMs: 700 }) },
    { key: "pent", title: th.pentName, layers: only("pent"), notes: notes.pent.join(" "), onPlay: () => strum(ladderMidi(rootPc, th.pent), { gapMs: 220, holdMs: 500 }), onTune: (id: string) => playTune(th.pent, id) },
    { key: "scale", title: th.scaleName, layers: only("scale"), notes: notes.scale.join(" "), onPlay: () => strum(ladderMidi(rootPc, th.scale), { gapMs: 200, holdMs: 500 }), onTune: (id: string) => playTune(th.scale, id) },
  ];
  return (
    <div className={className}>
      {panels.map((p) => (
        <div key={p.key} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-950/70 p-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-slate-100">{p.title}</h3>
            <button type="button" className={`cursor-sound ${play} ml-auto`} onClick={p.onPlay} aria-label={`Play the ${p.title}`}>▶ Play</button>
            {"onTune" in p && p.onTune && <TuneButton className={play} onPlay={p.onTune} title={`A short tune made from the ${p.title}, new every time`} />}
          </div>
          <BoxNeck cells={cells} box={box} layers={p.layers} labelSystem={labelSystem} badges={badges} onNote={onNote} />
          <p className="text-xs text-slate-400">{p.notes}</p>
        </div>
      ))}
    </div>
  );
}
