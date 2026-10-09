"use client";

import { useMemo, useState } from "react";
import BoxNeck, { type Layers, type LabelMode } from "./BoxNeck";
import ChordDiagram from "./ChordDiagram";
import { KeyPicker } from "./KeyPicker";
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
  const [labelMode, setLabelMode] = useState<LabelMode>("name");
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
        <ChipRow label="Labels" info="Note names (C, E, G) or scale degrees (1, 3, 5, or 1, ♭3, 5 in minor). The colour of a dot is its scale degree either way. Degree badges add a tiny circle on each dot with its scale degree, so you see the note name and its job at the same time.">
          <Chip on={labelMode === "name"} onClick={() => setLabelMode("name")}>Note names</Chip>
          <Chip on={labelMode === "degree"} onClick={() => setLabelMode("degree")}>Scale degrees</Chip>
          <Chip on={badges && labelMode === "name"} onClick={() => setBadges((v) => !v)}>Degree badges</Chip>
        </ChipRow>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <DegreeLegend />
          <Info label="What is the CAGED system?">
            Open chords come in five shapes, named after the chords C, A, G, E and D. Each can be slid up the neck as a barre chord, and each time it lands on the same chord in a different place. Slide all five and they link up in the order C, A, G, E, D, then C again an octave higher, covering the whole neck. Around each chord shape is a box of notes: that is where its arpeggio, scale and pentatonic live. Learn the five boxes and you can play the same key anywhere on the neck.
          </Info>
        </div>
      </div>

      <Overview boxes={boxes} keyName={keyName} quality={quality} />

      <div className="flex flex-col gap-4">
        {boxes.map((box, i) => (
          <BoxCard key={box.letter} box={box} index={i} rootPc={rootPc} quality={quality} arpKind={arpKind} labelMode={labelMode} badges={badges} notes={notes} />
        ))}
      </div>
    </div>
  );
}

/** The whole neck at a glance: one lane per box showing which frets it covers. */
function Overview({ boxes, keyName, quality }: { boxes: CagedBox[]; keyName: string; quality: CagedQuality }) {
  const colW = 40, left = 70, top = 22, laneH = 24;
  const W = left + (NECK_END + 1) * colW + 10;
  const H = top + boxes.length * laneH + 26;
  const x = (f: number) => left + f * colW;
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
      <h2 className="mb-2 text-sm font-medium text-slate-100">
        {keyName} {quality}: the five boxes up the neck
        <Info label="Reading the map">Each coloured bar is one CAGED box and the frets it covers. Neighbouring boxes overlap by a fret or two, so the five boxes cover the whole neck from the nut to the 17th fret, then the pattern repeats. The letter is the open chord shape the box is built around. Scroll down for each box in detail.</Info>
      </h2>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 640 }} role="img" aria-label="Map of the five CAGED boxes on the neck">
          {Array.from({ length: NECK_END + 1 }, (_, f) => (
            <g key={f}>
              <line x1={x(f)} x2={x(f)} y1={top - 6} y2={top + boxes.length * laneH} stroke="#334155" strokeWidth={f === 0 ? 3 : 1} />
              <text x={x(f) + colW / 2} y={top - 9} textAnchor="middle" fontSize={10} fill="#64748b">{f === 0 ? "" : f}</text>
            </g>
          ))}
          {boxes.map((b, i) => (
            <g key={b.letter}>
              <text x={left - 8} y={top + i * laneH + laneH / 2} textAnchor="end" dominantBaseline="central" fontSize={12} fill="#cbd5e1">{b.letter} · {b.chordName}</text>
              <rect x={x(b.from) + 2} y={top + i * laneH + 3} width={(b.to - b.from + 1) * colW - 4} height={laneH - 6} rx={6} fill={LANE_COLOURS[i % 5]} opacity={0.75} />
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

function BoxCard({ box, index, rootPc, quality, arpKind, labelMode, badges, notes }: {
  box: CagedBox; index: number; rootPc: number; quality: CagedQuality; arpKind: ArpKind; labelMode: LabelMode; badges: boolean; notes: ReturnType<typeof layerNotes>;
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
    { key: "arp", title: notes.arpTitle.replace(" arpeggio", " arpeggio"), layers: only("arp"), notes: notes.arp.join(" "), onPlay: () => strum(arpeggioMidi(boxArpeggio(ctx, arpKind)), { gapMs: 230, holdMs: 700 }) },
    { key: "scale", title: th.scaleName, layers: only("scale"), notes: notes.scale.join(" "), onPlay: () => strum(ladderMidi(rootPc, th.scale), { gapMs: 200, holdMs: 500 }) },
    { key: "pent", title: th.pentName, layers: only("pent"), notes: notes.pent.join(" "), onPlay: () => strum(ladderMidi(rootPc, th.pent), { gapMs: 220, holdMs: 500 }) },
  ];

  return (
    <section id={`box-${box.letter}`} className="scroll-mt-4">
      <Section
        title={<span><span className="mr-2 inline-block rounded px-1.5 text-slate-950" style={{ background: LANE_COLOURS[index % 5] }}>{box.letter}</span>{box.letter} shape · {box.chordName}</span>}
        meta={fretText}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-32 shrink-0"><ChordDiagram shape={box.shape} rootFret={box.rootFret} onPlay={hearChord} active={hearing} /></div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-slate-300">
              <b className="text-slate-100">{box.chordName}</b>, root on the {STRING_SHORT[box.shape.rs]} string{box.rootFret > 0 ? `, fret ${box.rootFret}` : ", open"}
            </p>
            <div><button type="button" className={play} onClick={hearChord}>▶ Chord</button></div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          {panels.map((p) => (
            <div key={p.key} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-slate-100">{p.title}</h3>
                <button type="button" className={`${play} ml-auto`} onClick={p.onPlay} aria-label={`Play the ${p.title}`}>▶ Play</button>
              </div>
              <BoxNeck cells={cells} box={box} layers={p.layers} labelMode={labelMode} badges={badges} onNote={onNote} />
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
