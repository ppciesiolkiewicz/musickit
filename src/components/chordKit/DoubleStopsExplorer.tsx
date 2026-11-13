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

/** the scales offered: the major scale's modes a double stop is most often played in */
const MODES = [
  { id: "major", label: "Major", modeIndex: 0 },
  { id: "minor", label: "Minor", modeIndex: 5 },
  { id: "dorian", label: "Dorian", modeIndex: 1 },
  { id: "mixolydian", label: "Mixolydian", modeIndex: 4 },
] as const;
type ModeId = (typeof MODES)[number]["id"];

const INTERVALS: { id: DyadInterval; label: string }[] = [
  { id: 3, label: "3rds" },
  { id: 6, label: "6ths" },
  { id: 4, label: "4ths" },
];

const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
const pairId = ([lo, hi]: [number, number]) => `${6 - lo}${6 - hi}`;
/** the two highest pairs: where double stops are played most */
const defaultPairs = (interval: DyadInterval) => dyadPairs(interval).slice(-2).map(pairId);
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

/** A pair of strings drawn lying down, low string at the bottom, with its ladder of double stops; tap one to hear it. */
function PairNeck({ ctx, strings, ladder, lit, onPlay }: { ctx: KeyContext; strings: [number, number]; ladder: Dyad[]; lit: number | null; onPlay: (i: number) => void }) {
  const [system] = useLabelSystem();
  const heard = useHeardNote();
  const cells = useMemo(() => new Map(scaleCells(ctx).map((c) => [`${c.string}-${c.fret}`, c])), [ctx]);
  const [lo, hi] = strings;
  const rows = hi - lo; // 1, or 2 when a string is skipped
  const fretW = 44, left = 46, top = 16, gap = 30;
  const W = left + (SCALE_NECK_FRETS + 0.5) * fretW, H = top * 2 + rows * gap + 14;
  const fx = (f: number) => (f === 0 ? left - 17 : left + (f - 0.5) * fretW);
  const sy = (s: number) => top + (hi - s) * gap;
  const MARKS = [3, 5, 7, 9, 12, 15, 17];
  const cellOf = (s: number, f: number) => cells.get(`${s}-${f}`) as ScaleCell;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px]" width="100%" role="img" aria-label={`Double stops on the ${STRING_NAMES[lo]} and ${STRING_NAMES[hi]} strings`}>
        {Array.from({ length: SCALE_NECK_FRETS + 1 }, (_, f) => (
          <line key={f} x1={left + f * fretW} x2={left + f * fretW} y1={top} y2={top + rows * gap} stroke="var(--color-slate-600)" strokeWidth={f === 0 ? 3 : 1} />
        ))}
        {MARKS.map((f) => <text key={f} x={fx(f)} y={H - 4} textAnchor="middle" fontSize={11} fill="var(--color-slate-500)">{f}</text>)}
        {Array.from({ length: rows + 1 }, (_, i) => {
          const s = lo + i;
          const played = s === lo || s === hi;
          return (
            <g key={s}>
              <line x1={left} x2={W} y1={sy(s)} y2={sy(s)} stroke="var(--color-slate-500)" strokeWidth={played ? 1.4 : 0.6} strokeDasharray={played ? undefined : "3 4"} />
              <text x={4} y={sy(s)} dominantBaseline="central" fontSize={12} fill={played ? "var(--color-slate-300)" : "var(--color-slate-600)"}>{STRING_NAMES[s]}</text>
            </g>
          );
        })}
        {ladder.map((d, i) => {
          const on = lit === i;
          return (
            <g key={i} role="button" tabIndex={0} aria-label={`${cellOf(lo, d.frets[0]).name} and ${cellOf(hi, d.frets[1]).name}, frets ${d.frets.join(" and ")}`} onClick={() => onPlay(i)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPlay(i)} className="cursor-pointer focus:outline-none">
              <line x1={fx(d.frets[0])} x2={fx(d.frets[1])} y1={sy(lo)} y2={sy(hi)} stroke={on ? "#f8fafc" : "var(--color-slate-500)"} strokeWidth={on ? 3 : 2} />
              {([0, 1] as const).map((k) => {
                const c = cellOf(strings[k], d.frets[k]);
                const label = noteLabel(system, { name: c.name, semi: c.semi, degreeText: c.degreeText });
                const ring = heard === c.pc;
                return (
                  <g key={k}>
                    <title>{hoverLabel(system, { name: c.name, semi: c.semi, degreeText: c.degreeText })}</title>
                    <circle cx={fx(d.frets[k])} cy={sy(strings[k])} r={on ? 13 : 11.5} fill={degreeColour(c.degree)} stroke={ring ? HEARD : on ? "#f8fafc" : DOT_INK} strokeWidth={ring || on ? 3 : 1.5} />
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

/** The double stops page: the key's scale in 3rds, 6ths or 4ths, as a ladder up the neck on each chosen pair of strings. */
export default function DoubleStopsExplorer({ initialTonic = DEFAULT_KEY_PC }: { initialTonic?: number } = {}) {
  const [tonicPc, setTonicPc] = useState(initialTonic);
  const [modeId, setModeId] = useState<ModeId>("major");
  const [interval, setInterval_] = useState<DyadInterval>(3);
  const [pairIds, setPairIds] = useState<string[]>(defaultPairs(3));
  // what is sounding: a pair's id and the index of the stop on its ladder
  const [lit, setLit] = useState<{ pair: string; i: number } | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const mode = MODES.find((m) => m.id === modeId)!;
  const ctx = useMemo(() => makeKeyContext(tonicPc, 0, mode.modeIndex), [tonicPc, mode.modeIndex]);
  const ladders = useMemo(() => dyadPairs(interval).filter((p) => pairIds.includes(pairId(p))).reverse()
    .map((p) => ({ id: pairId(p), strings: p, ladder: dyadLadder(ctx, interval, p) })), [ctx, interval, pairIds]);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(null);
    setLit(null);
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const sound = (d: Dyad) => strum([...d.midi], { gapMs: 12, holdMs: 700 });
  const tap = (pair: string, d: Dyad, i: number) => {
    stop();
    sound(d);
    setLit({ pair, i });
    timers.current.push(setTimeout(() => setLit((l) => (l?.pair === pair && l.i === i ? null : l)), 600));
  };
  /** an octave from the lowest root up and back down, one pair every 600 ms */
  const run = (pair: string, ladder: Dyad[]) => {
    stop();
    const from = Math.max(0, ladder.findIndex((d) => d.degree === 0));
    const up = ladder.map((d, i) => ({ d, i })).slice(from, from + 8);
    const seq = [...up, ...up.slice(0, -1).reverse()];
    setRunning(pair);
    seq.forEach(({ d, i }, k) => timers.current.push(setTimeout(() => { sound(d); setLit({ pair, i }); }, k * 600)));
    timers.current.push(setTimeout(() => { setRunning(null); setLit(null); }, seq.length * 600));
  };

  const pickInterval = (iv: DyadInterval) => {
    stop();
    setInterval_(iv);
    setPairIds(defaultPairs(iv));
  };
  const togglePair = (id: string) => setPairIds((s) => (s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id]));
  const ivLabel = INTERVALS.find((x) => x.id === interval)!.label;
  const keyName = `${ctx.names[0]} ${mode.label.toLowerCase()}`;

  const criteria = <>
    <BarRow label="Interval" info="Each double stop is two notes of the scale. In 3rds the top note is two scale notes up, on the next string. 6ths are the same two notes turned upside down, so they skip a string. 4ths are three scale notes up.">
      {INTERVALS.map((x) => <Chip key={x.id} on={x.id === interval} onClick={() => pickInterval(x.id)}>{x.label}</Chip>)}
    </BarRow>
    <BarRow label="Strings" info="The two strings the double stops are played on. Pick several to compare. 6ths have one string between their two notes: let a finger of your fretting hand rest on it so it stays quiet.">
      {dyadPairs(interval).slice().reverse().map((p) => (
        <Chip key={pairId(p)} on={pairIds.includes(pairId(p))} onClick={() => togglePair(pairId(p))}>{`Strings ${pairId(p).split("").join("-")} (${STRING_NAMES[p[0]]} ${STRING_NAMES[p[1]]})`}</Chip>
      ))}
    </BarRow>
  </>;
  const picker = <>{MODES.map((m) => <Chip key={m.id} on={m.id === modeId} onClick={() => { stop(); setModeId(m.id); }}>{m.label}</Chip>)}</>;

  return (
    <WithSettings side criteria={criteria} bar={
      <ScaleSettingsBar tonicPc={tonicPc} onTonic={(pc) => { stop(); setTonicPc(pc); }} side config={{
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
        <h3 className="mb-1 text-sm font-medium text-slate-100">Up the scale</h3>
        <p className="mb-3 text-xs text-slate-400">One double stop for each note of {keyName}, low to high, on each pair of strings. Tap one to hear it.</p>
        <div className="flex flex-col gap-5">
          {ladders.map(({ id, strings, ladder }) => (
            <div key={id}>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                <span>Strings {id.split("").join("-")}</span>
                <span className="rounded-md border border-slate-700 bg-slate-950/60 px-1.5 py-px font-mono text-[10px] font-medium normal-case tracking-normal text-slate-400">{STRING_NAMES[strings[0]]} {STRING_NAMES[strings[1]]}</span>
                <button type="button" onClick={() => (running === id ? stop() : run(id, ladder))} title="Plays an octave from the lowest root, up and back down" className="rounded border border-slate-700 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-slate-300 hover:border-slate-500">{running === id ? "■ Stop" : "▶ Play"}</button>
                <span aria-hidden className="h-px flex-1 bg-slate-800" />
              </div>
              {ladder.length
                ? <PairNeck ctx={ctx} strings={strings} ladder={ladder} lit={lit?.pair === id ? lit.i : null} onPlay={(i) => tap(id, ladder[i], i)} />
                : <p className="text-xs text-slate-500">No {ivLabel} of this scale fit on these strings within 4 frets.</p>}
            </div>
          ))}
        </div>
      </section>
    </WithSettings>
  );
}
