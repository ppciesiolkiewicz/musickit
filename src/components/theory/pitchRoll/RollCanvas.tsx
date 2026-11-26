"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { midiToName, playSequence } from "@/features/sound";
import type { KeyContext } from "@/features/theory/piano/key";
import { MIN_HOLD_MS, type createHeldNotes } from "@/features/theory/heldNotes";

/** the whole piano: A0 to C8 */
export const LO = 21;
export const HI = 108;
/** seconds of pitch kept on screen */
export const WINDOW_S = 8;
const ROW_H = 14;
/** full screen the rows grow, so the roll reads from a step back */
const FULL_ROW_H = 22;
const KEYS_W = 60;
/** the "now" line sits this far in from the right edge */
const NOW_PAD = 24;
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
    row: v("--color-slate-900", "#0f172a"),
    line: v("--color-slate-800", "#1e293b"),
    white: v("--color-slate-200", "#e2e8f0"),
    black: v("--color-slate-700", "#334155"),
    amber: v("--color-amber-300", "#fcd34d"),
    amberDeep: v("--color-amber-500", "#f59e0b"),
    green: v("--color-emerald-400", "#34d399"),
    off: v("--color-sky-400", "#38bdf8"),
  };
}

/**
 * The pitch roll's drawing, on a canvas: every key of the piano as a row (the key and scale's keys and rows tinted
 * yellow), the held notes as bars, the pitch as a line and a dot at the "now" line. Scrolls up and down, following the
 * pitch when it leaves the view (unless the player scrolled in the last few seconds). Tap a key to hear it. Keyed by
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
  const height = (HI - LO + 1) * rowH;
  const scroller = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const colours = useRef<ReturnType<typeof readColours> | null>(null);
  const lastScroll = useRef(0);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // start on the note last heard, or with middle C in the middle
    const at = samples.current.findLast((s) => s.midi !== null)?.midi ?? 60;
    el.scrollTop = (HI - at) * rowH - el.clientHeight / 2;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    const mark = () => { lastScroll.current = performance.now(); };
    el.addEventListener("wheel", mark, { passive: true });
    el.addEventListener("touchmove", mark, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", mark);
      el.removeEventListener("touchmove", mark);
    };
  }, [rowH, samples]);

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
    const yOf = (m: number) => (HI - m) * rowH;
    const label = `600 ${full ? 11 : 9}px ui-sans-serif, system-ui, sans-serif`;

    // the rows
    for (let m = HI; m >= LO; m--) {
      const y = yOf(m);
      g.fillStyle = BLACK.has(pcOf(m)) ? col.bg : col.row;
      g.fillRect(KEYS_W, y, width - KEYS_W, rowH);
      if (inScale(m)) {
        g.fillStyle = col.amber;
        g.globalAlpha = isTonic(m) ? 0.16 : 0.08;
        g.fillRect(KEYS_W, y, width - KEYS_W, rowH);
        g.globalAlpha = 1;
      }
      g.fillStyle = col.line;
      const c0 = pcOf(m) === 0;
      g.fillRect(KEYS_W, y + rowH - (c0 ? 1 : 0.5), width - KEYS_W, c0 ? 1 : 0.5);
    }

    // the keys: white keys full width, black keys shorter; the scale's keys yellow, the heard key green or blue
    for (let m = HI; m >= LO; m--) {
      const y = yOf(m);
      const black = BLACK.has(pcOf(m));
      const w = black ? KEYS_W * 0.62 : KEYS_W - 2;
      let fill = black ? col.black : col.white;
      if (inScale(m)) fill = isTonic(m) ? col.amberDeep : col.amber;
      if (m === liveKey && now_ !== null) fill = tuned(now_) ? col.green : col.off;
      g.fillStyle = fill;
      g.fillRect(0, y + 0.5, w, rowH - 1);
      if (pcOf(m) === 0 || m === liveKey) {
        g.fillStyle = black && m !== liveKey ? col.white : col.bg;
        g.font = label;
        g.textBaseline = "middle";
        g.textAlign = "right";
        g.fillText(midiToName(m), KEYS_W - 6, y + rowH / 2 + 0.5);
      }
    }

    const nowX = width - NOW_PAD;
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
      const y = yOf(n.midi) + 1.5;
      const h = rowH - 3;
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
  }, [width, height, rowH, full, keyContext, cents, samples, held]);

  // while the mic is on: draw every frame and follow the pitch up and down the roll
  useEffect(() => {
    if (!live) return;
    colours.current = readColours();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const midi = samples.current.at(-1)?.midi ?? null;
      const el = scroller.current;
      if (el && midi !== null && now - lastScroll.current > 2500) {
        const y = (HI - midi) * rowH;
        const margin = el.clientHeight * 0.2;
        if (y < el.scrollTop + margin || y > el.scrollTop + el.clientHeight - margin) {
          el.scrollTo({ top: y - el.clientHeight / 2, behavior: "smooth" });
        }
      }
      draw(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, draw, rowH, samples]);

  // still: draw once when the key, the scale or the size changes
  useEffect(() => {
    if (!live) draw(performance.now());
  }, [live, draw]);

  const hear = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX - r.left > KEYS_W) return;
    const m = HI - Math.floor((e.clientY - r.top) / rowH);
    if (m >= LO && m <= HI) playSequence([{ note: m, at: 0, hold: 700 }]);
  };

  return (
    <div ref={scroller} className={`overflow-y-auto overscroll-contain rounded-2xl border border-slate-800 bg-slate-950 ${full ? "min-h-0 flex-1" : "h-[min(70vh,560px)]"}`}>
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
