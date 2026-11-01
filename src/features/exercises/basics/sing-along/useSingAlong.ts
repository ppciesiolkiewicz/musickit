"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { getSharedPiano, onSilence, wakeAudio } from "@/features/sound";
import { hzToMidi } from "@/features/theory/singing";
import { CHORD_VELOCITY, type MelodyChord } from "@/features/theory/melodyChords";
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
 * once) with the piano under it unless muted, Stop puts it back at the start. The voice is kept as a trail on the
 * stream's beats while the bar runs; passes and trail long gone by are dropped. A new tune is a new mount (key it).
 */
export function useSingAlong({ notes, chords, beatMs, total }: { notes: PlacedNote[]; chords: MelodyChord[]; beatMs: number; total: number }) {
  const [mic, setMic] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loop, setLoopState] = useState(true);
  const [region, setRegionState] = useState<Region>({ from: 0, to: total });
  const active = loop ? region : null;

  // the clock's state lives in refs, read by the timers and the frame loop; `frame` is what is drawn
  const t0 = useRef(0);
  const run = useRef(false);
  const [first] = useState(() => fill([], { from: 0, to: total }, AHEAD, notes, chords, total));
  const passes = useRef<Pass[]>(first);
  const trail = useRef<TrailPoint[]>([]);
  const scheduled = useRef(0);
  const ons = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mutedRef = useRef(muted);
  const activeRef = useRef(active);
  const pitch = useRef<number | null>(null);
  const smoother = useRef(createSmoother());
  const gaps = useRef(0);
  const [frame, setFrame] = useState<Frame>({ s: 0, passes: first, trail: [], midi: null });

  const beatNow = useCallback(() => (run.current ? (performance.now() - t0.current) / beatMs : 0), [beatMs]);
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

  /** cancel the notes not yet sounding and hush the ones ringing */
  const hush = useCallback(() => {
    ons.current.forEach(clearTimeout);
    ons.current = [];
    getSharedPiano().allOff();
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

  /** for the audio focus, once it lands: the element whose leaving the screen stops the tune */
  const focus = useCallback((el: HTMLElement | null) => void el, []);
  // another sequence silencing the piano stops this one too
  useEffect(() => onSilence(() => run.current && stop()), [stop]);

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
      const horizon = s + LOOK_MS / beatMs;
      const now = performance.now();
      const put = (note: number, at: number, beats: number, velocity?: number) => {
        if (at < scheduled.current || at >= horizon) return;
        const wait = Math.max(0, t0.current + at * beatMs - now);
        const hold = beats * beatMs * 0.9;
        ons.current.push(setTimeout(() => {
          if (mutedRef.current || !run.current) return;
          piano.noteOn(note, velocity);
          setTimeout(() => piano.noteOff(note), hold);
        }, wait));
      };
      for (const p of passes.current) {
        if (p.start >= horizon || passEnd(p) <= scheduled.current) continue;
        p.notes.forEach((n) => put(notes[n.i].midi, p.start + n.at, n.beats));
        p.chords.forEach((c) => chords[c.i].midis.forEach((m) => put(m, p.start + c.at, c.beats, CHORD_VELOCITY)));
      }
      scheduled.current = horizon;
      ons.current = ons.current.slice(-256);
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [playing, beatNow, beatMs, notes, chords, total, stop]);

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

  return {
    frame,
    focus,
    status,
    mic,
    playing,
    muted,
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
    toggleMute: () => {
      micOn();
      mutedRef.current = !muted;
      if (!muted) getSharedPiano().allOff();
      setMuted(!muted);
    },
    setLoop: (on: boolean) => {
      setLoopState(on);
      setActive(on ? region : null);
    },
    setRegion: (r: Region) => {
      setRegionState(r);
      if (loop) setActive(r);
    },
  };
}
