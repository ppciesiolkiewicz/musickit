"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { place, signatureGlyphs, type Clef, type Placed } from "@/features/theory/piano/staff";
import ClefGlyph from "./ClefGlyph";
import { degreeColour } from "@/features/theory/scales";
import { solfege } from "@/features/theory/labels";
import { IN_TUNE_CENTS, locate, type Fit, type Ladder } from "@/features/theory/singing";
import { BEATS_PER_BAR } from "@/features/theory/singingMelody";
import type { PlacedNote } from "@/features/theory/singingMelodies";

/**
 * A melody on one staff in 4/4, written out with its rhythm (eighths, quarters, halves, dotted notes, the whole-note
 * Do), spaced by time, and a dot for the voice. The dot rides up and down with the pitch (placed against the scale's
 * ladder, so it sits on a notehead when in tune) and along with a bar that always runs, looping the melody at `beatMs`
 * a beat on the metronome's count while it runs (`gridBeats`: the tune's beat 1 on the click's), from `playFrom` (when
 * the melody's first beat sounds) when it is played without one, else on its own. The dot trails the bar by `DOT_LAG_MS`, so
 * a note is heard before it is sung against: green on the note under it, red on another note, amber between notes, and the
 * note under the bar is lit in sky.
 * Every note is a button (`onNote`); `tapped` is one just tapped. A long melody on a phone slides with the bar.
 * The last half bar is drawn again, faded, before the first: the bar crosses into it halfway through the last bar (on the
 * held final Do), so the loop back to the start is a short hop instead of a jump across the whole staff.
 * Only a `live` staff (the one being sung) runs the dot; the others are drawn still, scrolling sideways when too long.
 * Full screen draws it `scale` times bigger and to `follow` the bar: a couple of bars across, sliding with it, and a line
 * from the dot to the note due with how far off it is in cents.
 */

type StaffNote = PlacedNote;

const HALF = 5; // px per staff step
const MIN_BEAT = 44; // px a beat before the staff has to scroll (an eighth gets half)
const MAX_BEAT = 72;
const PAD = 14; // from a beat's start to its notehead
const STEM = 34;
const LABELS_H = 36;
const TAIL_MS = 380;
const SILENCE_MS = 220;
/** the voice dot runs this far behind the bar, so a note is heard before it is sung against */
const DOT_LAG_MS = 250;
/** beats of the end drawn again before the first bar */
const LEAD = BEATS_PER_BAR / 2;
const GHOST_OPACITY = 0.45;
/** beats across a staff that follows the bar */
const FOLLOW_BEATS = 7;

const ink = {
  line: "var(--color-slate-500)",
  glyph: "var(--color-slate-300)",
  name: "var(--color-slate-200)",
  degree: "var(--color-slate-400)",
};
const PLAYED = "var(--color-sky-300)";
const DOT: Record<Fit, string> = { in: "var(--color-emerald-400)", out: "var(--color-rose-400)", between: "var(--color-amber-300)" };

interface Point { x: number; step: number; t: number }
interface View { dot: Point | null; cam: number; tail: Point[]; lastHeard: number; now: number; fit: Fit; beat: number | null; hit: boolean; cents: number; target: number }
const STILL: View = { dot: null, cam: 0, tail: [], lastHeard: -Infinity, now: 0, fit: "between", beat: null, hit: false, cents: 0, target: -1 };

/** The note sounding at a beat, or -1 before the first. */
const noteAt = (notes: StaffNote[], beat: number) => notes.findLastIndex((n) => n.at <= beat);

