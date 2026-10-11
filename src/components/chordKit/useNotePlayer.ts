"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playMelody } from "@/features/sound";

/**
 * Play notes one after another on the shared piano and say which one is sounding, so a page can light it up.
 * Each note carries a key the page chooses ("3-5" for string 3 fret 5, "d2" for the 3rd degree); `active` is the key of the note now playing.
 */
export function useNotePlayer() {
  const [active, setActive] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  const play = useCallback((notes: { key: string; midi: number }[], stepMs = 260) => {
    clear();
    playMelody(notes.map((n) => n.midi), stepMs);
    notes.forEach((n, i) => timers.current.push(setTimeout(() => setActive(n.key), i * stepMs)));
    timers.current.push(setTimeout(() => setActive(null), notes.length * stepMs));
  }, []);

  /** One note, held a little longer. */
  const tap = useCallback((key: string, midi: number) => play([{ key, midi }], 700), [play]);

  return { active, play, tap };
}

export type NotePlayer = ReturnType<typeof useNotePlayer>;
