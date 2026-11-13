"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarRow, ScaleSettingsBar, WithSettings } from "./ScaleSettings";
import { useHeardNote } from "./heardNote";
import { strum } from "@/lib/chordKit/playback";
import { DYAD_STEPS, diatonicDyads, dyadPairs, type Dyad, type DyadInterval } from "@/lib/chordKit/scaleChords";
import { SCALE_NECK_FRETS, scaleCells, type ScaleCell } from "@/lib/chordKit/scalePositions";
import { DEFAULT_KEY_PC, makeKeyContext, type KeyContext } from "@/features/theory/theory";
import { degreeColour, DOT_INK } from "@/features/theory/scales";
import { hoverLabel, noteLabel } from "@/features/theory/labels";
import { RootSelect, useLabelSystem } from "@/features/theory/useLabelSystem";
import { Chip, Info } from "@/components/ui";

/** the scales offered: major and minor. Other modes of the major scale use the same notes as a major key, so the same double stops */
const MODES = [
  { id: "major", label: "Major", modeIndex: 0 },
  { id: "minor", label: "Minor", modeIndex: 5 },
] as const;
type ModeId = (typeof MODES)[number]["id"];

const INTERVALS: { id: DyadInterval; label: string }[] = [
  { id: 3, label: "3rds" },
  { id: 6, label: "6ths" },
  { id: 4, label: "4ths" },
];

const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
const pairId = ([lo, hi]: [number, number]) => `${6 - lo}${6 - hi}`;
/** the pair a double stop of this interval is played on most: B and e for 3rds, G and e for 6ths, G and B for 4ths */
const defaultPair = (interval: DyadInterval) => (interval === 6 ? "31" : interval === 4 ? "32" : "21");
/** the ring on the note the microphone hears, as on the other necks */
const HEARD = "#38bdf8";

/**
 * The scale's double stops on one pair of strings, low to high along the whole neck: from the lowest one, each next
 * scale note's pair the nearest one above the last, until the neck runs out.
 */
export function dyadLadder(ctx: KeyContext, interval: DyadInterval, strings: [number, number]): Dyad[] {
  const all = diatonicDyads(ctx, interval, strings);
  const start = [...all].sort((a, b) => a.midi[0] - b.midi[0])[0];
  if (!start) return [];
  const out = [start];
  for (;;) {
    const last = out[out.length - 1];
    const next = all.filter((d) => d.degree === (last.degree + 1) % 7 && d.midi[0] > last.midi[0]).sort((a, b) => a.midi[0] - b.midi[0])[0];
    if (!next) return out;
    out.push(next);
  }
}

/**
 * The whole neck lying down, low E at the bottom, with one octave of double stops on it: a line in one colour joins the two notes of each, and the number above it, in the same colour, is the scale note it starts on (1 the root).
 * The two strings played are drawn bright, the rest faint; tap a double stop to hear it.
 */
