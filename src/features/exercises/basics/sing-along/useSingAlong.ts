"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { useStepPart } from "@/components/practice/exerciseStep";
import { clickAt } from "@/features/instruments/model";
import { getAudioContext, getOutputBus, getSharedPiano, onSilence, useAudioFocus, wakeAudio } from "@/features/sound";
import { hzToMidi } from "@/features/theory/singing";
import { CHORD_VELOCITY, type MelodyChord } from "@/features/theory/melodyChords";
import { BEATS_PER_BAR } from "@/features/theory/singingMelody";
import type { PlacedNote } from "@/features/theory/singingMelodies";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { fill, passEnd, prune, retime, type Pass, type Region } from "./passes";

/** frames without a pitch before the voice counts as gone */
const GAP_FRAMES = 6;
/** how far ahead the piano's notes are put on timers */
const LOOK_MS = 200;
const TICK_MS = 25;
/** stream beats of passes kept ahead of the bar, and of passes and trail kept behind it */
const AHEAD = 48;
const BEHIND = 32;
/** the first note sounds this long after Play */
const START_MS = 60;
const CLICK_VOLUME = 0.5;

/** what of the tune is heard: the piano's tune, its chords, the metronome on the tune's beats (beat 1 of a bar accented) */
export interface Heard {
  tune: boolean;
  chords: boolean;
  click: boolean;
}
export type Layer = keyof Heard;

/** where the voice was at a stream beat: its fractional MIDI note, or null for a gap that breaks the line */
export interface TrailPoint {
  s: number;
  midi: number | null;
}

export interface Frame {
  /** the bar, in stream beats */
  s: number;
  passes: Pass[];
  trail: TrailPoint[];
  /** the voice now, as a fractional MIDI note */
  midi: number | null;
}

/**
 * One clock for a tune sung along: Play runs the bar over the passes (the loop region again and again, or the whole tune
 * once) with what is heard of it (`Heard`, each switched on and off while it runs), Stop puts it back at the start. The voice is kept as a trail on the
 * stream's beats while the bar runs; passes and trail long gone by are dropped. A new tune is a new mount (key it); a new
 * `beatMs` is not: the bar keeps its place and runs on at the new tempo.
 */
