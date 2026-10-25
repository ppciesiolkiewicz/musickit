"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { place, signatureGlyphs, type Clef } from "@/features/theory/piano/staff";
import { degreeColour } from "@/features/theory/scales";
import { fitOf, locate, type Fit, type Ladder } from "@/features/theory/singing";

/**
 * One five-line staff with every note of the ladder on it, low to high, and a dot for the voice: it rides up and down
 * with the pitch and along between the two scale notes it sits between, leaving a short fading tail. When all the notes
 * fit the width the staff stays still; when they don't (a phone) the staff slides so the dot stays in view.
 * `pitch` holds the sung note as fractional MIDI, or null in silence; it is read every animation frame.
 */

const HALF = 5; // px per staff step
const MIN_SLOT = 34; // px between notes before the staff has to scroll
const MAX_SLOT = 64;
const LABELS_H = 36;
const TAIL_MS = 380;
/** with no pitch for this long the dot fades out, and the next note starts it afresh rather than sliding over */
const SILENCE_MS = 220;

const ink = {
  line: "var(--color-slate-500)",
  glyph: "var(--color-slate-300)",
  name: "var(--color-slate-200)",
  degree: "var(--color-slate-400)",
};
const DOT: Record<Fit, string> = { in: "var(--color-emerald-400)", out: "var(--color-rose-400)", between: "var(--color-amber-300)" };

interface Point { x: number; step: number; t: number }
interface View { dot: Point | null; cam: number; tail: Point[]; lastHeard: number; now: number; fit: Fit; nearest: number }
const STILL: View = { dot: null, cam: 0, tail: [], lastHeard: -Infinity, now: 0, fit: "between", nearest: -1 };

