"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import { blockAt, type Block } from "../model/blocks";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** A soft two-note chime when time is up, made on the spot (no sample to load). */
function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.65);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* no audio: the ring still shows it */
  }
}

/** One short tick when a new block starts. */
function tick() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 990;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.16);
    setTimeout(() => void ctx.close(), 500);
  } catch {
    /* no audio: the label still shows it */
  }
}

/** The exercise's countdown: start, pause, reset; a chime and `onFinish` at zero. With `blocks` it also shows "block 2 of 4 · 2:41", ticks at each block change and reports the running block through `onBlock` (null when stopped or reset). Time is kept from the clock, so a background tab stays right. */
export default function ExerciseTimer({ minutes, blocks, onFinish, onBlock }: { minutes: number; blocks?: Block[]; onFinish: () => void; onBlock?: (index: number | null) => void }) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [endAt, setEndAt] = useState<number | null>(null);
  const finish = useRef(onFinish);
  useEffect(() => {
    finish.current = onFinish;
  });

  const report = useRef(onBlock);
  useEffect(() => {
    report.current = onBlock;
  });

  const running = endAt !== null;
  const at = blocks?.length ? blockAt(blocks, total - left) : null;
  const block = running && at ? at.index : null;
  const lastBlock = useRef<number | null>(null);
  useEffect(() => {
    if (block !== null && lastBlock.current !== null && block !== lastBlock.current) tick();
    lastBlock.current = block;
    report.current?.(block);
  }, [block]);

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        setEndAt(null);
        chime();
        finish.current();
      }
    };
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [endAt]);

  const p = 1 - left / total;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-2.5 py-1.5">
      <span className="relative grid size-9 shrink-0 place-items-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-slate-800" />
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round" className={left === 0 ? "stroke-emerald-400" : "stroke-sky-400"} strokeDasharray={`${p * 94.25} 94.25`} />
        </svg>
        <Icon name="timer" size={14} className="text-slate-400" />
      </span>
      <span className={`min-w-12 text-lg tabular-nums ${left === 0 ? "text-emerald-300" : running ? "text-sky-100" : "text-slate-200"}`} aria-live="polite">{fmt(left)}</span>
      {blocks?.length && at && <span className="text-xs tabular-nums text-slate-400">block {at.index + 1} of {blocks.length} · {fmt(at.leftInBlock)}</span>}
      <div className="ml-auto flex gap-1">
        {left > 0 && (
          <Button size="icon-md" onClick={() => (running ? (setEndAt(null)) : setEndAt(Date.now() + left * 1000))} aria-label={running ? "Pause" : "Start"} title={running ? "Pause" : "Start"}>
            <Icon name={running ? "pause" : "play"} size={14} />
          </Button>
        )}
        <Button size="icon-md" onClick={() => { setEndAt(null); setLeft(total); }} aria-label="Reset timer" title="Reset" disabled={!running && left === total}>
          <Icon name="rotate-ccw" size={14} />
        </Button>
      </div>
    </div>
  );
}
