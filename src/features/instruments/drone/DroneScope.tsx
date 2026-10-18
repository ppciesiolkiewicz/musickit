"use client";

import { useEffect, useRef } from "react";
import { modRange, modShape, type DroneParams } from "./drone";

const GRID = "#1e293b";
const DIM = "#475569";
/** a theme colour by name, read off the page so the canvas follows the theme ("--color-violet-400") */
const cssColour = (el: Element, name: string, fallback: string) => getComputedStyle(el).getPropertyValue(name).trim() || fallback;
/** cycles of the modulator in view */
const MOD_CYCLES = 2.5;

/** Size a canvas to its box at the screen's pixel density and hand back its 2D context in CSS pixels. */
function fit(c: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const g = c.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  g.strokeStyle = GRID;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w, h / 2);
  g.stroke();
  return { g, w, h };
}

const buf = new Float32Array(2048);

/** The wave the drone makes: live from the analyser while it sounds, otherwise two cycles of the bare oscillator, dimmed. */
function drawWave(c: HTMLCanvasElement, p: DroneParams, analyser: AnalyserNode | null, live: boolean, hue: string) {
  const { g, w, h } = fit(c);
  const colour = cssColour(c, `--color-${hue}-400`, "#38bdf8");
  g.lineWidth = 1.5;
  g.beginPath();
  if (analyser && live) {
    const n = analyser.fftSize;
    const data = buf.length >= n ? buf.subarray(0, n) : new Float32Array(n);
    analyser.getFloatTimeDomainData(data);
    // start on a rising zero crossing so the picture stands still, and scale it to fill the box
    let s = 0;
    for (let i = 1; i < n / 2; i++) if (data[i - 1] < 0 && data[i] >= 0) { s = i; break; }
    const len = n - n / 2;
    let peak = 0.02;
    for (let i = s; i < s + len; i++) peak = Math.max(peak, Math.abs(data[i]));
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = h / 2 - (data[s + i] / peak) * (h / 2 - 6);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.strokeStyle = colour;
    g.shadowColor = colour;
    g.shadowBlur = 10;
  } else {
    for (let i = 0; i <= w; i++) {
      const y = h / 2 - modShape(p.wave, (i / w) * 2) * (h / 2 - 6);
      if (i) g.lineTo(i, y);
      else g.moveTo(i, y);
    }
    // at rest the wave keeps the note's colour, quieter
    g.strokeStyle = colour;
    g.globalAlpha = 0.55;
  }
  g.stroke();
  g.shadowBlur = 0;
  g.globalAlpha = 1;
}

/** The modulator as a chart recorder: its shape runs right to left, the dot at the right edge is now. */
function drawMod(c: HTMLCanvasElement, p: DroneParams, phase: number) {
  const { g, w, h } = fit(c);
  const MOD = cssColour(c, "--color-emerald-400", "#34d399");
  const pad = 8;
  const off = p.mod === "off" || p.modDepth === 0;
  // position 0 to 1 from the bottom of the box; the volume one hangs from the top (100%) and dips by the depth
  const at = (v: number) => (off ? 0.5 : p.mod === "volume" ? 1 - p.modDepth / 2 + (v * p.modDepth) / 2 : 0.5 + (v * p.modDepth) / 2);
  const y = (v: number) => h - pad - at(v) * (h - 2 * pad);
  g.lineWidth = 1.5;
  g.strokeStyle = off ? DIM : MOD;
  g.beginPath();
  for (let i = 0; i <= w; i++) {
    const v = modShape(p.modWave, phase - ((w - i) / w) * MOD_CYCLES);
    if (i) g.lineTo(i, y(v));
    else g.moveTo(i, y(v));
  }
  g.stroke();
  if (!off) {
    g.fillStyle = MOD;
    g.beginPath();
    g.arc(w - 4, y(modShape(p.modWave, phase)), 3.5, 0, Math.PI * 2);
    g.fill();
  }
}

/**
 * Two small pictures of the drone: the wave it makes, and the modulation moving its filter, pitch or volume over time.
 * They move only while the drone plays.
 */
export default function DroneScope({ value, playing, analyser, hue = "sky" }: { value: DroneParams; playing: boolean; analyser: AnalyserNode | null; hue?: string }) {
  const waveRef = useRef<HTMLCanvasElement>(null);
  const modRef = useRef<HTMLCanvasElement>(null);
  const phase = useRef(0);

  useEffect(() => {
    const draw = () => {
      if (waveRef.current) drawWave(waveRef.current, value, analyser, playing, hue);
      if (modRef.current) drawMod(modRef.current, value, phase.current);
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (waveRef.current) ro.observe(waveRef.current);
    if (modRef.current) ro.observe(modRef.current);
    if (!playing) return () => ro.disconnect();
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      phase.current += ((now - last) / 1000) * value.modRate;
      last = now;
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [playing, analyser, value, hue]);

  const r = modRange(value);
  const off = value.mod === "off" || value.modDepth === 0;
  return (
    <div className="grid gap-2 @md:grid-cols-2">
      <figure className="flex min-w-0 flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
        <figcaption className="flex justify-between text-[11px] text-slate-500">
          <span>Wave</span>
          <span>{playing && analyser ? "Live" : "Oscillator"}</span>
        </figcaption>
        <canvas ref={waveRef} className="h-20 w-full" aria-label="The wave the drone makes" role="img" />
      </figure>
      <figure className="flex min-w-0 flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
        <figcaption className="flex justify-between gap-2 text-[11px] text-slate-500">
          <span>Modulation{off ? "" : ` · ${r.label}`}</span>
          <span className="tabular-nums">{off ? "Off" : `${r.low} – ${r.high} · ${value.modRate} Hz`}</span>
        </figcaption>
        <canvas ref={modRef} className="h-20 w-full" aria-label={off ? "No modulation" : `${r.label} moves from ${r.low} to ${r.high}, ${value.modRate} times a second`} role="img" />
      </figure>
    </div>
  );
}
