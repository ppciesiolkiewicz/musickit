"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { playSequence } from "@/features/sound";
import { spellNote, type KeyContext } from "@/features/theory/piano/key";
import { MIN_HOLD_MS, type createHeldNotes } from "@/features/theory/heldNotes";

/** the whole piano: A0 to C8 */
export const LO = 21;
export const HI = 108;
/** seconds of pitch kept on screen, from the left edge to the "now" line */
export const WINDOW_S = 5;
const ROW_H = 26;
/** full screen the rows grow, so the roll reads from a step back */
const FULL_ROW_H = 34;
/** the keys, then a strip that marks the scale's notes */
const KEYS_W = 60;
const MARK_W = 6;
/** a held note's bar fades in over this long once it shows, and dims over this long once it ends */
const FADE_MS = 150;
const BLACK = new Set([1, 3, 6, 8, 10]);
const pcOf = (m: number) => ((m % 12) + 12) % 12;

export interface Sample { t: number; midi: number | null }

/** The theme's colours, read off the page so the canvas follows the theme. */
function readColours() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: v("--color-slate-950", "#020617"),
    row: v("--color-slate-800", "#1e293b"),
    rowBlack: v("--color-slate-900", "#0f172a"),
    line: v("--color-slate-700", "#334155"),
    white: v("--color-slate-300", "#cbd5e1"),
    black: v("--color-slate-700", "#334155"),
    text: v("--color-slate-900", "#0f172a"),
    amber: v("--color-amber-300", "#fcd34d"),
    green: v("--color-emerald-400", "#34d399"),
    off: v("--color-sky-400", "#38bdf8"),
  };
}

/**
 * The pitch roll's drawing, on a canvas: every key of the piano as a row, named (the scale's rows and a strip by their keys
 * yellow), the held notes as bars, the pitch as a line and a dot at the "now" line, halfway across. It shows the rows that fit its box
 * and never scrolls by hand: the view glides up or down after the pitch when it nears an edge. Tap a key to hear it. Keyed by
 * full screen in the parent, so it mounts afresh in the modal; the readings it draws live in the parent.
 */
