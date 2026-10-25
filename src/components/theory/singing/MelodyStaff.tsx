"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { place, signatureGlyphs, type Clef, type Placed } from "@/features/theory/piano/staff";
import { degreeColour } from "@/features/theory/scales";
import { solfege } from "@/features/theory/labels";
import { IN_TUNE_CENTS, locate, type Fit, type Ladder, type LadderNote } from "@/features/theory/singing";
import { BEATS_PER_BAR } from "@/features/theory/singingMelody";

/**
 * A melody on one staff in 4/4, written out with its rhythm (eighths, quarters, halves, dotted notes, the whole-note
 * Do), spaced by time, and a dot for the voice. The dot rides up and down with the pitch (placed against the scale's
 * ladder, so it sits on a notehead when in tune) and along with the beat: from `playFrom` (when the melody's first beat
 * sounds, `performance.now()` time) while it plays, or from the moment you start singing when it doesn't, at `beatMs`
 * a beat. It is green on the note due now, red on another note, amber between notes. The note due now is lit in sky.
 * Every note is a button (`onNote`); `tapped` is one just tapped. A long melody on a phone slides with the beat.
 */

export interface StaffNote extends LadderNote {
  beats: number;
  at: number;
}

const HALF = 5; // px per staff step
const MIN_BEAT = 44; // px a beat before the staff has to scroll (an eighth gets half)
const MAX_BEAT = 72;
const PAD = 14; // from a beat's start to its notehead
const STEM = 34;
const LABELS_H = 36;
const TAIL_MS = 380;
const SILENCE_MS = 220;

const ink = {
  line: "var(--color-slate-500)",
  glyph: "var(--color-slate-300)",
  name: "var(--color-slate-200)",
  degree: "var(--color-slate-400)",
};
const PLAYED = "var(--color-sky-300)";
const DOT: Record<Fit, string> = { in: "var(--color-emerald-400)", out: "var(--color-rose-400)", between: "var(--color-amber-300)" };

interface Point { x: number; step: number; t: number }
interface View { dot: Point | null; cam: number; tail: Point[]; lastHeard: number; now: number; fit: Fit; beat: number | null; hit: boolean }
const STILL: View = { dot: null, cam: 0, tail: [], lastHeard: -Infinity, now: 0, fit: "between", beat: null, hit: false };

/** The note sounding at a beat, or -1 before the first. */
const noteAt = (notes: StaffNote[], beat: number) => notes.findLastIndex((n) => n.at <= beat);

