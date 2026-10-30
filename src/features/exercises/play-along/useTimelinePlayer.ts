"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAudioContext, getOutputBus, getSharedPiano, wakeAudio } from "@/features/sound";
import { ClickTrack } from "@/features/instruments";
import { cuesOf } from "../cues/cues";
import { BEATS_PER_BAR } from "../timeline/timeline";
import type { Timeline } from "../timeline/types";
import { barEvents, isFinished } from "./schedule";

const STRUM_GAP_MS = 18;

/**
 * Plays a timeline: one `ClickTrack` on the audio clock, and the timeline's cues on the shared piano, scheduled one bar
 * ahead from the click's anchor with `setTimeout` (as `CompPlayer`). `beat` is the click's beat index (0 = first beat,
 * counting on through loops), -1 when stopped. A new timeline (e.g. another backing) and `setTempo` apply from the next bar.
 */
export function useTimelinePlayer(t: Timeline): { playing: boolean; beat: number; start(): Promise<void>; stop(): void; setTempo(bpm: number): void } {
  const cues = useMemo(() => cuesOf(t), [t]);
  const live = useRef({ t, cues, bpm: t.bpm });
  useEffect(() => {
    live.current = { ...live.current, t, cues };
  }, [t, cues]);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const stopper = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopper.current?.();
    stopper.current = null;
    setPlaying(false);
    setBeat(-1);
  }, []);
  useEffect(() => () => stopper.current?.(), []);

  const start = useCallback(async () => {
    stopper.current?.();
    await wakeAudio();
    const piano = getSharedPiano();
    await piano.preload().catch(() => undefined);
    const ctx = getAudioContext();
    const click = new ClickTrack(ctx, getOutputBus());
    let bpm = live.current.bpm;
    const params = (b: number) => ({ bpm: b, beatsPerBar: BEATS_PER_BAR, volume: 0.6 });
    let barAt = ctx.currentTime + 0.1; // audio time of the bar being scheduled
    click.start(params(bpm), barAt);
    let stopped = false;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let bar = 0;
    let raf = 0;
    const after = (ms: number, f: () => void) => timers.push(setTimeout(f, Math.max(0, ms)));

    const next = () => {
      if (stopped) return;
      const { t: tl, cues: cs, bpm: want } = live.current;
      if (isFinished(bar * BEATS_PER_BAR, tl)) {
        after((barAt - ctx.currentTime) * 1000, () => stopper.current === halt && stop());
        return;
      }
      if (want !== bpm) {
        bpm = want;
        click.set(params(bpm)); // keeps the due beat (this bar's downbeat) in place
      }
      const beatMs = 60000 / bpm;
      const lead = (barAt - ctx.currentTime) * 1000;
      const barStart = (((bar % tl.bars) + tl.bars) % tl.bars) * BEATS_PER_BAR;
      for (const c of barEvents(cs, bar, tl.bars)) {
        c.midi.forEach((m, k) => {
          const on = lead + (c.at - barStart) * beatMs + (c.midi.length > 1 ? k * STRUM_GAP_MS : 0);
          const vel = c.kind === "backing" ? 0.5 : c.midi.length === 1 ? 0.8 : 0.65;
          after(on, () => piano.noteOn(m, vel));
          after(on + c.beats * beatMs * 0.95, () => piano.noteOff(m));
        });
      }
      bar++;
      barAt += (BEATS_PER_BAR * 60) / bpm;
      after((barAt - ctx.currentTime) * 1000 - 40, next);
    };
    const tick = () => {
      if (stopped) return;
      setBeat(click.beat()?.index ?? -1);
      raf = requestAnimationFrame(tick);
    };
    const halt = () => {
      stopped = true;
      timers.forEach(clearTimeout);
      timers = [];
      cancelAnimationFrame(raf);
      piano.allOff();
      click.stop();
    };
    stopper.current = halt;
    setPlaying(true);
    next();
    tick();
  }, [stop]);

  const setTempo = useCallback((bpm: number) => {
    live.current.bpm = bpm;
  }, []);

  return { playing, beat, start, stop, setTempo };
}
