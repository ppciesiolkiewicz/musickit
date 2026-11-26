"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SettingsPanel, SettingsSection } from "@/components/ui";
import { VolumeRow } from "@/features/settings";
import { midiToName, playSequence } from "@/features/sound";
import { PIANO_SCALES, makeKey, type ScaleId } from "@/features/theory/piano/key";
import { useVoicePitch } from "@/features/exercises/basics/voicePitch";
import { micStatusMessage } from "@/components/InputChip";
import MicButton from "@/components/theory/singing/MicButton";
import { PianoSettings } from "@/components/theory/piano/PianoSettings";

/** the whole piano: A0 to C8 */
const LO = 21;
const HI = 108;
const ROW_H = 14;
const KEYS_W = 60;
/** seconds of pitch kept on screen */
const WINDOW_S = 8;
/** the "now" line sits this far in from the right edge */
const NOW_PAD = 24;
const IN_TUNE_CENTS = 15;
const BLACK = new Set([1, 3, 6, 8, 10]);
const pcOf = (m: number) => ((m % 12) + 12) % 12;

interface Sample { t: number; midi: number | null }

/** The theme's colours, read off the page so the canvas follows the theme. */
function readColours() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: v("--color-slate-950", "#020617"),
    row: v("--color-slate-900", "#0f172a"),
    line: v("--color-slate-800", "#1e293b"),
    text: v("--color-slate-400", "#94a3b8"),
    white: v("--color-slate-200", "#e2e8f0"),
    black: v("--color-slate-700", "#334155"),
    amber: v("--color-amber-300", "#fcd34d"),
    amberDeep: v("--color-amber-500", "#f59e0b"),
    green: v("--color-emerald-400", "#34d399"),
    off: v("--color-sky-400", "#38bdf8"),
  };
}

/**
 * A pitch detector drawn as a full piano roll: a row for every key of the piano, the keys down the left, and the pitch the
 * mic hears as a line that runs right to left over the last few seconds. The key and scale only tint their keys and rows
 * amber; the line and the lit key show any note, in the scale or not. Tap a key to hear it.
 */