function OctaveNeck({ ctx, strings, octave, lit, onPlay }: { ctx: KeyContext; strings: [number, number]; octave: Dyad[]; lit: number | null; onPlay: (i: number) => void }) {
  const [system] = useLabelSystem();
  const heard = useHeardNote();
  const cells = useMemo(() => new Map(scaleCells(ctx).map((c) => [`${c.string}-${c.fret}`, c])), [ctx]);
  const fretW = 44, left = 66, top = 42, gap = 28;
  const W = left + (SCALE_NECK_FRETS + 0.5) * fretW, H = top + 5 * gap + 30;
  const fx = (f: number) => (f === 0 ? left - 17 : left + (f - 0.5) * fretW);
  const sy = (s: number) => top + (5 - s) * gap;
  const MARKS = [3, 5, 7, 9, 12, 15, 17];
  const cellOf = (s: number, f: number) => cells.get(`${s}-${f}`) as ScaleCell;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px]" width="100%" role="img" aria-label={`One octave of double stops on the ${STRING_NAMES[strings[0]]} and ${STRING_NAMES[strings[1]]} strings`}>
        {Array.from({ length: SCALE_NECK_FRETS + 1 }, (_, f) => (
          <line key={f} x1={left + f * fretW} x2={left + f * fretW} y1={sy(5)} y2={sy(0)} stroke="var(--color-slate-700)" strokeWidth={f === 0 ? 3 : 1} />
        ))}
        {MARKS.map((f) => <text key={f} x={fx(f)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--color-slate-500)">{f}</text>)}
        {STRING_NAMES.map((name, s) => {
          const played = strings.includes(s);
          return (
            <g key={s}>
              <line x1={left} x2={W} y1={sy(s)} y2={sy(s)} stroke={played ? "var(--color-slate-400)" : "var(--color-slate-700)"} strokeWidth={played ? 1.6 : 1} />
              <text x={4} y={sy(s)} dominantBaseline="central" fontSize={12} fontWeight={played ? 700 : 400} fill={played ? "var(--color-slate-200)" : "var(--color-slate-600)"}>{name}</text>
            </g>
          );
        })}
        {octave.map((d, i) => {
          const on = lit === i;
          const colour = degreeColour(d.degree);
          return (
            <g key={i} role="button" tabIndex={0} aria-label={`${d.degree + 1}: ${cellOf(strings[0], d.frets[0]).name} and ${cellOf(strings[1], d.frets[1]).name}, frets ${d.frets.join(" and ")}`} onClick={() => onPlay(i)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPlay(i)} className="cursor-pointer focus:outline-none">
              {/* one colour per double stop: its starting note's, on the line that joins its two notes and on its number */}
              <line x1={fx(d.frets[0])} x2={fx(d.frets[1])} y1={sy(strings[0])} y2={sy(strings[1])} stroke={on ? "#f8fafc" : colour} strokeWidth={on ? 7 : 5} strokeLinecap="round" opacity={on ? 1 : 0.85} />
              <circle cx={fx(d.frets[1])} cy={sy(5) - 22} r={9} fill={colour} stroke={on ? "#f8fafc" : DOT_INK} strokeWidth={on ? 2.5 : 1} />
              <text x={fx(d.frets[1])} y={sy(5) - 22} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={800} fill={DOT_INK}>{d.degree + 1}</text>
              {([0, 1] as const).map((k) => {
                const c = cellOf(strings[k], d.frets[k]);
                const label = noteLabel(system, { name: c.name, semi: c.semi, degreeText: c.degreeText });
                const ring = heard === c.pc;
                return (
                  <g key={k}>
                    <title>{hoverLabel(system, { name: c.name, semi: c.semi, degreeText: c.degreeText })}</title>
                    <circle cx={fx(d.frets[k])} cy={sy(strings[k])} r={on ? 12.5 : 11} fill={degreeColour(c.degree)} stroke={ring ? HEARD : on ? "#f8fafc" : colour} strokeWidth={ring || on ? 3 : 2.5} />
                    <text x={fx(d.frets[k])} y={sy(strings[k])} textAnchor="middle" dominantBaseline="central" fontSize={label.length > 2 ? 8.5 : 10.5} fontWeight={700} fill={DOT_INK}>{label}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** The double stops page: the key's scale in 3rds, 6ths or 4ths on one pair of strings, one octave from a root picked on the neck. */
export default function DoubleStopsExplorer({ initialTonic = DEFAULT_KEY_PC }: { initialTonic?: number } = {}) {
  const [tonicPc, setTonicPc] = useState(initialTonic);
  const [modeId, setModeId] = useState<ModeId>("major");
  const [interval, setInterval_] = useState<DyadInterval>(3);
  const [pair, setPair] = useState(defaultPair(3));
  // the root the octave starts from, as its fret on the lower string; null: the lowest that fits
  const [rootFret, setRootFret] = useState<number | null>(null);
  // the double stop sounding, by its place in the octave
  const [lit, setLit] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const mode = MODES.find((m) => m.id === modeId)!;
  const ctx = useMemo(() => makeKeyContext(tonicPc, 0, mode.modeIndex), [tonicPc, mode.modeIndex]);
  const strings = dyadPairs(interval).find((p) => pairId(p) === pair) ?? dyadPairs(interval).at(-1)!;
  const ladder = useMemo(() => dyadLadder(ctx, interval, strings), [ctx, interval, strings]);
  // every root on these strings; the octave is 8 double stops in a row with the picked root in it, starting on it where there is room
  const roots = useMemo(() => ladder.flatMap((d, i) => (d.degree === 0 ? [{ i, fret: d.frets[0] }] : [])), [ladder]);
  const root = roots.find((r) => r.fret === rootFret) ?? roots.find((r) => r.i + 7 < ladder.length) ?? roots[0];
  const start = root ? Math.max(0, Math.min(root.i, ladder.length - 8)) : 0;
  const octave = ladder.slice(start, start + 8);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
    setLit(null);
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const sound = (d: Dyad) => strum([...d.midi], { gapMs: 12, holdMs: 700 });
  const tap = (i: number) => {
    stop();
    sound(octave[i]);
    setLit(i);
    timers.current.push(setTimeout(() => setLit((l) => (l === i ? null : l)), 600));
  };
  /** the octave up and back down, one double stop every 600 ms */
  const run = () => {
    stop();
    const seq = [...octave.keys(), ...[...octave.keys()].reverse().slice(1)];
    setRunning(true);
    seq.forEach((i, k) => timers.current.push(setTimeout(() => { sound(octave[i]); setLit(i); }, k * 600)));
    timers.current.push(setTimeout(() => { setRunning(false); setLit(null); }, seq.length * 600));
  };

  const pickInterval = (iv: DyadInterval) => {
    stop();
    setInterval_(iv);
    setPair(defaultPair(iv));
    setRootFret(null);
  };
  const ivLabel = INTERVALS.find((x) => x.id === interval)!.label;
  const keyName = `${ctx.names[0]} ${mode.label.toLowerCase()}`;
  const lower = STRING_NAMES[strings[0]];

  const criteria = <>
    <BarRow label="Interval" info="Each double stop is two notes of the scale. In 3rds the top note is two scale notes up, on the next string. 6ths are the same two notes turned upside down, so they skip a string. 4ths are three scale notes up.">
      {INTERVALS.map((x) => <Chip key={x.id} on={x.id === interval} onClick={() => pickInterval(x.id)}>{x.label}</Chip>)}
    </BarRow>
    <BarRow label="Strings" info="The two strings the double stops are played on. 6ths have one string between their two notes: let a finger of your fretting hand rest on it so it stays quiet.">
      {dyadPairs(interval).slice().reverse().map((p) => (
        <Chip key={pairId(p)} on={pairId(p) === pairId(strings)} onClick={() => { stop(); setPair(pairId(p)); setRootFret(null); }}>{`${STRING_NAMES[p[0]]} ${STRING_NAMES[p[1]]}`}</Chip>
      ))}
    </BarRow>
    {roots.length > 0 && (
      <BarRow label="Root at" info={`Where the root sits on the ${lower} string. The double stops shown are the eight around it, starting on it where the neck has room.`}>
        {roots.map((r) => <Chip key={r.fret} on={r.fret === root?.fret} onClick={() => { stop(); setRootFret(r.fret); }}>{r.fret === 0 ? "Open" : `Fret ${r.fret}`}</Chip>)}
      </BarRow>
    )}
  </>;
  const picker = <>{MODES.map((m) => <Chip key={m.id} on={m.id === modeId} onClick={() => { stop(); setModeId(m.id); setRootFret(null); }}>{m.label}</Chip>)}</>;

  return (
    <WithSettings side criteria={criteria} bar={
      <ScaleSettingsBar tonicPc={tonicPc} onTonic={(pc) => { stop(); setTonicPc(pc); setRootFret(null); }} side config={{
        scale: { picker, name: mode.label.toLowerCase() },
        labels: { extra: <RootSelect /> },
      }} />
    }>
      <p className="px-1 text-xs text-slate-400">
        Showing <b className="text-slate-200">{keyName}</b> in {ivLabel}: {DYAD_STEPS[interval]} scale notes apart, played together.
        <Info label="Why do the shapes change?">
          The scale decides how big each {ivLabel.slice(0, -1)} is. In 3rds, some pairs are a major 3rd (4 frets apart on one string) and some a minor 3rd (3 frets), so the shape changes as you go up. Follow the scale, not one shape.
        </Info>
      </p>

      <section data-tour="double-stops-ladder" className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-100">Up the scale</h3>
          {octave.length > 0 && <button type="button" onClick={() => (running ? stop() : run())} title="Plays the octave up and back down" className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500">{running ? "■ Stop" : "▶ Play"}</button>}
        </div>
        <p className="mb-3 text-xs text-slate-400">One octave of {keyName} on the {lower} and {STRING_NAMES[strings[1]]} strings, around the root. A coloured line joins the two notes of each double stop; the number above it, in the same colour, is the scale note it starts on. Tap one to hear it.</p>
        {octave.length
          ? <OctaveNeck ctx={ctx} strings={strings} octave={octave} lit={lit} onPlay={tap} />
          : <p className="text-xs text-slate-500">No {ivLabel} of this scale fit on these strings within 4 frets.</p>}
      </section>
    </WithSettings>
  );
}