export function useSingAlong({ notes, chords, beatMs, total, click = false, loopControl = true, listen = false }: {
  notes: PlacedNote[]; chords: MelodyChord[]; beatMs: number; total: number; click?: boolean;
  /** the host's word on the mic: it goes on when this turns true (or the tune mounts with it) and off when it turns false; the mic button still works between */
  listen?: boolean;
  /** false while the loop control is hidden: the clock loops the whole tune (the default), and the loop and region picked come back when it shows */
  loopControl?: boolean;
}) {
  const [mic, setMic] = useState(listen);
  const [heeded, setHeeded] = useState(listen);
  if (heeded !== listen) {
    setHeeded(listen);
    setMic(listen);
  }
  const [playing, setPlaying] = useState(false);
  const [heard, setHeard] = useState<Heard>({ tune: true, chords: true, click });
  const [loop, setLoopState] = useState(true);
  const [region, setRegionState] = useState<Region>({ from: 0, to: total });
  const activeFor = (on: boolean, picked: Region): Region | null => (!loopControl ? { from: 0, to: total } : on ? picked : null);
  const active = activeFor(loop, region);

  // the clock's state lives in refs, read by the timers and the frame loop; `frame` is what is drawn
  const t0 = useRef(0);
  const run = useRef(false);
  const [first] = useState(() => fill([], { from: 0, to: total }, AHEAD, notes, chords, total));
  const passes = useRef<Pass[]>(first);
  const trail = useRef<TrailPoint[]>([]);
  const scheduled = useRef(0);
  const ons = useRef<ReturnType<typeof setTimeout>[]>([]);
  const heardRef = useRef(heard);
  /** the metronome's gain, made on the first click and dropped (cutting the clicks put ahead) by `hush` */
  const clickOut = useRef<GainNode | null>(null);
  const activeRef = useRef(active);
  const pitch = useRef<number | null>(null);
  const smoother = useRef(createSmoother());
  const gaps = useRef(0);
  const [frame, setFrame] = useState<Frame>({ s: 0, passes: first, trail: [], midi: null });

  // the clock's tempo, moved by the effect below so the bar keeps its place when the tempo changes
  const beat = useRef(beatMs);
  const beatNow = useCallback(() => (run.current ? (performance.now() - t0.current) / beat.current : 0), []);
  const draw = useCallback(() => {
    setFrame({ s: beatNow(), passes: passes.current, trail: [...trail.current], midi: pitch.current });
  }, [beatNow]);

  const onPitch = useCallback((p: Pitch | null) => {
    if (!p) {
      if (++gaps.current >= GAP_FRAMES) {
        pitch.current = null;
        smoother.current.reset();
      }
      return;
    }
    gaps.current = 0;
    pitch.current = hzToMidi(smoother.current.push(p));
  }, []);
  const { status } = useMicPitch(mic, undefined, onPitch);

  /** cancel the notes and clicks not yet sounding and hush the ones ringing */
  const hush = useCallback(() => {
    ons.current.forEach(clearTimeout);
    ons.current = [];
    getSharedPiano().allOff();
    clickOut.current?.disconnect();
    clickOut.current = null;
  }, []);

  const restart = useCallback(() => {
    passes.current = fill([], activeRef.current, AHEAD, notes, chords, total);
    trail.current = [];
    scheduled.current = 0;
  }, [notes, chords, total]);

  const stop = useCallback(() => {
    run.current = false;
    hush();
    restart();
    setPlaying(false);
    draw();
  }, [hush, restart, draw]);

  // leaving cuts the piano
  useEffect(() => hush, [hush]);

  // in an exercise step, "Start exercise" plays the tune (and so the mic) and its Stop stops both
  const group = useStepPart({ kind: "tune", on: playing || mic, start: () => play(), stop: () => {
    stop();
    setMic(false);
  } });
  const focus = useAudioFocus(playing, stop, group);
  // another sequence silencing the piano stops this one too
  useEffect(() => onSilence(() => run.current && stop()), [stop]);

  // a new tempo while the bar runs: the bar stays on its beat, what was put ahead is put again at the new tempo (a note
  // ringing rings on); the next tick puts them
  useLayoutEffect(() => {
    if (beat.current === beatMs) return;
    if (run.current) {
      const now = performance.now();
      const s = (now - t0.current) / beat.current;
      t0.current = now - s * beatMs;
      ons.current.forEach(clearTimeout);
      ons.current = [];
      clickOut.current?.disconnect();
      clickOut.current = null;
      scheduled.current = s;
    }
    beat.current = beatMs;
  }, [beatMs]);

  // the piano: notes put on timers a little ahead, the passes kept ahead of the bar
  useEffect(() => {
    if (!playing) return;
    const piano = getSharedPiano();
    const tick = () => {
      if (!run.current) return;
      const s = beatNow();
      passes.current = fill(prune(passes.current, s - BEHIND), activeRef.current, s + AHEAD, notes, chords, total);
      const last = passes.current[passes.current.length - 1];
      if (!activeRef.current && last && s >= passEnd(last)) return stop();
      const beatMs = beat.current;
      const horizon = s + LOOK_MS / beatMs;
      const now = performance.now();
      const due = (at: number) => at >= scheduled.current && at < horizon;
      const put = (layer: "tune" | "chords", note: number, at: number, beats: number, velocity?: number) => {
        if (!due(at)) return;
        const wait = Math.max(0, t0.current + at * beatMs - now);
        const hold = beats * beatMs * 0.9;
        ons.current.push(setTimeout(() => {
          if (!heardRef.current[layer] || !run.current) return;
          piano.noteOn(note, velocity);
          setTimeout(() => piano.noteOff(note), hold);
        }, wait));
      };
      // the clicks go on the audio clock, always put, heard through their gain; on the tune's own beats, so a loop
      // that starts mid-bar keeps its accents on the tune's beat 1
      const ctx = getAudioContext();
      if (!clickOut.current) {
        clickOut.current = ctx.createGain();
        clickOut.current.gain.value = heardRef.current.click ? CLICK_VOLUME : 0;
        clickOut.current.connect(getOutputBus());
      }
      const beatClick = (at: number, beat: number) => {
        if (!due(at)) return;
        const t = ctx.currentTime + (t0.current + at * beatMs - now) / 1000;
        if (t >= ctx.currentTime - 0.005) clickAt(ctx, clickOut.current!, Math.max(t, ctx.currentTime), beat % BEATS_PER_BAR === 0);
      };
      for (const p of passes.current) {
        if (p.start >= horizon || passEnd(p) <= scheduled.current) continue;
        p.notes.forEach((n) => put("tune", notes[n.i].midi, p.start + n.at, n.beats));
        p.chords.forEach((c) => chords[c.i].midis.forEach((m) => put("chords", m, p.start + c.at, c.beats, CHORD_VELOCITY)));
        for (let b = Math.ceil(p.from); b < p.to; b++) beatClick(p.start + b - p.from, b);
      }
      scheduled.current = horizon;
      ons.current = ons.current.slice(-256);
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [playing, beatNow, notes, chords, total, stop]);

  // the drawing: every frame while the bar runs or the mic listens
  useEffect(() => {
    if (!playing && !mic) return;
    let raf = 0;
    const tick = () => {
      if (run.current) {
        const s = beatNow();
        const t = trail.current;
        const m = pitch.current;
        // a gap is kept once, to break the line
        if (m !== null || (t.length && t[t.length - 1].midi !== null)) t.push({ s, midi: m });
        while (t.length && t[0].s < s - BEHIND) t.shift();
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, mic, beatNow, draw]);

  const micOn = () => {
    if (!mic) {
      pitch.current = null;
      setMic(true);
    }
  };

  const play = async () => {
    micOn();
    hush();
    const piano = getSharedPiano();
    await Promise.all([wakeAudio(), piano.preload().catch(() => undefined)]);
    restart();
    t0.current = performance.now() + START_MS;
    run.current = true;
    setPlaying(true);
    draw();
  };

  const setActive = (r: Region | null) => {
    activeRef.current = r;
    if (run.current) {
      const s = beatNow();
      // what was put on timers is put again from the new passes; a note ringing rings on
      ons.current.forEach(clearTimeout);
      ons.current = [];
      scheduled.current = s;
      passes.current = fill(retime(passes.current, s, r, notes, chords, total), r, s + AHEAD, notes, chords, total);
    } else restart();
    draw();
  };
  // the loop control hidden or shown again: the clock moves to the default (the whole tune) or back to what was picked
  const shownBefore = useRef(loopControl);
  useEffect(() => {
    if (shownBefore.current === loopControl) return;
    shownBefore.current = loopControl;
    setActive(activeFor(loop, region));
  });

  return {
    frame,
    focus,
    status,
    mic,
    playing,
    loop,
    region,
    play,
    stop: () => {
      micOn();
      stop();
    },
    toggleMic: () => {
      pitch.current = null;
      setMic((v) => !v);
    },
    heard,
    /** switch one of what is heard on or off; a piano layer switched off hushes what rings (the other's next notes sound) */
    toggleHeard: (layer: Layer) => {
      micOn();
      const next = { ...heard, [layer]: !heard[layer] };
      heardRef.current = next;
      if (layer === "click") clickOut.current?.gain.setTargetAtTime(next.click ? CLICK_VOLUME : 0, getAudioContext().currentTime, 0.01);
      else if (!next[layer]) getSharedPiano().allOff();
      setHeard(next);
    },
    setLoop: (on: boolean) => {
      setLoopState(on);
      setActive(activeFor(on, region));
    },
    setRegion: (r: Region) => {
      setRegionState(r);
      if (loop && loopControl) setActive(r);
    },
  };
}