export default function MelodyStaff({ notes, ladder, clef, live, pitch, playFrom, beatMs, gridBeats, tapped, onNote, scale = 1, follow = false }: {
  notes: StaffNote[];
  live: boolean;
  /** the scale in the singer's range, low to high: the dot's height is read off it */
  ladder: Ladder;
  clef: Clef;
  pitch: RefObject<number | null>;
  playFrom: number | null;
  beatMs: number;
  /** beats since the metronome's beat 1, or null when it isn't running */
  gridBeats: () => number | null;
  tapped: number | null;
  onNote: (i: number) => void;
  /** drawn this many times bigger */
  scale?: number;
  /** a few bars across, sliding with the bar, with the dot's distance to the note due */
  follow?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const clip = `melody-clip-${useId().replace(/[^\w-]/g, "")}`;
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width / scale)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale]);

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
  const fits = room / (total + LEAD) >= MIN_BEAT;
  const beatW = follow ? Math.max(MIN_BEAT, room / FOLLOW_BEATS) : fits ? Math.min(MAX_BEAT, room / (total + LEAD)) : MIN_BEAT;
  const span = (total + LEAD) * beatW;
  // a beat of the loop as drawn: its last half bar sits before the first bar
  const shown = (beat: number) => (beat >= total - LEAD ? beat - total : beat);
  // the notes sounding in the last half bar, cut to it, as they are drawn again in front
  const ghosts = notes.flatMap((n, i) => {
    const end = n.at + n.beats;
    if (end <= total - LEAD) return [];
    const from = Math.max(n.at, total - LEAD);
    return [{ i, at: from - total, beats: end - from }];
  });
  const maxCam = Math.max(0, span - room);
  const scrolls = !live && maxCam > 0;
  const W = scrolls ? x0 + span + 12 : width;

  const anim = useRef<View>({ ...STILL });
  // when the bar was last at the melody's start: set by a playback, kept on the metronome's beat
  const anchor = useRef(0);
  const beatAt = useRef(gridBeats);
  useEffect(() => {
    beatAt.current = gridBeats;
  }, [gridBeats]);
  useEffect(() => {
    if (playFrom !== null) anchor.current = playFrom;
  }, [playFrom]);
  const [view, setView] = useState<View>(STILL);
  // a still staff draws no voice, whatever the last live frame was
  const a = live ? view : STILL;
  useEffect(() => {
    if (!live) {
      anim.current = { ...STILL };
      return;
    }
    let raf = 0;
    const tick = () => {
      const a = anim.current;
      const now = performance.now();
      a.now = now;
      const m = pitch.current;
      const fresh = m !== null && now - a.lastHeard > SILENCE_MS;
      // the bar rides the metronome's count while it runs (beat 1 of the tune on its beat 1), and goes on from there when it stops
      const grid = beatAt.current();
      if (grid !== null) anchor.current = now - grid * beatMs;
      const run = (now - anchor.current) / beatMs;
      const beat = ((run % total) + total) % total;
      a.beat = shown(beat);
      const loopX = (((run - DOT_LAG_MS / beatMs) % total) + total) % total;
      const x = shown(loopX);
      // a new pass starts the tail afresh
      if (a.dot && x < a.dot.x - total / 2) a.tail = [];
      if (m !== null) {
        const at = locate(rungs, rungSteps, m);
        a.dot = fresh || !a.dot ? { x, step: at.step, t: now } : { x, step: a.dot.step + (at.step - a.dot.step) * 0.35, t: now };
        if (fresh) a.tail = [];
        a.tail.push(a.dot);
        a.lastHeard = now;
        a.target = Math.max(0, noteAt(notes, loopX));
        const due = notes[a.target];
        a.cents = (m - (due?.midi ?? m)) * 100;
        const off = Math.abs(a.cents);
        a.hit = off <= IN_TUNE_CENTS;
        a.fit = a.hit ? "in" : Math.abs(m - Math.round(m)) * 100 <= IN_TUNE_CENTS ? "out" : "between";
      } else if (now - a.lastHeard > SILENCE_MS) a.hit = false;
      a.tail = a.tail.filter((p) => now - p.t < TAIL_MS);
      if (maxCam > 0 && a.beat !== null) {
        const want = Math.max(0, Math.min(maxCam, (x + LEAD) * beatW - room / 2));
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
  }, [live, notes, ladder, clef, beatW, maxCam, room, beatMs]);

  // a new melody starts at the left, its bar from the top
  useEffect(() => {
    anim.current.cam = 0;
    anim.current.dot = null;
    anim.current.tail = [];
    anim.current.beat = null;
    anchor.current = performance.now();
  }, [notes, clef]);

  const now = a.now;
  const bx = (beat: number) => x0 + (beat + LEAD) * beatW + PAD - a.cam;
  // the staff stops at the final double bar when the whole tune fits
  const lineEnd = maxCam > 0 && !scrolls ? W - 4 : Math.min(W - 4, bx(total) - PAD + 7);
  const showDot = a.dot && now - a.lastHeard <= SILENCE_MS + 400;
  const dotOpacity = a.dot ? Math.max(0, Math.min(1, 1 - (now - a.lastHeard - SILENCE_MS) / 400)) : 0;
  const colour = DOT[a.fit];
  // the bar in the faded half bar lights the copy there, not the note it repeats
  const inGhost = a.beat !== null && a.beat < 0;
  const due = a.beat === null ? -1 : noteAt(notes, a.beat < 0 ? a.beat + total : a.beat);
  const bars = Math.round(total / BEATS_PER_BAR);

  const drawNote = (i: number, at: number, beats: number, ghost: boolean) => {
    const n = notes[i];
    const x = bx(at);
    if (x < x0 - 40 || x > W + 40) return null;
    const on = (due === i && inGhost === ghost) || (tapped === i && !ghost);
    const lit = on && a.hit && !!showDot;
    const c = degreeColour(n.degree);
    const bold = on ? 700 : 400;
    return (
      <g key={ghost ? `ghost-${i}` : i} role="button" aria-label={`Play ${n.spelled.name}`} className="cursor-pointer" opacity={ghost && !on ? GHOST_OPACITY : 1} onClick={() => onNote(i)}>
        <rect x={x - PAD + 2} y={0} width={Math.max(18, beats * beatW - 4)} height={H} rx={6} fill={on ? PLAYED : "transparent"} fillOpacity={on ? 0.1 : 0} />
        <Note p={placed[i]} x={x} y={yOf(placed[i].step)} beats={beats} colour={c} yOf={yOf} />
        {lit && <circle cx={x} cy={yOf(placed[i].step)} r={12} fill={c} fillOpacity={0.18} stroke={c} strokeOpacity={0.7} />}
        <text x={x} y={labelsY + 12} textAnchor="middle" fontSize={11} fontWeight={bold} fill={on ? PLAYED : ink.name}>{n.spelled.name}</text>
        <text x={x} y={labelsY + 27} textAnchor="middle" fontSize={11} fontWeight={bold} fill={lit ? c : on ? PLAYED : ink.degree}>{solfege(n.label)}</text>
      </g>
    );
  };

  return (
    // the height is known before the width, so the list doesn't shift as staffs measure themselves
    <div ref={wrap} className={`w-full ${scrolls ? "overflow-x-auto" : ""}`} style={{ minHeight: H * scale }}>
      {width > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width={W * scale} height={H * scale} role="img" aria-label={`A melody in ${ladder.title}: ${notes.map((n) => solfege(n.label)).join(" ")}`}>
          <defs>
            <clipPath id={clip}>
              <rect x={x0 - 4} y={0} width={W - x0 + 4} height={H} />
            </clipPath>
          </defs>
          <g stroke={ink.line} strokeWidth={1}>
            {[0, 2, 4, 6, 8].map((s) => <line key={s} x1={8} x2={lineEnd} y1={yOf(s)} y2={yOf(s)} />)}
            <line x1={8} x2={8} y1={yOf(8)} y2={yOf(0)} strokeWidth={1.5} />
          </g>
          <g fill={ink.glyph} textAnchor="middle">
            <ClefGlyph clef={clef} yOf={yOf} />
            {sig.map((g, i) => <text key={i} x={56 + i * 9} y={yOf(g.step) + 6} fontSize={20}>{g.glyph}</text>)}
            <text x={timeX} y={yOf(6) + 7} fontSize={19} fontWeight={700}>4</text>
            <text x={timeX} y={yOf(2) + 7} fontSize={19} fontWeight={700}>4</text>
          </g>
          <g clipPath={`url(#${clip})`}>
            <g stroke={ink.line}>
              {Array.from({ length: bars }, (_, b) => {
                const x = bx(b * BEATS_PER_BAR) - Math.min(12, beatW * 0.35);
                return <line key={b} x1={x} x2={x} y1={yOf(8)} y2={yOf(0)} />;
              })}
              {/* the final double bar */}
              <line x1={bx(total) - PAD + 2} x2={bx(total) - PAD + 2} y1={yOf(8)} y2={yOf(0)} />
              <line x1={bx(total) - PAD + 6} x2={bx(total) - PAD + 6} y1={yOf(8)} y2={yOf(0)} strokeWidth={3} />
            </g>
            {a.beat !== null && (
              <g pointerEvents="none">
                <rect x={bx(-LEAD) - PAD} y={yOf(8) - 8} width={Math.max(0, bx(a.beat) - bx(-LEAD) + PAD)} height={yOf(0) - yOf(8) + 16} fill={PLAYED} fillOpacity={0.07} />
                <line x1={bx(a.beat)} x2={bx(a.beat)} y1={yOf(8) - 8} y2={yOf(0) + 8} stroke={PLAYED} strokeOpacity={0.6} strokeWidth={2} />
              </g>
            )}
            {ghosts.map((g) => drawNote(g.i, g.at, g.beats, true))}
            {notes.map((n, i) => drawNote(i, n.at, n.beats, false))}
            {showDot && (
              <g opacity={dotOpacity} pointerEvents="none">
                {a.tail.map((p, i) => {
                  if (i === 0) return null;
                  const q = a.tail[i - 1];
                  const age = 1 - (now - p.t) / TAIL_MS;
                  return <line key={p.t} x1={bx(q.x)} y1={yOf(q.step)} x2={bx(p.x)} y2={yOf(p.step)} stroke={colour} strokeWidth={1 + 8 * age} strokeOpacity={0.55 * age} strokeLinecap="round" />;
                })}
                {follow && a.target >= 0 && (
                  <Miss x={bx(a.dot!.x)} y={yOf(a.dot!.step)} to={yOf(placed[a.target].step)} cents={a.cents} hit={a.hit} colour={colour} />
                )}
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

/** From the voice dot to the height of the note due, and how far off it is in cents ("in tune" when it is). */
function Miss({ x, y, to, cents, hit, colour }: { x: number; y: number; to: number; cents: number; hit: boolean; colour: string }) {
  const c = Math.round(cents);
  const label = hit ? "in tune" : `${c > 0 ? "+" : "−"}${Math.abs(c)}¢`;
  return (
    <>
      {!hit && <line x1={x} x2={x} y1={y} y2={to} stroke={colour} strokeWidth={2} strokeDasharray="3 3" />}
      {!hit && <line x1={x - 9} x2={x + 9} y1={to} y2={to} stroke={colour} strokeWidth={2} />}
      <text x={x + 16} y={y - 10} fontSize={11} fontWeight={700} fill={colour}>{label}</text>
    </>
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
