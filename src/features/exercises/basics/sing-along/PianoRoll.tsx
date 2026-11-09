"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { DOT_LAG_MS } from "@/components/theory/singing/MelodyStaff";
import { midiToName } from "@/features/sound";
import { degreeColour } from "@/features/theory/scales";
import { solfege } from "@/features/theory/labels";
import type { Ladder } from "@/features/theory/singing";
import { BEATS_PER_BAR } from "@/features/theory/singingMelody";
import type { PlacedNote } from "@/features/theory/singingMelodies";
import type { MelodyChord } from "@/features/theory/melodyChords";
import { PassStart } from "./PassStart";
import type { Frame } from "./useSingAlong";
import { DOT, PLAYED, camera, inView, judge } from "./view";

const BEAT_W = 56;
const BEAT_W_16TH = 72;
const ROW_H = 12;
/** semitones of room above and below the tune */
const ROOM = 3;
const GUTTER = 44;
const CHORDS_H = 20;

/**
 * The tune as a DAW's piano roll: a row a semitone (the scale's rows lighter, named in the gutter), each note a bar as
 * long as it lasts, its passes sliding under the bar like the staff's. The voice leaves a thin line for as long as it
 * is in view, so the whole way the pitch went is there to read; the line drops off with the passes gone by. The chords'
 * names run in a strip under the rows, each from the beat it starts on.
 */
