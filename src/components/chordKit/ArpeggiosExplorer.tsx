"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { KeyPicker, ModePicker } from "./KeyPicker";
import { Chip, ChipRow, DegreeLegend, Info } from "./ui";
import { ARP_FRETS, ARP_QUALITIES, WINDOWS, arpeggioMidi, buildArpeggio, neckCells, type Arpeggio, type NeckCell } from "@/lib/chordKit/arpeggios";
import { FAMILIES, makeKeyContext } from "@/lib/chordKit/theory";
import { MODE_PAGES, degreeColour } from "@/lib/chordKit/scales";
import { strum } from "@/lib/chordKit/playback";

type LabelMode = "name" | "degree" | "role";
const KINDS = [
  { id: "triad", label: "Scale's triad" },
  { id: "seventh", label: "Scale's 7th chord" },
  { id: "ninth", label: "Scale's 9th chord" },
];
const colW = 52, left = 40, top = 30, rowH = 30;

function ArpNeck({ cells, arp, overlay, labelMode, window: win, onNote }: { cells: NeckCell[]; arp: Arpeggio; overlay: boolean; labelMode: LabelMode; window: { from: number; to: number }; onNote: (c: NeckCell) => void }) {
  const W = left + (ARP_FRETS + 1) * colW + 10;
  const H = top + 5 * rowH + 44;
  const fx = (f: number) => left + f * colW + colW / 2;
  const sy = (s: number) => top + (5 - s) * rowH;
  const grid = "#475569";
  const labelFor = (c: NeckCell) => (labelMode === "name" ? c.name : labelMode === "degree" ? c.degreeText : c.arp?.role ?? c.degreeText);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 760 }} role="img" aria-label={`${arp.title} on the guitar neck`}>
        {[3, 5, 7, 9, 15, 17].map((f) => <circle key={f} cx={fx(f)} cy={(sy(2) + sy(3)) / 2} r={5} fill="#1e293b" />)}
        <circle cx={fx(12)} cy={(sy(1) + sy(2)) / 2} r={5} fill="#1e293b" />
        <circle cx={fx(12)} cy={(sy(3) + sy(4)) / 2} r={5} fill="#1e293b" />
        {Array.from({ length: ARP_FRETS + 2 }, (_, f) => (
          <line key={f} x1={left + f * colW} x2={left + f * colW} y1={sy(5) - 8} y2={sy(0) + 8} stroke={grid} strokeWidth={f === 1 ? 3 : 1} />
        ))}
        {Array.from({ length: 6 }, (_, s) => <line key={s} x1={left} x2={left + (ARP_FRETS + 1) * colW} y1={sy(s)} y2={sy(s)} stroke={grid} strokeWidth={1 + (5 - s) * 0.12} />)}
        {Array.from({ length: ARP_FRETS + 1 }, (_, f) => (
          <text key={f} x={fx(f)} y={sy(0) + 28} textAnchor="middle" fontSize={11} fill="#94a3b8">{f === 0 ? "open" : f}</text>
        ))}
        {cells.map((c) => {
          const inWin = c.fret >= win.from && c.fret <= win.to;
          const op = inWin ? 1 : 0.12;
          const x = fx(c.fret), y = sy(c.string);
          if (c.arp) {
            const isRoot = c.arp.role === "R";
            const fill = c.inScale ? degreeColour(c.scaleDegree as number) : "#0f172a";
            return (
              <g key={`${c.string}-${c.fret}`} opacity={op} onClick={() => onNote(c)} style={{ cursor: "pointer" }}>
                <circle cx={x} cy={y} r={13} fill={fill} stroke={isRoot ? "#ffffff" : c.inScale ? "#0f172a" : "#f43f5e"} strokeWidth={isRoot ? 3 : 2} strokeDasharray={c.inScale ? undefined : "3 2"} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={labelFor(c).length > 2 ? 9 : 11} fontWeight={700} fill={c.inScale ? "#0f172a" : "#f8fafc"} pointerEvents="none">{labelFor(c)}</text>
              </g>
            );
          }
          if (overlay && c.inScale) {
            return (
              <g key={`${c.string}-${c.fret}`} opacity={op * 0.75} onClick={() => onNote(c)} style={{ cursor: "pointer" }}>
                <circle cx={x} cy={y} r={8} fill="none" stroke={degreeColour(c.scaleDegree as number)} strokeWidth={2} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={degreeColour(c.scaleDegree as number)} pointerEvents="none">{labelMode === "degree" ? c.degreeText : labelMode === "name" ? c.name : c.degreeText}</text>
              </g>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

/** Arpeggios over any scale or mode: pick the scale, then the arpeggio, and see both on the whole neck. */
export default function ArpeggiosExplorer() {
  const [tonicPc, setTonicPc] = useState(0);
  const [fam, setFam] = useState(0);
  const [mode, setMode] = useState(0);
  const [degree, setDegree] = useState(0);
  const [kind, setKind] = useState<string>("seventh");
  const [overlay, setOverlay] = useState(true);
  const [labelMode, setLabelMode] = useState<LabelMode>("name");
  const [winId, setWinId] = useState("all");
  const [octaves, setOctaves] = useState(1);

  const ctx = useMemo(() => makeKeyContext(tonicPc, fam, mode), [tonicPc, fam, mode]);
  const arp = useMemo(() => buildArpeggio(ctx, degree, kind), [ctx, degree, kind]);
  const cells = useMemo(() => neckCells(ctx, arp), [ctx, arp]);
  const win = WINDOWS.find((w) => w.id === winId) ?? WINDOWS[0];
  const page = MODE_PAGES.find((m) => m.familyIndex === fam && m.modeIndex === mode);
  const outside = arp.notes.filter((n) => n.outside);

  const playArp = () => strum(arpeggioMidi(arp, octaves), { gapMs: 230, holdMs: 700 });
  const playNote = (c: NeckCell) => strum([c.midi], { gapMs: 0, holdMs: 700 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <KeyPicker tonicPc={tonicPc} onTonic={setTonicPc} />
        <ModePicker familyIndex={fam} modeIndex={mode} onChange={(f, m) => { setFam(f); setMode(m); setDegree(0); }} />
        <p className="text-xs text-slate-400">
          Scale: <b className="text-slate-200">{ctx.names[0]} {ctx.modeName}</b> · {ctx.names.join(" ")}
          {page && <> · <Link className="text-sky-300 hover:underline" href={`/scales/${page.slug}?key=${tonicPc}`}>mode page</Link></>}
        </p>

        <ChipRow label="Arpeggio on" info="Which note of the scale the arpeggio starts on, shown as a Roman numeral and the note name. An arpeggio is a chord played one note at a time.">
          {ctx.chords.map((c) => (
            <Chip key={c.degree} on={degree === c.degree} onClick={() => setDegree(c.degree)}>{c.roman} <span className="text-slate-400">{ctx.names[c.degree]}</span></Chip>
          ))}
        </ChipRow>
        <ChipRow label="Type" info="Uses the chord the scale itself builds on that note: a triad (3 notes), a 7th chord (4 notes) or a 9th chord (5 notes). Every note stays inside the scale.">
          {KINDS.map((k) => <Chip key={k.id} on={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</Chip>)}
        </ChipRow>
        <ChipRow label="Or force">
          {ARP_QUALITIES.map((q) => <Chip key={q.id} on={kind === q.id} onClick={() => setKind(q.id)}>{q.label}</Chip>)}
          <Info label="What does forcing a type do?">
            By default the arpeggio is the chord the scale itself builds on that note. Forcing a type lays any other arpeggio on the same root, for example a major arpeggio on the 4th note of a minor scale. Notes that are not in the scale get a dashed red outline.
          </Info>
        </ChipRow>
        <ChipRow label="Position" info="Narrows the neck to a window of frets so you can learn one area at a time. Notes outside the window fade out. Whole neck shows everything.">
          {WINDOWS.map((w) => <Chip key={w.id} on={winId === w.id} onClick={() => setWinId(w.id)}>{w.label}</Chip>)}
        </ChipRow>
        <ChipRow label="Labels" info="Note names show A, B♭ and so on. Scale degrees show each note's number in the key (1, ♭3, 5). Chord tones show its job in the arpeggio: R for root, 3, 5, 7. Overlay the scale adds small rings for the other scale notes behind the arpeggio.">
          <Chip on={labelMode === "name"} onClick={() => setLabelMode("name")}>Note names</Chip>
          <Chip on={labelMode === "degree"} onClick={() => setLabelMode("degree")}>Scale degrees</Chip>
          <Chip on={labelMode === "role"} onClick={() => setLabelMode("role")}>Chord tones</Chip>
          <Chip on={overlay} onClick={() => setOverlay((v) => !v)}>Overlay the scale</Chip>
        </ChipRow>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-medium text-slate-100">{arp.title}</h2>
          <span className="text-xs text-slate-400">
            {arp.notes.map((n) => `${n.name} (${n.role})`).join(" · ")}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              Octaves<Info label="About octaves">How far the played arpeggio climbs. One octave plays the notes up to the next root and back down. Two goes twice as far.</Info>
              <select value={octaves} onChange={(e) => setOctaves(Number(e.target.value))} className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200">
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </label>
            <button type="button" onClick={playArp} className="rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">▶ Play arpeggio</button>
          </span>
        </div>
        {outside.length > 0 && (
          <p className="mb-2 text-xs text-rose-300">
            {outside.map((n) => n.name).join(", ")} {outside.length === 1 ? "is" : "are"} outside {ctx.names[0]} {ctx.modeName}: a chromatic colour note.
          </p>
        )}
        <ArpNeck cells={cells} arp={arp} overlay={overlay} labelMode={labelMode} window={win} onNote={playNote} />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <DegreeLegend />
          <Info label="How do I read the neck?">
            Large filled dots are the notes of the arpeggio, and the one with a white ring is its root. Small rings are the other notes of the scale, so you can see where the arpeggio sits inside it. Colour shows the scale degree: 1 white, 2 teal, 3 amber, 4 lime, 5 blue, 6 violet, 7 rose. A dark dot with a dashed red outline is a note outside the scale. Tap any note to hear it.
          </Info>
        </div>
      </section>
    </div>
  );
}
