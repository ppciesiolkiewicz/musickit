"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onSilence, playMelody, silence } from "@/features/sound";
import { playTimed as playTimedNotes } from "@/lib/chordKit/playback";

/**
 * Play notes one after another on the shared piano and say which one is sounding, so a page can light it up.
 * Each note carries a key the page chooses ("3-5" for string 3 fret 5, "d2" for the 3rd degree); `active` is the key of the note now playing.
 * `running` is the id of the run now playing (a page with several ▶ buttons passes its own ids), so its button can turn into a stop.
 */
export function useNotePlayer() {
  const [active, setActive] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);
  // a stop, or any other sound, ends the highlighting too (play and playTimed silence first, then set their own timers)
  useEffect(() => onSilence(() => {
    clear();
    setActive(null);
    setRunning(null);
  }), []);

  const play = useCallback((notes: { key: string; midi: number }[], stepMs = 260, id: string | null = "run") => {
    clear();
    playMelody(notes.map((n) => n.midi), stepMs);
    setRunning(id);
    notes.forEach((n, i) => timers.current.push(setTimeout(() => setActive(n.key), i * stepMs)));
    timers.current.push(setTimeout(() => {
      setActive(null);
      setRunning(null);
    }, notes.length * stepMs));
  }, []);

  /** Notes of their own lengths (a tune rather than a scale run), each held for most of its length. */
  const playTimed = useCallback((notes: { key: string; midi: number; ms: number; velocity?: number }[], tuneId?: string) => {
    clear();
    let at = 0;
    const starts = notes.map((n) => (at += n.ms) - n.ms);
    playTimedNotes(notes, tuneId);
    notes.forEach((n, i) => timers.current.push(setTimeout(() => setActive(n.key), starts[i])));
    timers.current.push(setTimeout(() => setActive(null), at));
  }, []);

  /** One note, held a little longer. */
  const tap = useCallback((key: string, midi: number) => play([{ key, midi }], 700, null), [play]);

  /** Stop whatever is sounding; the highlighting and `running` clear with it. */
  const stop = useCallback(() => silence(), []);

  return { active, running, play, playTimed, tap, stop };
}

export type NotePlayer = ReturnType<typeof useNotePlayer>;