export default function PianoRoll({ frame, notes, chords, ladder, beatMs, tapped, onNote, scale = 1, cents, lagMs }: {
  frame: Frame;
  notes: PlacedNote[];
  chords: MelodyChord[];
  ladder: Ladder;
  beatMs: number;
  tapped: number | null;
  onNote: (i: number) => void;
  /** drawn this many times bigger (full screen) */
  scale?: number;
  /** within this many cents counts as on the note (the app's default when left out) */
  cents?: number;
  /** how far the voice dot runs behind the bar */
  lagMs?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const clip = `roll-${useId().replace(/[^\w-]/g, "")}`;
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const midis = notes.map((n) => n.midi);
  const lo = Math.min(...midis) - ROOM;
  const hi = Math.max(...midis) + ROOM;
  const chordsH = chords.length ? CHORDS_H : 0;
  const yOf = (m: number) => (hi - Math.max(lo - 0.5, Math.min(hi + 0.5, m)) + 0.5) * ROW_H;
  // the rows end here; the chords' names run in a strip under them
  const rollH = (hi - lo + 1) * ROW_H + 1;
  const H = rollH + chordsH;
  const W = width / scale;
  const beatW = notes.some((n) => n.beats < 0.5) ? BEAT_W_16TH : BEAT_W;
  const span = Math.max(1, (W - GUTTER) / beatW);
  const left = camera(frame.s, span);
  const bx = (s: number) => GUTTER + (s - left) * beatW;
  const passes = inView(frame.passes, left - 1, left + span + 1);
  const j = judge(frame, notes, beatMs, cents, lagMs);
  const lag = (lagMs ?? DOT_LAG_MS) / beatMs;
  const colour = DOT[j.fit];
  const inScale = new Map(ladder.notes.map((n) => [((n.midi % 12) + 12) % 12, n]));
  const rows = Array.from({ length: hi - lo + 1 }, (_, k) => hi - k);

  // the voice's line, broken where it went quiet, kept to what is in view
  let d = "";
  let pen = false;
  for (const p of frame.trail) {
    const x = bx(p.s - lag);
    if (p.midi === null || x < GUTTER - 20) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${x.toFixed(1)} ${yOf(p.midi).toFixed(1)}`;
    pen = true;
  }

  return (
    <div ref={wrap} className="w-full" style={{ minHeight: H * scale }}>
      {W > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width={width} height={H * scale} role="img" aria-label={`A piano roll of a melody in ${ladder.title}`}>
          <defs>
            <clipPath id={clip}>
              <rect x={GUTTER} y={0} width={W - GUTTER} height={H} />
            </clipPath>
          </defs>
          {rows.map((m) => {
            const scaleNote = inScale.get(((m % 12) + 12) % 12);
            const y = yOf(m) - ROW_H / 2;
            return (
              <g key={m}>
                <rect x={GUTTER} y={y} width={W - GUTTER} height={ROW_H} fill={scaleNote ? "var(--color-slate-800)" : "var(--color-slate-900)"} fillOpacity={scaleNote ? 0.7 : 0.9} />
                <line x1={GUTTER} x2={W} y1={y + ROW_H} y2={y + ROW_H} stroke="var(--color-slate-800)" strokeWidth={0.5} />
                {scaleNote && (
                  <text x={GUTTER - 4} y={y + ROW_H - 2.5} textAnchor="end" fontSize={9} fill={scaleNote.label === "R" ? "var(--color-slate-200)" : "var(--color-slate-500)"} fontWeight={scaleNote.label === "R" ? 700 : 400}>
                    {solfege(scaleNote.label)} {midiToName(m)}
                  </text>
                )}
              </g>
            );
          })}
          <g clipPath={`url(#${clip})`}>
            {passes.map((p) => {
              const at = (b: number) => p.start + b - p.from;
              const beats = [];
              for (let b = Math.ceil(p.from); b < p.to; b++) beats.push(b);
              return (
                <g key={p.start}>
                  {beats.map((b) => (
                    <line key={b} x1={bx(at(b))} x2={bx(at(b))} y1={0} y2={rollH} stroke="var(--color-slate-600)" strokeOpacity={b % BEATS_PER_BAR === 0 ? 0.7 : 0.25} />
                  ))}
                  <PassStart x={bx(p.start)} y1={0} y2={H} room={14} colour={PLAYED} />
                  {p.chords.map((c) => {
                    const on = j.pass === p && frame.s >= p.start + c.at && frame.s < p.start + c.at + c.beats;
                    return <text key={`c${c.i}`} x={bx(p.start + c.at) + 3} y={rollH + chordsH - 5} fontSize={13} fontWeight={700} fill={on ? PLAYED : "var(--color-slate-200)"}>{chords[c.i].name}</text>;
                  })}
                  {p.notes.map((c) => {
                    const n = notes[c.i];
                    const x = bx(p.start + c.at);
                    const w = Math.max(4, c.beats * beatW - 2);
                    if (x + w < GUTTER || x > W) return null;
                    const on = (j.pass === p && j.due === c.i) || tapped === c.i;
                    const col = degreeColour(n.degree);
                    return (
                      <g key={`n${c.i}`} role="button" aria-label={`Play ${n.spelled.name}`} className="cursor-pointer" onClick={() => onNote(c.i)}>
                        <rect x={x + 1} y={yOf(n.midi) - ROW_H / 2 + 1} width={w} height={ROW_H - 2} rx={3} fill={col} fillOpacity={on ? 0.95 : 0.55} stroke={on ? (j.hit ? DOT.in : "white") : "none"} strokeWidth={1.5} />
                        {w > 24 && <text x={x + 5} y={yOf(n.midi) + 3.5} fontSize={9} fontWeight={700} fill="var(--color-slate-950)">{solfege(n.label)}</text>}
                      </g>
                    );
                  })}
                </g>
              );
            })}
            <line x1={bx(frame.s)} x2={bx(frame.s)} y1={0} y2={H} stroke={PLAYED} strokeOpacity={0.7} strokeWidth={2} pointerEvents="none" />
            <path d={d} fill="none" stroke="var(--color-slate-100)" strokeOpacity={0.85} strokeWidth={1.25} strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />
            {frame.midi !== null && (
              <g pointerEvents="none">
                <circle cx={bx(j.dotS)} cy={yOf(frame.midi)} r={9} fill={colour} fillOpacity={0.2} />
                <circle cx={bx(j.dotS)} cy={yOf(frame.midi)} r={4.5} fill={colour} />
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
