"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VerticalBoard, vGeometry } from "./VerticalFretboard";
import { KeyPicker, ModePicker } from "./KeyPicker";
import { Badge, FretboardBase, fretGeometry } from "./Fretboard";
import { DotLabel } from "./DotLabel";
import { ARP_FRETS, ARP_QUALITIES, arpPositions, arpeggioMidi, stringNumber, buildArpeggio, neckCells, type Arpeggio, type ArpPosition, type NeckCell } from "@/lib/chordKit/arpeggios";
import { FAMILIES, makeKeyContext } from "@/features/theory/theory";
import { MODE_PAGES, degreeColour } from "@/features/theory/scales";
import { strum } from "@/lib/chordKit/playback";
import { againstMajor, fmtDegree, hoverLabel, noteLabel, type LabelSystem } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { LabelsRow } from "@/components/LabelsRow";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { scaleHref } from "@/features/theory/keySlug";
import { Chip, ChipRow, Info, Select } from "@/components/ui";
import { DegreeLegend } from "@/components/theory/DegreeLegend";
import usePhone from "@/components/usePhone";

const KINDS = [
  { id: "triad", label: "Scale triad" },
  { id: "seventh", label: "Scale 7th" },
  { id: "ninth", label: "Scale 9th" },
];
const GEO = fretGeometry(0, ARP_FRETS, 54, 36);
// a phone fits the whole neck on screen: narrower frets, so the dots come out bigger once it is scaled down
const PHONE_GEO = fretGeometry(0, ARP_FRETS, 32, 32);
const OUT = "#f43f5e";

const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th"];
const posName = (p: ArpPosition) => `Root on the ${ORD[stringNumber(p.rootString)]} string${p.rootFret === 0 ? ", open" : p.rootFret === 12 ? ", 12th fret" : ""}`;
const key = (c: NeckCell) => `${c.string}-${c.fret}`;

/** The idea behind the positions: every shape starts on Do, the root, on one string, and climbs the strings above it. */
function RootStringsDiagram() {
  const W = 340, H = 150, left = 34, right = 14, top = 14, gap = 22;
  const y = (s: number) => top + (5 - s) * gap; // high e on top, like the neck above
  const x = (s: number) => left + 26 + (4 - s) * 56;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 380, height: "auto" }} role="img" aria-label="Five positions, each starting on the root on a different string and climbing to the high e string">
      {[0, 1, 2, 3, 4, 5].map((s) => (
        <g key={s}>
          <line x1={left} x2={W - right} y1={y(s)} y2={y(s)} stroke="var(--color-slate-600)" strokeWidth={s < 3 ? 1.6 : 1} />
          <text x={left - 8} y={y(s)} textAnchor="end" dominantBaseline="central" fontSize={10} fill="var(--color-slate-400)">{stringNumber(s)}</text>
        </g>
      ))}
      {[0, 1, 2, 3, 4].map((s) => (
        <g key={s}>
          <line x1={x(s)} x2={x(s)} y1={y(s) - 12} y2={y(5) + 2} stroke="#38bdf8" strokeWidth={1.5} markerEnd="url(#arp-up)" opacity={0.7} />
          <circle cx={x(s)} cy={y(s)} r={10} fill="var(--color-slate-50)" stroke="var(--color-slate-950)" strokeWidth={1.5} />
          <text x={x(s)} y={y(s) + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={8.5} fontWeight={700} fill="#0d1526">Do</text>
          <text x={x(s)} y={H - 6} textAnchor="middle" fontSize={9.5} fill="var(--color-slate-300)">{ORD[stringNumber(s)]}</text>
        </g>
      ))}
      <defs>
        <marker id="arp-up" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#38bdf8" />
        </marker>
      </defs>
    </svg>
  );
}