export default function MelodyStaff({ notes, ladder, clef, pitch, playFrom, beatMs, tapped, onNote }: {
  notes: StaffNote[];
  /** the scale in the singer's range, low to high: the dot's height is read off it */
  ladder: Ladder;
  clef: Clef;
  pitch: RefObject<number | null>;
  playFrom: number | null;
  beatMs: number;
  tapped: number | null;
  onNote: (i: number) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
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
  const yOf = (step: number) => 6 + (top - step) * HALF;
  const labelsY = yOf(bottom) + 8;
  const H = labelsY + LABELS_H;

  const total = notes.length ? notes[notes.length - 1].at + notes[notes.length - 1].beats : BEATS_PER_BAR;
  const sig = signatureGlyphs(ladder.signature, clef);
  const timeX = 56 + sig.length * 9 + 10;
  const x0 = timeX + 14;
  const room = width - x0 - 12;
  const fits = room / total >= MIN_BEAT;
  const beatW = fits ? Math.min(MAX_BEAT, room / total) : MIN_BEAT;
  const span = total * beatW;
  const maxCam = Math.max(0, span - room);

  const anim = useRef<View>({ ...STILL });
  // the clock the dot moves on: the playback's, or one started by the voice
  const clock = useRef<number | null>(null);
  const playRef = useRef(playFrom);
  useEffect(() => {
    playRef.current = playFrom;
    clock.current = playFrom;
  }, [playFrom]);
  const [a, setView] = useState<View>(STILL);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = anim.current;
      const now = performance.now();
      a.now = now;
      const m = pitch.current;
      const fresh = m !== null && now - a.lastHeard > SILENCE_MS;
      // a voice starting after silence starts the melody's clock when nothing plays and the last run is over
      if (fresh && playRef.current === null && clock.current === null) clock.current = now;
      const beat = clock.current === null ? null : (now - clock.current) / beatMs;
      if (beat !== null && beat > total + 0.5) {
        clock.current = null;
        a.beat = null;
      } else a.beat = beat;
      const x = a.beat === null ? total : Math.max(0, Math.min(total, a.beat));
      if (m !== null) {
        const at = locate(rungs, rungSteps, m);
        a.dot = fresh || !a.dot ? { x, step: at.step, t: now } : { x, step: a.dot.step + (at.step - a.dot.step) * 0.35, t: now };
        if (fresh) a.tail = [];
        a.tail.push(a.dot);
        a.lastHeard = now;
        const due = notes[Math.max(0, noteAt(notes, x))];
        const off = Math.abs(m - (due?.midi ?? m)) * 100;
        a.hit = off <= IN_TUNE_CENTS;
        a.fit = a.hit ? "in" : Math.abs(m - Math.round(m)) * 100 <= IN_TUNE_CENTS ? "out" : "between";
      } else if (now - a.lastHeard > SILENCE_MS) a.hit = false;
      a.tail = a.tail.filter((p) => now - p.t < TAIL_MS);
      if (maxCam > 0 && a.beat !== null) {
        const want = Math.max(0, Math.min(maxCam, x * beatW - room / 2));
        a.cam += (want - a.cam) * 0.1;
      } else if (maxCam === 0) a.cam = 0;
      else a.cam = Math.min(a.cam, maxCam);
      setView({ ...a, tail: [...a.tail] });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // the geometry is rebuilt from the melody and the width; the loop restarts with it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, ladder, clef, beatW, maxCam, room, beatMs]);

  // a new melody starts at the left, with no clock
  useEffect(() => {
    anim.current.cam = 0;
    anim.current.dot = null;
    anim.current.tail = [];
    if (playRef.current === null) clock.current = null;
  }, [notes, clef]);

  const now = a.now;
  const bx = (beat: number) => x0 + beat * beatW + PAD - a.cam;
  const showDot = a.dot && now - a.lastHeard <= SILENCE_MS + 400;
  const dotOpacity = a.dot ? Math.max(0, Math.min(1, 1 - (now - a.lastHeard - SILENCE_MS) / 400)) : 0;
  const colour = DOT[a.fit];
  const due = a.beat === null ? -1 : noteAt(notes, a.beat);
  const clip = `melody-clip-${clef}`;
  const bars = Math.round(total / BEATS_PER_BAR);

  return (
    <div ref={wrap} className="w-full">
      {width > 0 && (
        <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={`A melody in ${ladder.title}: ${notes.map((n) => solfege(n.label)).join(" ")}`}>
          <defs>
            <clipPath id={clip}>
              <rect x={x0 - 4} y={0} width={width - x0 + 4} height={H} />
            </clipPath>
          </defs>
          <g stroke={ink.line} strokeWidth={1}>
            {[0, 2, 4, 6, 8].map((s) => <line key={s} x1={8} x2={width - 4} y1={yOf(s)} y2={yOf(s)} />)}
            <line x1={8} x2={8} y1={yOf(8)} y2={yOf(0)} strokeWidth={1.5} />
          </g>
          <g fill={ink.glyph} textAnchor="middle">
            {clef === "treble" ? <text x={30} y={yOf(1) + 5} fontSize={62}>𝄞</text> : <text x={30} y={yOf(6) + 12} fontSize={42}>𝄢</text>}
            {sig.map((g, i) => <text key={i} x={56 + i * 9} y={yOf(g.step) + 6} fontSize={20}>{g.glyph}</text>)}
            <text x={timeX} y={yOf(6) + 7} fontSize={19} fontWeight={700}>4</text>
            <text x={timeX} y={yOf(2) + 7} fontSize={19} fontWeight={700}>4</text>
          </g>
          <g clipPath={`url(#${clip})`}>
            <g stroke={ink.line}>
              {Array.from({ length: bars - 1 }, (_, b) => {
                const x = bx((b + 1) * BEATS_PER_BAR) - Math.min(12, beatW * 0.35);
                return <line key={b} x1={x} x2={x} y1={yOf(8)} y2={yOf(0)} />;
              })}
              {/* the final double bar */}
              <line x1={bx(total) - PAD + 2} x2={bx(total) - PAD + 2} y1={yOf(8)} y2={yOf(0)} />
              <line x1={bx(total) - PAD + 6} x2={bx(total) - PAD + 6} y1={yOf(8)} y2={yOf(0)} strokeWidth={3} />
            </g>
            {notes.map((n, i) => {
              const x = bx(n.at);
              if (x < x0 - 40 || x > width + 40) return null;
              const on = due === i || tapped === i;
              const lit = on && a.hit && !!showDot;
              const c = degreeColour(n.degree);
              const bold = on ? 700 : 400;
              return (
                <g key={i} role="button" aria-label={`Play ${n.spelled.name}`} className="cursor-pointer" onClick={() => onNote(i)}>
                  <rect x={x - PAD + 2} y={0} width={Math.max(18, n.beats * beatW - 4)} height={H} rx={6} fill={on ? PLAYED : "transparent"} fillOpacity={on ? 0.1 : 0} />
                  <Note p={placed[i]} x={x} y={yOf(placed[i].step)} beats={n.beats} colour={c} yOf={yOf} />
                  {lit && <circle cx={x} cy={yOf(placed[i].step)} r={12} fill={c} fillOpacity={0.18} stroke={c} strokeOpacity={0.7} />}
                  <text x={x} y={labelsY + 12} textAnchor="middle" fontSize={11} fontWeight={bold} fill={on ? PLAYED : ink.name}>{n.spelled.name}</text>
                  <text x={x} y={labelsY + 27} textAnchor="middle" fontSize={11} fontWeight={bold} fill={lit ? c : on ? PLAYED : ink.degree}>{solfege(n.label)}</text>
                </g>
              );
            })}
            {showDot && (
              <g opacity={dotOpacity} pointerEvents="none">
                {a.tail.map((p, i) => {
                  if (i === 0) return null;
                  const q = a.tail[i - 1];
                  const age = 1 - (now - p.t) / TAIL_MS;
                  return <line key={p.t} x1={bx(q.x)} y1={yOf(q.step)} x2={bx(p.x)} y2={yOf(p.step)} stroke={colour} strokeWidth={1 + 8 * age} strokeOpacity={0.55 * age} strokeLinecap="round" />;
                })}
                <circle cx={bx(a.dot!.x)} cy={yOf(a.dot!.step)} r={13} fill={colour} fillOpacity={0.18} />
                <circle cx={bx(a.dot!.x)} cy={yOf(a.dot!.step)} r={7} fill={colour} />
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}

/** One note with its rhythm: a hollow head from a half up, a stem under a whole, a flag on an eighth, a dot when dotted. */
function Note({ p, x, y, beats, colour, yOf }: { p: Placed; x: number; y: number; beats: number; colour: string; yOf: (s: number) => number }) {
  const hollow = beats >= 2;
  const up = p.step < 4;
  const sx = up ? x + 6 : x - 6;
  const ey = up ? y - STEM : y + STEM;
  const dotted = beats === 1.5 || beats === 3;
  return (
    <>
      {p.ledgers.map((l) => <line key={l} x1={x - 11} x2={x + 11} y1={yOf(l)} y2={yOf(l)} stroke={ink.line} />)}
      {p.accidental && <text x={x - 10} y={y + 5} textAnchor="end" fontSize={15} fill={ink.glyph}>{p.accidental}</text>}
      <ellipse cx={x} cy={y} rx={6.5} ry={5} fill={hollow ? "transparent" : colour} stroke={colour} strokeWidth={hollow ? 2.2 : 0} transform={`rotate(-20 ${x} ${y})`} />
      {beats < 4 && <line x1={sx} x2={sx} y1={y} y2={ey} stroke={colour} strokeWidth={1.5} />}
      {beats <= 0.5 && (
        <path
          d={up ? `M ${sx} ${ey} c 1 7 10 9 8 20` : `M ${sx} ${ey} c 1 -7 10 -9 8 -20`}
          fill="none"
          stroke={colour}
          strokeWidth={2}
        />
      )}
      {dotted && <circle cx={x + 11} cy={p.step % 2 === 0 ? y - HALF : y} r={2} fill={colour} />}
    </>
  );
}