export default function SingingStaff({ ladder, clef, pitch }: { ladder: Ladder; clef: Clef; pitch: RefObject<number | null> }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const notes = ladder.notes;
  const placed = notes.map((n) => place(n.spelled, ladder.signature, clef));
  const steps = placed.map((p) => p.step);
  const midis = notes.map((n) => n.midi);
  const top = Math.max(8, ...steps) + 3;
  const bottom = Math.min(0, ...steps) - 3;
  const yOf = (step: number) => 6 + (top - step) * HALF;
  const labelsY = yOf(bottom) + 8;
  const H = labelsY + LABELS_H;

  const sig = signatureGlyphs(ladder.signature, clef);
  const x0 = 50 + sig.length * 9 + 22;
  const room = width - x0 - 18;
  const fits = room / (notes.length - 1) >= MIN_SLOT;
  const slot = fits ? Math.min(MAX_SLOT, room / (notes.length - 1)) : MIN_SLOT;
  const span = (notes.length - 1) * slot;
  const maxCam = Math.max(0, span - room);

  // the moving parts live in a ref, and a copy of them is drawn once a frame
  const anim = useRef<View>({ ...STILL });
  const [a, setView] = useState<View>(STILL);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = anim.current;
      const now = performance.now();
      a.now = now;
      const m = pitch.current;
      if (m !== null) {
        const at = locate(midis, steps, m);
        const fresh = !a.dot || now - a.lastHeard > SILENCE_MS;
        a.dot = fresh ? { x: at.x, step: at.step, t: now } : { x: a.dot!.x + (at.x - a.dot!.x) * 0.35, step: a.dot!.step + (at.step - a.dot!.step) * 0.35, t: now };
        if (fresh) a.tail = [];
        a.tail.push(a.dot);
        a.lastHeard = now;
        a.fit = fitOf(m, ladder.pcs);
        a.nearest = Math.abs(at.cents) <= 25 ? at.nearest : -1;
      } else if (now - a.lastHeard > SILENCE_MS) a.nearest = -1;
      a.tail = a.tail.filter((p) => now - p.t < TAIL_MS);
      if (a.dot && maxCam > 0) {
        const want = Math.max(0, Math.min(maxCam, a.dot.x * slot - room / 2));
        a.cam += (want - a.cam) * 0.08;
      } else if (maxCam === 0) a.cam = 0;
      else a.cam = Math.min(a.cam, maxCam);
      setView({ ...a, tail: [...a.tail] });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // the geometry is rebuilt from the ladder and the width; the loop restarts with it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ladder, clef, slot, maxCam, room]);

  // a new scale or voice starts with the tonic of the home octave at the left, its octave running on from there
  useEffect(() => {
    const home = notes.findIndex((n) => n.home);
    anim.current.cam = Math.max(0, Math.min(maxCam, home * slot - slot / 2));
    anim.current.dot = null;
    anim.current.tail = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ladder, clef]);

  const now = a.now;
  const sx = (x: number) => x0 + x * slot - a.cam;
  const showDot = a.dot && now - a.lastHeard <= SILENCE_MS + 400;
  const dotOpacity = a.dot ? Math.max(0, Math.min(1, 1 - (now - a.lastHeard - SILENCE_MS) / 400)) : 0;
  const colour = DOT[a.fit];
  const clip = `sing-clip-${clef}`;

  return (
    <div ref={wrap} className="w-full">
      {width > 0 && (
        <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={`${ladder.title} on the staff${a.nearest >= 0 ? `, singing ${notes[a.nearest].spelled.name}` : ""}`}>
          <defs>
            <clipPath id={clip}>
              <rect x={x0 - 22} y={0} width={width - x0 + 22} height={H} />
            </clipPath>
          </defs>
          <g stroke={ink.line} strokeWidth={1}>
            {[0, 2, 4, 6, 8].map((s) => <line key={s} x1={8} x2={width - 4} y1={yOf(s)} y2={yOf(s)} />)}
            <line x1={8} x2={8} y1={yOf(8)} y2={yOf(0)} strokeWidth={1.5} />
          </g>
          <g fill={ink.glyph} textAnchor="middle">
            {clef === "treble" ? <text x={30} y={yOf(1) + 5} fontSize={62}>𝄞</text> : <text x={30} y={yOf(6) + 12} fontSize={42}>𝄢</text>}
            {sig.map((g, i) => <text key={i} x={56 + i * 9} y={yOf(g.step) + 6} fontSize={20}>{g.glyph}</text>)}
          </g>
          <g clipPath={`url(#${clip})`}>
            {notes.map((n, i) => {
              const p = placed[i];
              const x = sx(i);
              if (x < x0 - 40 || x > width + 40) return null;
              const y = yOf(p.step);
              const lit = a.nearest === i && showDot;
              const c = degreeColour(n.degree);
              return (
                <g key={n.midi} opacity={n.home ? 1 : 0.5}>
                  {p.ledgers.map((l) => <line key={l} x1={x - 11} x2={x + 11} y1={yOf(l)} y2={yOf(l)} stroke={ink.line} />)}
                  {p.accidental && <text x={x - 10} y={y + 5} textAnchor="end" fontSize={15} fill={ink.glyph}>{p.accidental}</text>}
                  {lit && <circle cx={x} cy={y} r={12} fill={c} fillOpacity={0.18} stroke={c} strokeOpacity={0.7} />}
                  <ellipse cx={x} cy={y} rx={6.5} ry={5} fill={c} transform={`rotate(-20 ${x} ${y})`} />
                  <text x={x} y={labelsY + 12} textAnchor="middle" fontSize={11} fontWeight={lit ? 700 : 400} fill={ink.name}>{n.spelled.name}</text>
                  <text x={x} y={labelsY + 27} textAnchor="middle" fontSize={11} fontWeight={lit ? 700 : 400} fill={lit ? c : ink.degree}>{n.label}</text>
                </g>
              );
            })}
            {showDot && (
              <g opacity={dotOpacity}>
                {a.tail.map((p, i) => {
                  if (i === 0) return null;
                  const q = a.tail[i - 1];
                  const age = 1 - (now - p.t) / TAIL_MS;
                  return <line key={p.t} x1={sx(q.x)} y1={yOf(q.step)} x2={sx(p.x)} y2={yOf(p.step)} stroke={colour} strokeWidth={1 + 8 * age} strokeOpacity={0.55 * age} strokeLinecap="round" />;
                })}
                <circle cx={sx(a.dot!.x)} cy={yOf(a.dot!.step)} r={13} fill={colour} fillOpacity={0.18} />
                <circle cx={sx(a.dot!.x)} cy={yOf(a.dot!.step)} r={7} fill={colour} />
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