export function ArpNeck({ cells, arp, overlay, labelSystem, badges, onNote, focus = null }: { cells: NeckCell[]; arp: Arpeggio; overlay: boolean; labelSystem: LabelSystem; badges: boolean; onNote: (c: NeckCell) => void; focus?: ArpPosition | null }) {
  const g = usePhone() ? PHONE_GEO : GEO;
  const labelFor = (c: NeckCell) => noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText, role: c.arp?.role });
  const showBadge = badges && labelSystem === "note";
  const colour = (c: NeckCell) => (c.inScale ? degreeColour(c.scaleDegree as number) : OUT);
  const arpCells = cells.filter((c) => c.arp);
  const ringCells = overlay ? cells.filter((c) => !c.arp && c.inScale) : [];
  // with a position picked, the notes outside it fade
  const inFocus = new Set(focus?.notes.map(key));
  const op = (c: NeckCell) => (focus && !inFocus.has(key(c)) ? 0.25 : 1);

  return (
    <div className="min-w-0">
      <svg viewBox={`0 0 ${g.W} ${g.H}`} width="100%" role="img" aria-label={`${arp.title} on the guitar neck`}>
        <FretboardBase g={g} />
        {focus && (
          <rect
            x={g.fx(focus.from) - 19} y={g.sy(5) - 19} width={g.fx(focus.to) - g.fx(focus.from) + 38} height={g.sy(focus.rootString) - g.sy(5) + 38}
            rx={12} fill="none" stroke="#38bdf8" strokeWidth={2} strokeDasharray="6 4" opacity={0.8}
          />
        )}
        {ringCells.map((c) => {
          const x = g.fx(c.fret), y = g.sy(c.string), col = colour(c);
          const t = labelSystem === "note" ? c.name : noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText });
          return (
            <g key={`${c.string}-${c.fret}`} opacity={op(c) * 0.9} onClick={() => onNote(c)} className="cursor-pointer">
              <circle cx={x} cy={y} r={9} fill="var(--color-slate-950)" stroke={col} strokeWidth={1.6} />
              <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={t.length > 2 ? 7 : 8.5} fontWeight={600} fill={col} pointerEvents="none">{t}</text>
            </g>
          );
        })}
        {arpCells.map((c) => {
          const x = g.fx(c.fret), y = g.sy(c.string), isRoot = c.arp!.role === "R", label = labelFor(c);
          return (
            <g key={`${c.string}-${c.fret}`} opacity={op(c)} onClick={() => onNote(c)} className="group cursor-pointer">
              <circle cx={x} cy={y} r={18} fill="transparent" />
              <circle cx={x} cy={y} r={14} fill={c.inScale ? colour(c) : "#1b0b12"} stroke={isRoot ? "var(--color-slate-50)" : c.inScale ? "var(--color-slate-950)" : OUT} strokeWidth={isRoot ? 2.8 : c.inScale ? 1.5 : 2} strokeDasharray={c.inScale ? undefined : "3.5 2.5"} />
              <DotLabel label={label} hover={hoverLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText })} size={(t) => (t.length > 2 ? 9.5 : 12)} x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontWeight={700} fill={c.inScale ? "#0d1526" : "#fecdd3"} />
            </g>
          );
        })}
        {showBadge && arpCells.map((c) => (
          <g key={`b${c.string}-${c.fret}`} opacity={op(c)}>
            <Badge x={g.fx(c.fret)} y={g.sy(c.string)} r={14} text={fmtDegree(againstMajor(c.degreeText, c.semi))} colour={colour(c)} />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** One position of the arpeggio as a vertical diagram: its notes from the root up, and the scale as small rings behind them. */
function ArpBox({ cells, pos, overlay, labelSystem, badges, onNote, onPlay, on, onPick }: { cells: NeckCell[]; pos: ArpPosition; onPlay: () => void; overlay: boolean; labelSystem: LabelSystem; badges: boolean; onNote: (c: NeckCell) => void; on: boolean; onPick: () => void }) {
  const from = Math.max(0, Math.min(pos.from, pos.to - 3)), to = Math.max(pos.to, from + 3);
  const g = vGeometry(from, to);
  const mine = new Set(pos.notes.map(key));
  const inWin = cells.filter((c) => c.fret >= from && c.fret <= to);
  const colour = (c: NeckCell) => (c.inScale ? degreeColour(c.scaleDegree as number) : OUT);
  const lab = (c: NeckCell) => noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText, role: c.arp?.role });
  const rings = overlay ? inWin.filter((c) => !mine.has(key(c)) && c.inScale && !(c.arp && c.string < pos.rootString)) : [];
  const dots = pos.notes;
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-xl border p-2 transition ${on ? "border-sky-500/70 bg-sky-500/5" : "border-slate-800 bg-slate-950/50"}`}>
      <button type="button" onClick={onPick} aria-pressed={on} className="-m-1 w-[calc(100%+0.5rem)] cursor-pointer rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-100 hover:bg-sky-500/10 hover:text-sky-300" title="Light it up on the neck">
        {posName(pos)}
        <span className="block text-xs font-normal text-slate-300">Do at fret {pos.rootFret} · frets {pos.from}–{pos.to}</span>
        <span className="block text-xs font-normal text-slate-500">{on ? "Tap to clear" : "Tap to show on the neck"}</span>
      </button>
      <svg viewBox={`0 0 ${g.W} ${g.H}`} style={{ width: "100%", maxWidth: 280, height: "auto" }} className="mx-auto" role="img" aria-label={`Arpeggio with the ${posName(pos).toLowerCase()}`}>
        <VerticalBoard g={g} />
        {rings.map((c) => {
          const x = g.sx(c.string), y = g.fy(c.fret), col = colour(c);
          const t = labelSystem === "note" ? c.name : noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText });
          return (
            <g key={`${c.string}-${c.fret}`} opacity={0.9} onClick={() => onNote(c)} className="cursor-pointer">
              <circle cx={x} cy={y} r={9} fill="var(--color-slate-950)" stroke={col} strokeWidth={1.6} />
              <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={t.length > 2 ? 7 : 8.5} fontWeight={600} fill={col} pointerEvents="none">{t}</text>
            </g>
          );
        })}
        {dots.map((c) => {
          const x = g.sx(c.string), y = g.fy(c.fret), isRoot = c.arp!.role === "R", label = lab(c);
          return (
            <g key={`${c.string}-${c.fret}`} onClick={() => onNote(c)} className="group cursor-pointer">
              <circle cx={x} cy={y} r={18} fill="transparent" />
              <circle cx={x} cy={y} r={14} fill={c.inScale ? colour(c) : "#1b0b12"} stroke={isRoot ? "var(--color-slate-50)" : c.inScale ? "var(--color-slate-950)" : OUT} strokeWidth={isRoot ? 2.8 : c.inScale ? 1.5 : 2} strokeDasharray={c.inScale ? undefined : "3.5 2.5"} />
              <DotLabel label={label} hover={hoverLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText })} size={(t) => (t.length > 2 ? 9.5 : 12)} x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontWeight={700} fill={c.inScale ? "#0d1526" : "#fecdd3"} />
            </g>
          );
        })}
        {badges && labelSystem === "note" && dots.map((c) => <Badge key={`b${c.string}-${c.fret}`} x={g.sx(c.string)} y={g.fy(c.fret)} r={14} text={fmtDegree(againstMajor(c.degreeText, c.semi))} colour={colour(c)} />)}
      </svg>
      <button type="button" onClick={onPlay} className="cursor-pointer self-start rounded-full border border-emerald-500 bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-100 hover:bg-emerald-500/25">▶ Play</button>
    </div>
  );
}
/** Arpeggios over any scale or mode: pick the scale, then the arpeggio, and see both on the whole neck. */
export default function ArpeggiosExplorer({ initialTonic = DEFAULT_KEY_PC, initialFamily = 0, initialMode = 0 }: { initialTonic?: number; initialFamily?: number; initialMode?: number } = {}) {
  const [tonicPc, setTonicPc] = useState(initialTonic);
  const [fam, setFam] = useState(initialFamily);
  const [mode, setMode] = useState(initialMode);
  const [degree, setDegree] = useState(0);
  const [kind, setKind] = useState<string>("seventh");
  const [overlay, setOverlay] = useState(true);
  const [labelSystem] = useLabelSystem();
  const [badges, setBadges] = useState(true);
  const [octaves, setOctaves] = useState(1);
  const [focus, setFocus] = useState<string | null>(null);

  const ctx = useMemo(() => makeKeyContext(tonicPc, fam, mode), [tonicPc, fam, mode]);
  const arp = useMemo(() => buildArpeggio(ctx, degree, kind), [ctx, degree, kind]);
  const cells = useMemo(() => neckCells(ctx, arp), [ctx, arp]);
  const positions = useMemo(() => arpPositions(cells), [cells]);
  const focused = positions.find((p) => p.id === focus) ?? null;
  const page = MODE_PAGES.find((m) => m.familyIndex === fam && m.modeIndex === mode);
  const outside = arp.notes.filter((n) => n.outside);

  const playArp = () => strum(arpeggioMidi(arp, octaves), { gapMs: 230, holdMs: 700 });
  const playPosition = (p: ArpPosition) => {
    const up = p.notes.map((n) => n.midi);
    strum([...up, ...up.slice(0, -1).reverse()], { gapMs: 230, holdMs: 700 });
  };
  const playNote = (c: NeckCell) => strum([c.midi], { gapMs: 0, holdMs: 700 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <KeyPicker tonicPc={tonicPc} onTonic={setTonicPc} />
        <ModePicker familyIndex={fam} modeIndex={mode} onChange={(f, m) => { setFam(f); setMode(m); setDegree(0); }} />
        <p className="text-xs text-slate-400">
          Scale: <b className="text-slate-200">{ctx.names[0]} {ctx.modeName}</b> · {ctx.names.join(" ")}
          {page && <> · <Link className="text-sky-300 hover:underline" href={scaleHref(page.slug, tonicPc)}>mode page</Link></>}
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
        <LabelsRow info="Pick how notes are labelled: note names, intervals from the root (R, b3, p5), scale degrees or chord tones. One setting for the whole app. Overlay the scale adds small rings for the other scale notes behind the arpeggio. Badges add the interval on each note-name dot.">
          <Chip on={overlay} onClick={() => setOverlay((v) => !v)}>Overlay the scale</Chip>
          <Chip on={badges} onClick={() => setBadges((v) => !v)}>Degree badges</Chip>
        </LabelsRow>
      </div>

      <section className="bleed rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-medium text-slate-100">{arp.title}</h2>
          <span className="text-xs text-slate-400">
            {arp.notes.map((n) => `${n.name} (${n.role})`).join(" · ")}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              Octaves<Info label="About octaves">How far the played arpeggio climbs. One octave plays the notes up to the next root and back down. Two goes twice as far.</Info>
              <Select size="xs" value={octaves} onChange={setOctaves} aria-label="Octaves" options={[{ value: 1, label: "1" }, { value: 2, label: "2" }]} />
            </span>
            <button type="button" onClick={playArp} className="cursor-pointer rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">▶ Play arpeggio</button>
          </span>
        </div>
        {outside.length > 0 && (
          <p className="mb-2 text-xs text-rose-300">
            {outside.map((n) => n.name).join(", ")} {outside.length === 1 ? "is" : "are"} outside {ctx.names[0]} {ctx.modeName}: a chromatic colour note.
          </p>
        )}
        <ArpNeck cells={cells} arp={arp} overlay={overlay} labelSystem={labelSystem} badges={badges} onNote={playNote} focus={focused} />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <DegreeLegend />
          <Info label="How do I read the neck?">
            Large filled dots are the notes of the arpeggio, and the one with a white ring is its root. Small rings are the other notes of the scale, so you can see where the arpeggio sits inside it. Colour shows the scale degree: 1 white, 2 teal, 3 amber, 4 lime, 5 blue, 6 violet, 7 rose. A dark dot with a dashed red outline is a note outside the scale. Tap any note to hear it.
          </Info>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
        <h2 className="mb-2 text-sm font-medium text-slate-100">
          {arp.title} by position
          <Info label="About positions">Each position starts on the root (Do) on one string and climbs the strings above it, one note at a time, without leaving the hand&apos;s reach. Tap a note to hear it, or Play to hear the position up and back.</Info>
        </h2>
        <div className="mb-3 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 md:flex-row md:items-center">
          <RootStringsDiagram />
          <div className="flex flex-col gap-1.5 text-xs text-slate-300">
            <p>An arpeggio always starts from <b className="text-slate-100">Do</b>, its root. Find Do on one string, then play the chord tones upward across the strings above it until you run out of strings.</p>
            <p>So each position is named by the string Do sits on: <b className="text-slate-100">root on the 6th string</b> starts on the low E and covers all six strings; <b className="text-slate-100">root on the 2nd string</b> starts on the B and has only the top two. Learn where Do is on each string and you can start the arpeggio anywhere on the neck.</p>
            <p className="text-slate-400">Strings are counted from the high e (1st) to the low E (6th).</p>
          </div>
        </div>
        <div className="mb-2 min-h-8">
          {focused ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs text-slate-300"><b className="text-slate-100">{posName(focused)}</b> · frets {focused.from}–{focused.to}</span>
              <button type="button" onClick={() => setFocus(null)} className="ml-1 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-sky-400">
                ✕ Clear position
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Pick a position below to outline it on the neck.</p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {positions.map((p) => <ArpBox key={p.id} cells={cells} pos={p} overlay={overlay} labelSystem={labelSystem} badges={badges} onNote={playNote} onPlay={() => playPosition(p)} on={focus === p.id} onPick={() => setFocus(focus === p.id ? null : p.id)} />)}
        </div>
      </section>
    </div>
  );
}
