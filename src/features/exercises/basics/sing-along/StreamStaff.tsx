"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import ClefGlyph from "@/components/theory/singing/ClefGlyph";
import { DOT_LAG_MS, Note } from "@/components/theory/singing/MelodyStaff";
import { place, signatureGlyphs, type Clef } from "@/features/theory/piano/staff";
import { degreeColour } from "@/features/theory/scales";
import { solfege } from "@/features/theory/labels";
import { locate, type Ladder } from "@/features/theory/singing";
import { BEATS_PER_BAR } from "@/features/theory/singingMelody";
import { restBeats, type PlacedNote } from "@/features/theory/singingMelodies";
import type { MelodyChord } from "@/features/theory/melodyChords";
import type { Frame } from "./useSingAlong";
import { DOT, PLAYED, camera, inView, judge } from "./view";

const HALF = 5; // px per staff step
const BEAT_W = 56;
const BEAT_W_16TH = 72;
const PAD = 14;
const LABELS_H = 36;
const CHORDS_H = 22;
/** how long the fading tail behind the voice dot is */
const TAIL_MS = 380;

const ink = { line: "var(--color-slate-500)", glyph: "var(--color-slate-300)", name: "var(--color-slate-200)", degree: "var(--color-slate-400)" };

/**
 * The tune on one endless staff: its passes (the loop, or the whole tune) written one after another, sliding under the
 * bar, the passes gone by dropped. The clef and key stay at the left.
 * The voice is a dot with a short fading tail, read off the scale's ladder so it sits on a notehead when in tune.
 */
