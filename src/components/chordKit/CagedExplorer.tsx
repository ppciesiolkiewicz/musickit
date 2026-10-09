"use client";

import { useMemo, useState } from "react";
import BoxNeck, { type Layers } from "./BoxNeck";
import { LabelSelect, useLabelSystem } from "./useLabelSystem";
import { intervalName, noteLabel, type LabelSystem } from "@/lib/chordKit/labels";
import ChordDiagram from "./ChordDiagram";
import { KeyPicker } from "./KeyPicker";
import { fretWidthFactor } from "./Fretboard";
import { degreeColour } from "@/lib/chordKit/scales";
import { Chip, ChipRow, DegreeLegend, Info, Section } from "./ui";
import {
  CAGED_THEORY, NECK_END, boxArpeggio, boxCells, boxChords, cagedBoxes, cagedContext, ladderMidi, layerNotes,
  type ArpKind, type CagedBox, type CagedCell, type CagedQuality,
} from "@/lib/chordKit/caged";
import { STRING_SHORT } from "@/lib/chordKit/shapeTools";
import { arpeggioMidi } from "@/lib/chordKit/arpeggios";
import { strum, strumShape } from "@/lib/chordKit/playback";

const LANE_COLOURS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa"];
const play = "rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/25";

/** CAGED system: five chord forms, the neck box each one marks out, and the arpeggio, scale and pentatonic inside it. */
export default function CagedExplorer() {
  const [rootPc, setRootPc] = useState(0);
  const [quality, setQuality] = useState<CagedQuality>("major");
  const [arpKind, setArpKind] = useState<ArpKind>("triad");
  const [labelSystem] = useLabelSystem();
  const [badges, setBadges] = useState(true);

  const th = CAGED_THEORY[quality];
  const ctx = useMemo(() => cagedContext(rootPc, quality), [rootPc, quality]);
  const boxes = useMemo(() => cagedBoxes(rootPc, quality), [rootPc, quality]);
  const notes = useMemo(() => layerNotes(rootPc, quality, arpKind), [rootPc, quality, arpKind]);
  const keyName = ctx.names[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
        <KeyPicker tonicPc={rootPc} onTonic={setRootPc} />
        <ChipRow label="Major / minor" info="CAGED works the same way for major and minor chords. In major you use the C, A, G, E and D chord shapes. In minor you use the minor version of each (Cm, Am, Gm, Em, Dm shapes). The scale and pentatonic change with it: major scale and major pentatonic, or natural minor and minor pentatonic.">
          <Chip on={quality === "major"} onClick={() => setQuality("major")}>Major</Chip>
          <Chip on={quality === "minor"} onClick={() => setQuality("minor")}>Minor</Chip>
        </ChipRow>
        <ChipRow label="Arpeggio" info="Triad uses the three notes of the chord (root, 3rd, 5th). 7th adds the seventh, giving a maj7 chord in major or m7 in minor.">
          <Chip on={arpKind === "triad"} onClick={() => setArpKind("triad")}>Triad</Chip>
          <Chip on={arpKind === "seventh"} onClick={() => setArpKind("seventh")}>{quality === "major" ? "Maj7" : "Min7"}</Chip>
        </ChipRow>
        <ChipRow label="Labels" info="Pick how notes are labelled: note names, intervals from the root (R, b3, p5), scale degrees or chord tones. It is the same setting as the dropdown at the top of every page. The colour of a dot is its scale degree either way. Badges add the interval on each note-name dot.">
          <LabelSelect showLabel={false} />
          <Chip on={badges && labelSystem === "note"} onClick={() => setBadges((v) => !v)}>Badges</Chip>
        </ChipRow>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <DegreeLegend />
          <Info label="What is the CAGED system?">
            Open chords come in five shapes, named after the chords C, A, G, E and D. Each can be slid up the neck as a barre chord, and each time it lands on the same chord in a different place. Slide all five and they link up in the order C, A, G, E, D, then C again an octave higher, covering the whole neck. Around each chord shape is a box of notes: that is where its arpeggio, scale and pentatonic live. Learn the five boxes and you can play the same key anywhere on the neck.
          </Info>
        </div>
      </div>

      <NotesTable rootPc={rootPc} quality={quality} arpKind={arpKind} />

      <Overview boxes={boxes} keyName={keyName} quality={quality} rootPc={rootPc} arpKind={arpKind} labelSystem={labelSystem} />

      <div className="flex flex-col gap-4">
        {boxes.map((box, i) => (
          <BoxCard key={box.letter} box={box} index={i} rootPc={rootPc} quality={quality} arpKind={arpKind} labelSystem={labelSystem} badges={badges} notes={notes} />
        ))}
      </div>
    </div>
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
                  <span className="text-[11px] tabular-nums text-slate-400">{intervalName(n.semi)}</span>
                  <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-slate-950 ${n.semi === 0 ? "ring-2 ring-white" : "ring-1 ring-slate-950"}`} style={{ backgroundColor: n.deg === null ? "#f43f5e" : degreeColour(n.deg) }}>{n.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
const notesTitle = (kind: ArpKind, q: CagedQuality) => (kind === "triad" ? (q === "major" ? "Major triad" : "Minor triad") : q === "major" ? "Maj7 arpeggio" : "Min7 arpeggio");

const STRING_LETTERS = ["E", "A", "D", "G", "B", "e"];

/** The whole neck at a glance: a CSS grid with one column per fret and one row per string. Each CAGED box is a run of columns with its own colour. */
function Overview({ boxes, keyName, quality, rootPc, arpKind, labelSystem }: { boxes: CagedBox[]; keyName: string; quality: CagedQuality; rootPc: number; arpKind: ArpKind; labelSystem: LabelSystem }) {
  const cells = useMemo(() => boxCells(rootPc, quality, { ...boxes[0], from: 0, to: NECK_END }, arpKind).filter((c) => c.arpRole), [boxes, rootPc, quality, arpKind]);
  const lab = (c: CagedCell) => noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText, role: c.arpRole });
  const sorted = [...boxes].sort((p, q) => p.from - q.from);
  const frets = Array.from({ length: NECK_END + 1 }, (_, f) => f);
  const cellAt = (s: number, f: number) => cells.find((c) => c.string === s && c.fret === f);
  // Every string is cut into sections by its own notes: the first note's section is one colour on every string, the second note's section the next, and so on.
  // A section runs from halfway to the previous note to halfway to the next one.
  const colour = (k: number) => LANE_COLOURS[k % LANE_COLOURS.length];
  const rowNotes = (s: number) => cells.filter((c) => c.string === s).sort((p, q) => p.fret - q.fret);
  const fillFor = (s: number, f: number): [string, string] => {
    const row = rowNotes(s);
    if (!row.length) return [colour(0), colour(0)];
    const at = row.findIndex((c) => c.fret === f);
    if (at >= 0) return [colour(at), colour(at)];
    const nextI = row.findIndex((c) => c.fret > f);
    if (nextI < 0) return [colour(row.length - 1), colour(row.length - 1)];
    if (nextI === 0) return [colour(0), colour(0)];
    const mid = (row[nextI - 1].fret + row[nextI].fret) / 2;
    return f < mid ? [colour(nextI - 1), colour(nextI - 1)] : f > mid ? [colour(nextI), colour(nextI)] : [colour(nextI - 1), colour(nextI)];
  };
  // where each section starts on average, for the labels above
  const SECTIONS = sorted.length;
  const starts = Array.from({ length: SECTIONS }, (_, k) => {
    if (k === 0) return 0;
    const xs = [0, 1, 2, 3, 4, 5].map((s) => rowNotes(s)).filter((r) => r.length > k).map((r) => (r[k - 1].fret + r[k].fret) / 2 + 0.5);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NECK_END;
  });
  const labelSpans = starts.map((st, k) => {
    const from = Math.min(NECK_END, Math.round(st));
    const to = k === SECTIONS - 1 ? NECK_END + 1 : Math.max(from + 1, Math.round(starts[k + 1]));
    return { k, from, to };
  });
  const COL0 = 2; // grid column 1 holds the string names
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
      <h2 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-100">
        <span>
          {keyName} {quality}: the five boxes up the neck
          <Info label="Reading the map">Every note of the chord on the whole neck. Each coloured run of frets is one CAGED box, named after the open chord shape it is built around and numbered by position up the neck. Neighbouring boxes overlap by a fret or two; here they meet in the middle of the overlap. The pattern repeats after the 12th fret. Tap a note to hear it.</Info>
        </span>
        <LabelSelect className="ml-auto" />
      </h2>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[820px] gap-y-0 text-[11px]"
          style={{ gridTemplateColumns: `1.5rem ${frets.map((f) => `${fretWidthFactor(f).toFixed(3)}fr`).join(" ")}`, gridTemplateRows: "auto repeat(6, 2.6rem) auto" }}
          role="group" aria-label="Chord tones on the whole neck with the five CAGED boxes marked"
        >
          {labelSpans.map(({ k, from, to }) => (
            <div key={k} className="px-1 pb-1.5 text-center text-xs font-semibold" style={{ gridRow: 1, gridColumn: `${from + COL0} / ${to + COL0}`, color: colour(k) }}>
              {sorted[k].letter} shape · Position {k + 1}
            </div>
          ))}
          {[5, 4, 3, 2, 1, 0].map((s, r) => (
            <div key={`n${s}`} className="grid place-items-center text-slate-500" style={{ gridRow: r + 2, gridColumn: 1 }}>{STRING_LETTERS[s]}</div>
          ))}
          {[5, 4, 3, 2, 1, 0].flatMap((s, r) =>
            frets.map((f) => {
              const [fl, fr] = fillFor(s, f), c = cellAt(s, f);
              const line = "#94a3b8";
              return (
                <div
                  key={`${s}-${f}`}
                  className="grid place-items-center"
                  style={{
                    gridRow: r + 2, gridColumn: f + COL0,
                    backgroundImage: `linear-gradient(${line}, ${line}), linear-gradient(90deg, ${fl}42 50%, ${fr}42 50%)`,
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
                      className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-slate-950 ${c.isRoot ? "ring-2 ring-white" : "ring-1 ring-slate-950"}`}
                      style={{ backgroundColor: c.scaleDegree === null ? "#f43f5e" : degreeColour(c.scaleDegree) }}
                    >
                      {lab(c)}
                    </button>
                  )}
                </div>
              );
            }),
          )}
          {frets.map((f) => (
            <div key={`fn${f}`} className="pt-1.5 text-center text-slate-500" style={{ gridRow: 8, gridColumn: f + COL0 }}>{f === 0 ? "open" : f}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BoxCard({ box, index, rootPc, quality, arpKind, labelSystem, badges, notes }: {
  box: CagedBox; index: number; rootPc: number; quality: CagedQuality; arpKind: ArpKind; labelSystem: LabelSystem; badges: boolean; notes: ReturnType<typeof layerNotes>;
}) {
  const th = CAGED_THEORY[quality];
  const ctx = useMemo(() => cagedContext(rootPc, quality), [rootPc, quality]);
  const cells = useMemo(() => boxCells(rootPc, quality, box, arpKind), [rootPc, quality, box, arpKind]);
  const related = useMemo(() => boxChords(rootPc, quality, box).filter((c) => c.shape.suf !== box.shape.suf || c.rootFret !== box.rootFret).slice(0, 8), [rootPc, quality, box]);
  const [hearing, setHearing] = useState(false);

  const hearChord = () => {
    strumShape(box.shape, box.rootFret);
    setHearing(true);
    setTimeout(() => setHearing(false), 600);
  };
  const onNote = (c: CagedCell) => strum([c.midi], { gapMs: 0, holdMs: 700 });
  const fretText = `frets ${box.from}–${box.to}`;
  const only = (k: keyof Layers): Layers => ({ chord: false, arp: false, pent: false, scale: false, [k]: true });
  const panels = [
    { key: "chord", title: "CAGED / Chord", layers: only("chord"), notes: `${box.chordName}, root on the ${STRING_SHORT[box.shape.rs]} string${box.rootFret > 0 ? `, fret ${box.rootFret}` : ", open"}`, onPlay: hearChord },
    { key: "arp", title: notes.arpTitle.replace(" arpeggio", " arpeggio"), layers: only("arp"), notes: notes.arp.join(" "), onPlay: () => strum(arpeggioMidi(boxArpeggio(ctx, arpKind)), { gapMs: 230, holdMs: 700 }) },
    { key: "pent", title: th.pentName, layers: only("pent"), notes: notes.pent.join(" "), onPlay: () => strum(ladderMidi(rootPc, th.pent), { gapMs: 220, holdMs: 500 }) },
    { key: "scale", title: th.scaleName, layers: only("scale"), notes: notes.scale.join(" "), onPlay: () => strum(ladderMidi(rootPc, th.scale), { gapMs: 200, holdMs: 500 }) },
  ];

  return (
    <section id={`box-${box.letter}`} className="scroll-mt-4">
      <Section
        title={<span><span className="mr-2 inline-block rounded px-1.5 text-slate-950" style={{ background: LANE_COLOURS[index % 5] }}>{box.letter}</span>{box.letter} shape · {box.chordName} chord</span>}
        info={<>The {box.letter} shape is the open {box.letter} chord form moved up the neck as a barre chord. Here it gives {box.chordName}. The box of notes around it, frets {box.from} to {box.to}, holds the arpeggio, scale and pentatonic.</>}
        meta={fretText}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {panels.map((p) => (
            <div key={p.key} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-slate-100">{p.title}</h3>
                <button type="button" className={`${play} ml-auto`} onClick={p.onPlay} aria-label={`Play the ${p.title}`}>▶ Play</button>
              </div>
              <BoxNeck cells={cells} box={box} layers={p.layers} labelSystem={labelSystem} badges={badges} onNote={onNote} />
              <p className="text-xs text-slate-400">{p.notes}</p>
            </div>
          ))}
        </div>

        {related.length > 0 && (
          <div className="mt-3">
            <Section level={2} defaultOpen={false}
              title={`Other ${ctx.names[0]}${quality === "minor" ? " minor" : ""} chords inside this box (${related.length})`}
              info="Chords on the same root from the chord explorer whose every note falls inside this box, easiest first. They fit the same arpeggio, pentatonic and scale as the main shape. Tap one to hear it.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((c) => (
                <div key={c.shape.id} className="flex flex-col items-center gap-0.5 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
                  <span className="text-sm font-medium text-slate-100">{c.name}</span>
                  <div className="w-24"><ChordDiagram shape={c.shape} rootFret={c.rootFret} onPlay={() => strumShape(c.shape, c.rootFret)} /></div>
                  <span className="text-[11px] text-slate-500">{c.shape.v ?? "fret " + c.rootFret}</span>
                </div>
              ))}
            </div>
            </Section>
          </div>
        )}
      </Section>
    </section>
  );
}
