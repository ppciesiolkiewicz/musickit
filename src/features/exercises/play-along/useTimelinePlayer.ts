"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAudioContext, getOutputBus, getSharedPiano, wakeAudio } from "@/features/sound";
import { ClickTrack } from "@/features/instruments";
import { cuesOf } from "../cues/cues";
import { BEATS_PER_BAR } from "../timeline/timeline";
import type { Timeline } from "../timeline/types";
import { barEvents, gridAnchor, isFinished, nextBarAt } from "./schedule";

const STRUM_GAP_MS = 18;
/** ClickTrack schedules clicks this far ahead (its LOOKAHEAD, 0.12 s) plus a margin: re-anchor before then. */
const REGRID_LEAD = 0.2;

/**
 * Plays a timeline: one `ClickTrack` on the audio clock, and the timeline's cues on the shared piano. Each bar's notes
 * are queued a whole bar ahead (as `CompPlayer`). `beat` is the click's beat index (0 = first beat, counting on through
 * loops), -1 when stopped. `setTempo` and a new timeline (e.g. another backing) apply from the next bar queued. A tempo
 * change re-anchors the click (`gridAnchor`) before it schedules that bar's downbeat, so click, notes and playhead
 * stay on one grid.
 */
export function useTimelinePlayer(t: Timeline): { playing: boolean; starting: boolean; beat: number; start(): Promise<void>; stop(): void; setTempo(bpm: number): void } {
  const cues = useMemo(() => cuesOf(t), [t]);
  const live = useRef({ t, cues, bpm: t.bpm });
  useEffect(() => {
    live.current = { ...live.current, t, cues };
  }, [t, cues]);
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [beat, setBeat] = useState(-1);
  const stopper = useRef<(() => void) | null>(null);
  /** bumped by every start and stop: a start that finds it changed after an await gives up */
  const gen = useRef(0);
  const mounted = useRef(true);

  const stop = useCallback(() => {
    gen.current++;
    stopper.current?.();
    stopper.current = null;
    if (!mounted.current) return;
    setPlaying(false);
    setStarting(false);
    setBeat(-1);
  }, []);
  useEffect(() => {
    mounted.current = true;
    const g = gen, s = stopper;
    return () => {
      mounted.current = false;
      g.current++;
      s.current?.();
      s.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    stopper.current?.();
    stopper.current = null;
    const mine = ++gen.current;
    setStarting(true);
    await wakeAudio();
    const piano = getSharedPiano();
    await piano.preload().catch(() => undefined);
    if (mine !== gen.current || !mounted.current) return;
    setStarting(false);

    const ctx = getAudioContext();
    const click = new ClickTrack(ctx, getOutputBus());
    const params = (b: number) => ({ bpm: b, beatsPerBar: BEATS_PER_BAR, volume: 0.6 });
    let bpm = live.current.bpm;
    let barAt = ctx.currentTime + 0.1; // audio time of the next bar to queue
    click.start(params(bpm), barAt);
    let stopped = false;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let bar = 0;
    let raf = 0;
    const after = (ms: number, f: () => void) => timers.push(setTimeout(f, Math.max(0, ms)));

    const queue = () => {
      if (stopped) return;
      const { t: tl, cues: cs, bpm: want } = live.current;
      if (isFinished(bar * BEATS_PER_BAR, tl)) {
        after((barAt - ctx.currentTime) * 1000, () => stopper.current === halt && stop());
        return;
      }
      if (want !== bpm) {
        bpm = want;
        const at = barAt, n = bar, b = bpm;
        // before the click looks ahead to this bar's downbeat; if late, the old grid already has it, so skip it
        after((at - REGRID_LEAD - ctx.currentTime) * 1000, () => {
          if (stopped) return;
          const late = ctx.currentTime + 0.12 >= at - 1e-3;
          click.start(params(b), gridAnchor(at, n, b), late ? at + 1e-3 : at - 1e-3);
        });
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
      const thisBar = barAt;
      bar++;
      barAt = nextBarAt(barAt, bpm);
      // the next bar is queued as this one starts: a whole bar ahead
      after((thisBar - ctx.currentTime) * 1000 - 40, queue);
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
    queue();
    tick();
  }, [stop]);

  const setTempo = useCallback((bpm: number) => {
    live.current.bpm = bpm;
  }, []);

  return { playing, starting, beat, start, stop, setTempo };
}
