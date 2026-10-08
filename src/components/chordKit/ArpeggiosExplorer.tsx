"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { KeyPicker, ModePicker } from "./KeyPicker";
import { Badge, FretboardBase, fretGeometry } from "./Fretboard";
import { Chip, ChipRow, DegreeLegend, Info } from "./ui";
import { ARP_FRETS, ARP_QUALITIES, WINDOWS, arpeggioMidi, buildArpeggio, neckCells, type Arpeggio, type NeckCell } from "@/lib/chordKit/arpeggios";
import { FAMILIES, makeKeyContext } from "@/lib/chordKit/theory";
import { MODE_PAGES, degreeColour } from "@/lib/chordKit/scales";
import { strum } from "@/lib/chordKit/playback";

type LabelMode = "name" | "degree" | "role";
const KINDS = [
  { id: "triad", label: "Scale triad" },
  { id: "seventh", label: "Scale 7th" },
  { id: "ninth", label: "Scale 9th" },
];
const GEO = fretGeometry(0, ARP_FRETS, 54, 36);
const OUT = "#f43f5e";

export function ArpNeck({ cells, arp, overlay, labelMode, badges, window: win, onNote }: { cells: NeckCell[]; arp: Arpeggio; overlay: boolean; labelMode: LabelMode; badges: boolean; window: { from: number; to: number }; onNote: (c: NeckCell) => void }) {
  const g = GEO;
  const labelFor = (c: NeckCell) => (labelMode === "name" ? c.name : labelMode === "degree" ? c.degreeText : c.arp?.role ?? c.degreeText);
  const showBadge = badges && labelMode !== "degree";
  const isWindow = win.from > 0 || win.to < ARP_FRETS;
  const colour = (c: NeckCell) => (c.inScale ? degreeColour(c.scaleDegree as number) : OUT);
  const arpCells = cells.filter((c) => c.arp);
  const ringCells = overlay ? cells.filter((c) => !c.arp && c.inScale) : [];
  const op = (c: NeckCell) => (c.fret >= win.from && c.fret <= win.to ? 1 : 0.14);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${g.W} ${g.H}`} width="100%" style={{ minWidth: 820 }} role="img" aria-label={`${arp.title} on the guitar neck`}>
        <FretboardBase g={g} />
        {isWindow && (
          <rect x={g.left + win.from * g.colW + 1} y={g.sy(5) - 22} width={(win.to - win.from + 1) * g.colW - 2} height={g.sy(0) - g.sy(5) + 44} rx={10} fill="#38bdf8" opacity={0.07} stroke="#38bdf8" strokeOpacity={0.5} strokeDasharray="5 4" pointerEvents="none" />
        )}
        {ringCells.map((c) => {
          const x = g.fx(c.fret), y = g.sy(c.string), col = colour(c);
          const t = labelMode === "degree" ? c.degreeText : labelMode === "name" ? c.name : c.degreeText;
          return (
            <g key={`${c.string}-${c.fret}`} opacity={op(c) * 0.9} onClick={() => onNote(c)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r={9} fill="#0d1526" stroke={col} strokeWidth={1.6} />
              <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={t.length > 2 ? 7 : 8.5} fontWeight={600} fill={col} pointerEvents="none">{t}</text>
            </g>
          );
        })}
        {arpCells.map((c) => {
          const x = g.fx(c.fret), y = g.sy(c.string), isRoot = c.arp!.role === "R", label = labelFor(c);
          return (
            <g key={`${c.string}-${c.fret}`} opacity={op(c)} onClick={() => onNote(c)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r={14} fill={c.inScale ? colour(c) : "#1b0b12"} stroke={isRoot ? "#ffffff" : c.inScale ? "#0d1526" : OUT} strokeWidth={isRoot ? 2.8 : c.inScale ? 1.5 : 2} strokeDasharray={c.inScale ? undefined : "3.5 2.5"} />
              <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={label.length > 2 ? 9.5 : 12} fontWeight={700} fill={c.inScale ? "#0b1220" : "#fecdd3"} pointerEvents="none">{label}</text>
            </g>
          );
        })}
        {showBadge && arpCells.map((c) => (
          <g key={`b${c.string}-${c.fret}`} opacity={op(c)}>
            <Badge x={g.fx(c.fret)} y={g.sy(c.string)} r={14} text={c.degreeText} colour={colour(c)} />
          </g>
        ))}
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
  const [badges, setBadges] = useState(true);
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
        <ChipRow label="Arpeggio type" info="The first three buttons use the chord the scale itself builds on that note: a triad (3 notes), a 7th chord (4) or a 9th chord (5), with every note inside the scale. The rest ignore the scale and put any chord type you choose on the same root. For example, a D major arpeggio over C major, where D is the 2nd note and the scale would give you D minor. Notes that are not in the scale get a dashed red outline, so you can see which notes fit and which clash.">
          {KINDS.map((k) => <Chip key={k.id} on={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</Chip>)}
          <span className="mx-1 h-4 w-px bg-slate-700" aria-hidden />
          {ARP_QUALITIES.map((q) => <Chip key={q.id} on={kind === q.id} onClick={() => setKind(q.id)}>{q.label}</Chip>)}
        </ChipRow>
        <ChipRow label="Position" info="Narrows the neck to a window of frets so you can learn one area at a time. Notes outside the window fade out. Whole neck shows everything.">
          {WINDOWS.map((w) => <Chip key={w.id} on={winId === w.id} onClick={() => setWinId(w.id)}>{w.label}</Chip>)}
        </ChipRow>
        <ChipRow label="Labels" info="Note names show A, B♭ and so on. Scale degrees show each note's number in the key (1, ♭3, 5). Chord tones show its job in the arpeggio: R for root, 3, 5, 7. Overlay the scale adds small rings for the other scale notes behind the arpeggio.">
          <Chip on={labelMode === "name"} onClick={() => setLabelMode("name")}>Note names</Chip>
          <Chip on={labelMode === "degree"} onClick={() => setLabelMode("degree")}>Scale degrees</Chip>
          <Chip on={labelMode === "role"} onClick={() => setLabelMode("role")}>Chord tones</Chip>
          <Chip on={overlay} onClick={() => setOverlay((v) => !v)}>Overlay the scale</Chip>
          <Chip on={badges} onClick={() => setBadges((v) => !v)}>Degree badges</Chip>
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
        <ArpNeck cells={cells} arp={arp} overlay={overlay} labelMode={labelMode} badges={badges} window={win} onNote={playNote} />
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