export default function PitchRoll() {
  const [tonicPc, setTonicPc] = useState(0);
  const [scale, setScale] = useState<ScaleId>("major");
  const [on, setOn] = useState(false);
  const [heard, setHeard] = useState<{ midi: number; cents: number } | null>(null);
  const key = useMemo(() => makeKey(tonicPc, scale), [tonicPc, scale]);
  const { pitch, status } = useVoicePitch(on);

  const scroller = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const samples = useRef<Sample[]>([]);
  const colours = useRef<ReturnType<typeof readColours> | null>(null);
  const lastScroll = useRef(0);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // start with middle C in the middle
    el.scrollTop = (HI - 60) * ROW_H - el.clientHeight / 2;
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
  }, []);

  const draw = useCallback((now: number) => {
    const c = canvas.current;
    if (!c || width === 0) return;
    const col = (colours.current ??= readColours());
    const dpr = window.devicePixelRatio || 1;
    const H = (HI - LO + 1) * ROW_H;
    if (c.width !== Math.round(width * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(H * dpr);
    }
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = col.bg;
    g.fillRect(0, 0, width, H);

    const inScale = (m: number) => scale !== "chromatic" && key.scalePcs.has(pcOf(m));
    const isTonic = (m: number) => scale !== "chromatic" && pcOf(m) === key.tonicPc;
    const live = samples.current.at(-1)?.midi ?? null;
    const liveKey = live === null ? null : Math.round(live);
    const yOf = (m: number) => (HI - m) * ROW_H;

    // the rows
    for (let m = HI; m >= LO; m--) {
      const y = yOf(m);
      g.fillStyle = BLACK.has(pcOf(m)) ? col.bg : col.row;
      g.fillRect(KEYS_W, y, width - KEYS_W, ROW_H);
      if (inScale(m)) {
        g.fillStyle = col.amber;
        g.globalAlpha = isTonic(m) ? 0.16 : 0.08;
        g.fillRect(KEYS_W, y, width - KEYS_W, ROW_H);
        g.globalAlpha = 1;
      }
      if (m === liveKey) {
        g.fillStyle = col.green;
        g.globalAlpha = 0.14;
        g.fillRect(KEYS_W, y, width - KEYS_W, ROW_H);
        g.globalAlpha = 1;
      }
      g.fillStyle = col.line;
      g.fillRect(KEYS_W, y + ROW_H - (pcOf(m) === 0 ? 1 : 0.5), width - KEYS_W, pcOf(m) === 0 ? 1 : 0.5);
    }

    // the keys: white keys full width, black keys shorter; the scale's keys amber, the heard key green
    for (let m = HI; m >= LO; m--) {
      const y = yOf(m);
      const black = BLACK.has(pcOf(m));
      const w = black ? KEYS_W * 0.62 : KEYS_W - 2;
      let fill = black ? col.black : col.white;
      if (inScale(m)) fill = isTonic(m) ? col.amberDeep : col.amber;
      if (m === liveKey) fill = col.green;
      g.fillStyle = fill;
      g.fillRect(0, y + 0.5, w, ROW_H - 1);
      if (pcOf(m) === 0 || m === liveKey) {
        g.fillStyle = black && m !== liveKey ? col.white : col.bg;
        g.font = "600 9px ui-sans-serif, system-ui, sans-serif";
        g.textBaseline = "middle";
        g.textAlign = "right";
        g.fillText(midiToName(m), KEYS_W - 6, y + ROW_H / 2 + 0.5);
      }
    }

    // the line the pitch leaves, newest at the right
    const nowX = width - NOW_PAD;
    const pxPerS = (nowX - KEYS_W) / WINDOW_S;
    g.save();
    g.beginPath();
    g.rect(KEYS_W, 0, width - KEYS_W, H);
    g.clip();
    g.strokeStyle = col.line;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(nowX, 0);
    g.lineTo(nowX, H);
    g.stroke();
    g.lineWidth = 2.5;
    g.lineJoin = "round";
    g.lineCap = "round";
    let prev: { x: number; y: number; tune: boolean } | null = null;
    for (const s of samples.current) {
      if (s.midi === null) { prev = null; continue; }
      const x = nowX - ((now - s.t) / 1000) * pxPerS;
      const y = yOf(s.midi) + ROW_H / 2;
      const tune = Math.abs(s.midi - Math.round(s.midi)) * 100 <= IN_TUNE_CENTS;
      if (prev) {
        g.strokeStyle = tune ? col.green : col.off;
        g.beginPath();
        g.moveTo(prev.x, prev.y);
        g.lineTo(x, y);
        g.stroke();
      }
      prev = { x, y, tune };
    }
    if (live !== null) {
      g.fillStyle = Math.abs(live - Math.round(live)) * 100 <= IN_TUNE_CENTS ? col.green : col.off;
      g.beginPath();
      g.arc(nowX, yOf(live) + ROW_H / 2, 5, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }, [width, key, scale]);

  // listening: take a sample a frame, keep the window, follow the voice up and down the roll
  useEffect(() => {
    if (!on) return;
    colours.current = readColours();
    let raf = 0;
    let lastReadout = 0;
    const tick = () => {
      const now = performance.now();
      const midi = pitch.current;
      const inRange = midi !== null && midi >= LO - 0.5 && midi <= HI + 0.5 ? midi : null;
      samples.current.push({ t: now, midi: inRange });
      while (samples.current.length && now - samples.current[0].t > WINDOW_S * 1000 + 500) samples.current.shift();
      const el = scroller.current;
      if (el && inRange !== null && now - lastScroll.current > 2500) {
        const y = (HI - inRange) * ROW_H;
        const margin = el.clientHeight * 0.2;
        if (y < el.scrollTop + margin || y > el.scrollTop + el.clientHeight - margin) {
          el.scrollTo({ top: y - el.clientHeight / 2, behavior: "smooth" });
        }
      }
      if (now - lastReadout > 100) {
        lastReadout = now;
        setHeard(inRange === null ? null : { midi: Math.round(inRange), cents: Math.round((inRange - Math.round(inRange)) * 100) });
      }
      draw(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, pitch, draw]);

  // still: draw once when the key, the scale or the size changes
  useEffect(() => {
    if (!on) draw(performance.now());
  }, [on, draw]);

  const toggle = () => {
    if (on) {
      samples.current = [];
      setHeard(null);
    }
    setOn(!on);
  };

  const hear = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX - r.left > KEYS_W) return;
    const m = HI - Math.floor((e.clientY - r.top) / ROW_H);
    if (m >= LO && m <= HI) playSequence([{ note: m, at: 0, hold: 700 }]);
  };

  const message = micStatusMessage(status);
  const settings = (
    <SettingsSection first>
      <PianoSettings tonicPc={tonicPc} scale={scale} onChange={(pc, s) => { setTonicPc(pc); setScale(s); }} />
      <VolumeRow />
    </SettingsSection>
  );

  return (
    <SettingsPanel name={`${key.tonic} ${PIANO_SCALES.find((s) => s.id === scale)?.name.toLowerCase()}`} settings={settings}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <MicButton on={on} onClick={toggle} />
          <div className="flex items-baseline gap-2 tabular-nums" aria-live="polite">
            <span className="text-2xl font-semibold text-slate-100">{heard ? midiToName(heard.midi) : "–"}</span>
            {heard && (
              <span className={`text-sm ${Math.abs(heard.cents) <= IN_TUNE_CENTS ? "text-emerald-300" : "text-sky-300"}`}>
                {heard.cents > 0 ? "+" : ""}{heard.cents} cents
              </span>
            )}
          </div>
        </div>
        {message && <p className="text-sm text-amber-300">{message}</p>}
        <div ref={scroller} className="h-[min(70vh,560px)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-800 bg-slate-950">
          <canvas
            ref={canvas}
            onClick={hear}
            style={{ width, height: (HI - LO + 1) * ROW_H, display: "block" }}
            role="img"
            aria-label={`A piano roll of every key, with the notes of ${key.tonic} ${PIANO_SCALES.find((s) => s.id === scale)?.name.toLowerCase()} tinted and the pitch the microphone hears drawn as a line`}
          />
        </div>
      </div>
    </SettingsPanel>
  );
}