export default function RollCanvas({ full, live, samples, held, cents, keyContext, scaleName }: {
  full: boolean;
  /** the mic is on: drawn every frame */
  live: boolean;
  samples: RefObject<Sample[]>;
  held: RefObject<ReturnType<typeof createHeldNotes>>;
  /** within this many cents a note and the dot are green */
  cents: number;
  keyContext: KeyContext;
  scaleName: string;
}) {
  const rowH = full ? FULL_ROW_H : ROW_H;
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const colours = useRef<ReturnType<typeof readColours> | null>(null);
  // the note in the middle of the view, fractional while it glides; it starts on the note last heard, or E4
  const centre = useRef<number | null>(null);
  const goal = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ width: Math.round(e.contentRect.width), height: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** the view's middle note, kept so the view stays inside the piano */
  const clampCentre = useCallback((m: number) => {
    const half = height / rowH / 2;
    return Math.min(HI + 0.5 - half, Math.max(LO - 0.5 + half, m));
  }, [height, rowH]);
  /** the midi number at the top edge of the view: row m spans (top - m) to (top - m + 1) rows down */
  const topOf = useCallback(() => {
    centre.current ??= clampCentre(Math.round(samples.current.findLast((s) => s.midi !== null)?.midi ?? 64));
    // a resize can leave the middle past the piano's ends
    centre.current = clampCentre(centre.current);
    return centre.current + height / rowH / 2 - 0.5;
  }, [clampCentre, height, rowH, samples]);

  const draw = useCallback((now: number) => {
    const c = canvas.current;
    if (!c || width === 0) return;
    const col = (colours.current ??= readColours());
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(width * dpr) || c.height !== Math.round(height * dpr)) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
    }
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = col.bg;
    g.fillRect(0, 0, width, height);

    const chromatic = keyContext.scale === "chromatic";
    const inScale = (m: number) => !chromatic && keyContext.scalePcs.has(pcOf(m));
    const isTonic = (m: number) => !chromatic && pcOf(m) === keyContext.tonicPc;
    const tuned = (m: number) => Math.abs(m - Math.round(m)) * 100 <= cents;
    const now_ = samples.current.at(-1)?.midi ?? null;
    const liveKey = now_ === null ? null : Math.round(now_);
    const top = topOf();
    const yOf = (m: number) => (top - m) * rowH;

    // the rows, all alike (the keys show white and black), a faint line under each and a firmer one under C; only the
    // scale's rows are lighter, tinted yellow, the key note's row more
    for (let m = HI; m >= LO; m--) {
      const y = yOf(m);
      g.globalAlpha = 0.9;
      g.fillStyle = col.rowBlack;
      g.fillRect(KEYS_W, y, width - KEYS_W, rowH);
      if (inScale(m)) {
        g.globalAlpha = isTonic(m) ? 0.2 : 0.1;
        g.fillStyle = col.amber;
        g.fillRect(KEYS_W, y, width - KEYS_W, rowH);
      }
      g.globalAlpha = pcOf(m) === 0 ? 0.8 : 0.4;
      g.fillStyle = col.line;
      g.fillRect(KEYS_W, y + rowH - 0.5, width - KEYS_W, pcOf(m) === 0 ? 1 : 0.5);
      g.globalAlpha = 1;
    }

    // the keys, a row each, every one named (spelled in the key): white keys light, black keys dark, the heard key
    // green or blue. Between the keys and the rows a strip marks the scale's notes in yellow, the key note's brighter.
    const keyW = KEYS_W - MARK_W - 2;
    g.textBaseline = "middle";
    g.textAlign = "right";
    for (let m = HI; m >= LO; m--) {
      const y = yOf(m);
      if (y > height || y + rowH < 0) continue;
      const black = BLACK.has(pcOf(m));
      const heardHere = m === liveKey && now_ !== null;
      const scaleNote = inScale(m);
      g.fillStyle = heardHere ? (tuned(now_) ? col.green : col.off) : black ? col.black : col.white;
      g.globalAlpha = heardHere || black ? 1 : 0.85;
      g.fillRect(0, y, keyW, rowH);
      // a hairline between keys, so neighbouring white keys stay two
      g.fillStyle = col.bg;
      g.globalAlpha = 0.35;
      g.fillRect(0, y + rowH - 0.5, keyW, 0.5);
      if (scaleNote) {
        g.fillStyle = col.amber;
        g.globalAlpha = isTonic(m) ? 1 : 0.55;
        g.fillRect(keyW + 1, y + 1, MARK_W, rowH - 2);
      }
      const n = spellNote(keyContext, m);
      g.font = `${scaleNote || heardHere || chromatic ? 600 : 500} ${full ? 13 : 11}px ui-sans-serif, system-ui, sans-serif`;
      g.fillStyle = black && !heardHere ? col.white : col.text;
      g.globalAlpha = heardHere || scaleNote || chromatic ? 1 : 0.6;
      g.fillText(`${n.name}${n.octave}`, keyW - 5, y + rowH / 2 + 0.5);
      g.globalAlpha = 1;
    }

    // the "now" line, and the dot on it, halfway across the rows
    const nowX = KEYS_W + (width - KEYS_W) / 2;
    const pxPerS = (nowX - KEYS_W) / WINDOW_S;
    const xOf = (t: number) => nowX - ((now - t) / 1000) * pxPerS;
    g.save();
    g.beginPath();
    g.rect(KEYS_W, 0, width - KEYS_W, height);
    g.clip();
    g.strokeStyle = col.line;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(nowX, 0);
    g.lineTo(nowX, height);
    g.stroke();

    // the held notes: a bar a note, faded in as it shows, dimmed a little once it ends
    for (const n of held.current.notes()) {
      const x0 = xOf(n.start);
      const x1 = n.live ? nowX : xOf(n.end);
      if (x1 < KEYS_W) continue;
      const inA = Math.min(1, Math.max(0, (now - n.start - MIN_HOLD_MS) / FADE_MS));
      const outA = n.live ? 1 : 1 - 0.35 * Math.min(1, Math.max(0, (now - n.end) / FADE_MS));
      const colour = n.meanCents <= cents ? col.green : col.off;
      const y = yOf(n.midi) + 2;
      const h = rowH - 4;
      g.globalAlpha = 0.45 * inA * outA;
      g.fillStyle = colour;
      g.beginPath();
      g.roundRect(x0, y, Math.max(3, x1 - x0), h, 3);
      g.fill();
      g.globalAlpha = inA * outA;
      g.strokeStyle = colour;
      g.lineWidth = n.live ? 1.5 : 1;
      g.stroke();
      g.globalAlpha = 1;
    }

    // the line the pitch leaves, newest at the right
    g.lineWidth = full ? 2.5 : 2;
    g.lineJoin = "round";
    g.lineCap = "round";
    let prev: { x: number; y: number } | null = null;
    for (const s of samples.current) {
      if (s.midi === null) { prev = null; continue; }
      const x = xOf(s.t);
      const y = yOf(s.midi) + rowH / 2;
      if (prev) {
        g.strokeStyle = tuned(s.midi) ? col.green : col.off;
        g.beginPath();
        g.moveTo(prev.x, prev.y);
        g.lineTo(x, y);
        g.stroke();
      }
      prev = { x, y };
    }
    if (now_ !== null) {
      g.fillStyle = tuned(now_) ? col.green : col.off;
      g.strokeStyle = col.bg;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(nowX, yOf(now_) + rowH / 2, full ? 7 : 5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.restore();
  }, [width, height, rowH, full, keyContext, cents, samples, held, topOf]);

  // while the mic is on: draw every frame and follow the pitch up and down the roll
  useEffect(() => {
    if (!live) return;
    colours.current = readColours();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const midi = samples.current.at(-1)?.midi ?? null;
      // the pitch nearing an edge (outside the middle 60%) sets a new middle; the view glides there
      const half = height / rowH / 2;
      const c = centre.current;
      if (midi !== null && c !== null && Math.abs(midi - c) > half * 0.6) goal.current = clampCentre(midi);
      if (c !== null && goal.current !== null) {
        const d = goal.current - c;
        centre.current = Math.abs(d) < 0.02 ? goal.current : c + d * 0.12;
        if (centre.current === goal.current) goal.current = null;
      }
      draw(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, draw, rowH, height, samples, clampCentre]);

  // still: draw once when the key, the scale or the size changes
  useEffect(() => {
    if (!live) draw(performance.now());
  }, [live, draw]);

  const hear = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX - r.left > KEYS_W - MARK_W - 2) return;
    const m = Math.ceil(topOf() - (e.clientY - r.top) / rowH);
    if (m >= LO && m <= HI) playSequence([{ note: m, at: 0, hold: 700 }]);
  };

  return (
    <div ref={box} className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 ${full ? "min-h-0 flex-1" : "h-[min(55vh,460px)]"}`}>
      <canvas
        ref={canvas}
        onClick={hear}
        style={{ width, height, display: "block" }}
        role="img"
        aria-label={`A piano roll of every key, with the notes of ${scaleName} tinted and the pitch the microphone hears drawn as a line`}
      />
    </div>
  );
}