export default function StreamStaff({ frame, notes, chords, ladder, clef, beatMs, tapped, onNote, scale = 1, cents, lagMs }: {
  frame: Frame;
  notes: PlacedNote[];
  chords: MelodyChord[];
  ladder: Ladder;
  clef: Clef;
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
  const clip = `stream-staff-${useId().replace(/[^\w-]/g, "")}`;
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const placed = notes.map((n) => place(n.spelled, ladder.signature, clef));
  const steps = placed.map((p) => p.step);
  const rungs = ladder.notes.map((n) => n.midi);
  const rungSteps = ladder.notes.map((n) => place(n.spelled, ladder.signature, clef).step);
  const top = Math.max(8, ...steps.map((s) => s + (s < 4 ? 7 : 0))) + 3;
  const bottom = Math.min(0, ...steps.map((s) => s - (s >= 4 ? 7 : 0))) - 3;
  const chordsH = chords.length ? CHORDS_H : 0;
  const yOf = (step: number) => chordsH + 6 + (top - step) * HALF;
  const labelsY = yOf(bottom) + 8;
  const H = labelsY + LABELS_H;
  const total = notes.length ? notes[notes.length - 1].at + notes[notes.length - 1].beats : BEATS_PER_BAR;
  const sig = signatureGlyphs(ladder.signature, clef);
  const timeX = 56 + sig.length * 9 + 10;
  const x0 = timeX + 14;
  const W = width / scale;
  const beatW = notes.some((n) => n.beats < 0.5) ? BEAT_W_16TH : BEAT_W;
  const span = Math.max(1, (W - x0 - 12) / beatW);
  const left = camera(frame.s, span);
  const bx = (s: number) => x0 + (s - left) * beatW + PAD;
  const passes = inView(frame.passes, left - 1, left + span + 1);
  const rests = restBeats(notes, total);
  const j = judge(frame, notes, beatMs, cents, lagMs);
  const lag = (lagMs ?? DOT_LAG_MS) / beatMs;
  const colour = DOT[j.fit];
  const tailBeats = TAIL_MS / beatMs;
  const tail = frame.trail.filter((p) => p.s > frame.s - tailBeats);
  const stepOf = (m: number) => locate(rungs, rungSteps, m).step;

  return (
    <div ref={wrap} className="w-full" style={{ minHeight: H * scale }}>
      {W > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width={width} height={H * scale} role="img" aria-label={`A melody in ${ladder.title}: ${notes.map((n) => solfege(n.label)).join(" ")}`}>
          <defs>
            <clipPath id={clip}>
              <rect x={x0 - 4} y={0} width={W - x0 + 4} height={H} />
            </clipPath>
          </defs>
          <g stroke={ink.line} strokeWidth={1}>
            {[0, 2, 4, 6, 8].map((s) => <line key={s} x1={8} x2={W - 4} y1={yOf(s)} y2={yOf(s)} />)}
            <line x1={8} x2={8} y1={yOf(8)} y2={yOf(0)} strokeWidth={1.5} />
          </g>
          <g fill={ink.glyph} textAnchor="middle">
            <ClefGlyph clef={clef} yOf={yOf} />
            {sig.map((g, i) => <text key={i} x={56 + i * 9} y={yOf(g.step) + 6} fontSize={20}>{g.glyph}</text>)}
            <text x={timeX} y={yOf(6) + 7} fontSize={19} fontWeight={700}>4</text>
            <text x={timeX} y={yOf(2) + 7} fontSize={19} fontWeight={700}>4</text>
          </g>
          <g clipPath={`url(#${clip})`}>
            {passes.map((p) => {
              const at = (b: number) => p.start + b - p.from;
              const barX = (b: number) => bx(at(b)) - Math.min(12, beatW * 0.35);
              const bars = [];
              for (let b = Math.ceil(p.from / BEATS_PER_BAR) * BEATS_PER_BAR; b < p.to; b += BEATS_PER_BAR) if (b > p.from) bars.push(b);
              return (
                <g key={p.start}>
                  {/* where a pass starts: the loop's seam */}
                  <line x1={barX(p.from)} x2={barX(p.from)} y1={yOf(8) - 6} y2={yOf(0) + 6} stroke={PLAYED} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="3 3" />
                  {bars.map((b) => <line key={b} x1={barX(b)} x2={barX(b)} y1={yOf(8)} y2={yOf(0)} stroke={ink.line} />)}
                  {rests.filter((b) => b >= p.from && b < p.to).map((b) => {
                    const x = bx(at(b));
                    const y = yOf(4);
                    return <path key={`r${b}`} d={`M ${x + 2} ${y - 13} l -6 7 l 6 6 l -6 7 c -4 -2 -7 2 -2 6`} fill="none" stroke={ink.glyph} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />;
                  })}
                  {p.chords.map((c) => {
                    const ch = chords[c.i];
                    const on = j.pass === p && frame.s >= p.start + c.at && frame.s < p.start + c.at + c.beats;
                    return <text key={`c${c.i}`} x={bx(p.start + c.at) - 6} y={chordsH - 4} fontSize={15} fontWeight={700} fill={on ? PLAYED : ink.name}>{ch.name}</text>;
                  })}
                  {p.notes.map((c) => {
                    const n = notes[c.i];
                    const x = bx(p.start + c.at);
                    if (x + c.beats * beatW < x0 - 40 || x > W + 40) return null;
                    const on = (j.pass === p && j.due === c.i) || tapped === c.i;
                    const lit = on && j.hit;
                    const col = degreeColour(n.degree);
                    const bold = on ? 700 : 400;
                    return (
                      <g key={`n${c.i}`} role="button" aria-label={`Play ${n.spelled.name}`} className="cursor-pointer" onClick={() => onNote(c.i)}>
                        <rect x={x - PAD + 2} y={0} width={Math.max(18, c.beats * beatW - 4)} height={H} rx={6} fill={on ? PLAYED : "transparent"} fillOpacity={on ? 0.1 : 0} />
                        <Note p={placed[c.i]} x={x} y={yOf(placed[c.i].step)} beats={c.beats} colour={col} yOf={yOf} />
                        {lit && <circle cx={x} cy={yOf(placed[c.i].step)} r={12} fill={col} fillOpacity={0.18} stroke={col} strokeOpacity={0.7} />}
                        <text x={x} y={labelsY + 12} textAnchor="middle" fontSize={11} fontWeight={bold} fill={on ? PLAYED : ink.name}>{n.spelled.name}</text>
                        <text x={x} y={labelsY + 27} textAnchor="middle" fontSize={11} fontWeight={bold} fill={lit ? col : on ? PLAYED : ink.degree}>{solfege(n.label)}</text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
            <line x1={bx(frame.s)} x2={bx(frame.s)} y1={yOf(8) - 8} y2={yOf(0) + 8} stroke={PLAYED} strokeOpacity={0.6} strokeWidth={2} pointerEvents="none" />
            <g pointerEvents="none">
              {tail.map((p, i) => {
                const q = tail[i - 1];
                if (!q || p.midi === null || q.midi === null) return null;
                const age = 1 - (frame.s - p.s) / tailBeats;
                return <line key={p.s} x1={bx(q.s - lag)} y1={yOf(stepOf(q.midi))} x2={bx(p.s - lag)} y2={yOf(stepOf(p.midi))} stroke={colour} strokeWidth={1 + 8 * age} strokeOpacity={0.55 * age} strokeLinecap="round" />;
              })}
              {frame.midi !== null && (
                <>
                  <circle cx={bx(j.dotS)} cy={yOf(stepOf(frame.midi))} r={13} fill={colour} fillOpacity={0.18} />
                  <circle cx={bx(j.dotS)} cy={yOf(stepOf(frame.midi))} r={7} fill={colour} />
                </>
              )}
            </g>
          </g>
        </svg>
      )}
    </div>
  );
}
