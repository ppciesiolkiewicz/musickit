"use client";

import { useMemo, useState } from "react";
import BoxNeck, { type Layers } from "./BoxNeck";
import { LabelSelect, useLabelSystem } from "./useLabelSystem";
import { noteLabel, type LabelSystem } from "@/lib/chordKit/labels";
import ChordDiagram from "./ChordDiagram";
import { KeyPicker } from "./KeyPicker";
import { FretboardBase, fretGeometry } from "./Fretboard";
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

      <Overview boxes={boxes} keyName={keyName} quality={quality} rootPc={rootPc} arpKind={arpKind} labelSystem={labelSystem} />

      <div className="flex flex-col gap-4">
        {boxes.map((box, i) => (
          <BoxCard key={box.letter} box={box} index={i} rootPc={rootPc} quality={quality} arpKind={arpKind} labelSystem={labelSystem} badges={badges} notes={notes} />
        ))}
      </div>
    </div>
  );
}

/** The whole neck at a glance: every chord tone, with each CAGED box shaded and labelled above its frets. */
function Overview({ boxes, keyName, quality, rootPc, arpKind, labelSystem }: { boxes: CagedBox[]; keyName: string; quality: CagedQuality; rootPc: number; arpKind: ArpKind; labelSystem: LabelSystem }) {
  const g = useMemo(() => fretGeometry(0, NECK_END), []);
  const cells = useMemo(() => boxCells(rootPc, quality, { ...boxes[0], from: 0, to: NECK_END }, arpKind).filter((c) => c.arpRole), [boxes, rootPc, quality, arpKind]);
  const lab = (c: CagedCell) => noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText, role: c.arpRole });
  const off = 40;
  const sorted = [...boxes].sort((p, q) => p.from - q.from);
  // Each string is coloured on its own: every chord tone belongs to the box that contains it (the nearest centre where two overlap),
  // and the colour changes halfway between two neighbouring notes that belong to different boxes.
  const owner = (f: number) => {
    const inside = sorted.filter((b) => f >= b.from && f <= b.to);
    const pool = inside.length ? inside : sorted;
    return pool.reduce((best, b) => (Math.abs(f - (b.from + b.to) / 2) < Math.abs(f - (best.from + best.to) / 2) ? b : best));
  };
  const rowH = g.sy(4) - g.sy(5);
  const boardL = g.left, boardR = g.edge(NECK_END + 1);
  const bands = Array.from({ length: 6 }, (_, s) => {
    const row = cells.filter((c) => c.string === s).sort((p, q) => p.fret - q.fret);
    const y0 = s === 5 ? g.sy(5) - 14 : g.sy(s) - rowH / 2;
    const y1 = s === 0 ? g.sy(0) + 14 : g.sy(s) + rowH / 2;
    const runs: { b: CagedBox; x0: number; x1: number }[] = [];
    row.forEach((c, i) => {
      const b = owner(c.fret);
      const last = runs[runs.length - 1];
      if (last && last.b === b) { last.x1 = i === row.length - 1 ? boardR : last.x1; return; }
      const x0 = i === 0 ? boardL : (g.fx(row[i - 1].fret) + g.fx(c.fret)) / 2;
      if (last) last.x1 = x0;
      runs.push({ b, x0, x1: boardR });
    });
    return { y0, y1, runs };
  });
  const zones = sorted.map((b) => {
    const x0 = g.edge(b.from), x1 = g.edge(b.to + 1);
    return { b, x0, x1, col: LANE_COLOURS[boxes.indexOf(b) % 5] };
  });
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
      <h2 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-100">
        <span>
          {keyName} {quality}: the five boxes up the neck
          <Info label="Reading the map">Every note of the chord on the whole neck. Each shaded zone is one CAGED box, named after the open chord shape it is built around and numbered by position up the neck. Neighbouring boxes overlap by a fret or two, and the pattern repeats after the 12th fret. Tap a note to hear it.</Info>
        </span>
        <LabelSelect className="ml-auto" />
      </h2>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${g.W} ${g.H + off}`} width="100%" style={{ minWidth: 820 }} role="img" aria-label="Chord tones on the whole neck with the five CAGED boxes marked">
          <g transform={`translate(0, ${off})`}>
            <FretboardBase g={g} />
            <clipPath id="overview-board"><rect x={g.left} y={g.sy(5) - 14} width={g.edge(NECK_END + 1) - g.left} height={g.sy(0) - g.sy(5) + 28} rx={8} /></clipPath>
            <g clipPath="url(#overview-board)">
              {bands.map((bd, si) => bd.runs.map((r) => <rect key={`${si}-${r.x0}`} x={r.x0} y={bd.y0} width={r.x1 - r.x0} height={bd.y1 - bd.y0} fill={LANE_COLOURS[boxes.indexOf(r.b) % 5]} opacity={0.26} />))}
            </g>
            {cells.map((c) => {
              const x = g.fx(c.fret), y = g.sy(c.string), col = c.scaleDegree === null ? "#f43f5e" : degreeColour(c.scaleDegree), l = lab(c);
              return (
                <g key={`${c.string}-${c.fret}`} onClick={() => strum([c.midi], { gapMs: 0, holdMs: 700 })} style={{ cursor: "pointer" }}>
                  <circle cx={x} cy={y} r={13} fill={col} stroke={c.isRoot ? "#ffffff" : "#0d1526"} strokeWidth={c.isRoot ? 2.5 : 1.5} />
                  <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={l.length > 2 ? 9.5 : 12} fontWeight={700} fill="#0b1220" pointerEvents="none">{l}</text>
                </g>
              );
            })}
          </g>
          {zones.map(({ b, x0, x1, col }, i) => {
            const cx = (x0 + x1) / 2;
            const y = i % 2 === 0 ? 14 : 31;
            return <text key={b.letter} x={cx} y={y} textAnchor="middle" fontSize={12} fontWeight={600} fill={col}>{b.letter} shape · Position {i + 1}</text>;
          })}
        </svg>
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
    { key: "scale", title: th.scaleName, layers: only("scale"), notes: notes.scale.join(" "), onPlay: () => strum(ladderMidi(rootPc, th.scale), { gapMs: 200, holdMs: 500 }) },
    { key: "pent", title: th.pentName, layers: only("pent"), notes: notes.pent.join(" "), onPlay: () => strum(ladderMidi(rootPc, th.pent), { gapMs: 220, holdMs: 500 }) },
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
          <div className="mt-4">
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              Other {ctx.names[0]}{quality === "minor" ? " minor" : ""} chords inside this box
              <Info label="About these chords">Chords on the same root from the chord explorer whose every note falls inside this box, easiest first. They fit the same arpeggio, pentatonic and scale as the main shape. Tap one to hear it.</Info>
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((c) => (
                <div key={c.shape.id} className="flex flex-col items-center gap-0.5 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
                  <span className="text-sm font-medium text-slate-100">{c.name}</span>
                  <div className="w-24"><ChordDiagram shape={c.shape} rootFret={c.rootFret} onPlay={() => strumShape(c.shape, c.rootFret)} /></div>
                  <span className="text-[11px] text-slate-500">{c.shape.v ?? "fret " + c.rootFret}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>
    </section>
  );
}
