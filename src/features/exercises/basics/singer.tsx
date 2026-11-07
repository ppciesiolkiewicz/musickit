"use client";

import { useMemo, useState } from "react";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import { VOICES, buildLadder, clefFor, tuneLadderFor, type Range, type Voice } from "@/features/theory/singing";
import { BOOK, RUNS, placeRun, placeTune, runPasses } from "@/features/theory/singingMelodies";
import { harmoniseRun, harmoniseTune, type MelodyChord } from "@/features/theory/melodyChords";
import { BEATS_PER_BAR } from "@/features/theory/singingMelody";
import SingAlong from "./sing-along/SingAlong";

const BPM = 90;
const TAP_MS = 900;

/**
 * One tune (or run) from the singing page's books, in a key and voice, sung along (`SingAlong`): play it on a loop over
 * the whole tune or a part of it, muted or heard, on an endless staff or a piano roll; tap a note to hear it. With `chords` (the default) the piano plays a chord a bar under it, named
 * over the staff, a run opens with a bar of its first key's I and V and announces each new key in its held-Do bar; with `metronome` the click is heard from the start (it can be
 * switched on and off in the player either way). A run spans the voice, its last pass topping out on the range's top, so it
 * starts in the key that gives (`pc` is only a tune's); its title names the pass playing and its key. The singing page's
 * placement; nothing writes the address.
 */
export function SingerView({ n, pc = 0, voice = "soprano", chords = true, metronome = false }: { n: number; pc?: number; voice?: Voice; chords?: boolean; metronome?: boolean }) {
  const tune = BOOK.find((t) => t.n === n) ?? RUNS.find((t) => t.n === n);
  const range = VOICES[voice] ?? VOICES.soprano;
  const clef = clefFor(range);
  const { ladder, passes, notes, harmony } = useMemo(() => {
    const ladderIn = (k: number, r: Range) => tuneLadderFor(buildLadder("major-ionian", k, r)!, k, r);
    const none: MelodyChord[] = [];
    if (!tune) return { ladder: ladderIn(pc, range), passes: [], notes: [], harmony: none };
    if (tune.keys) {
      const passes = runPasses(tune.notes, tune.keys, ladderIn, range);
      const ladder = ladderIn(passes[0].pc, range);
      if (chords) {
        // a bar of the first key's I and V before the run, so the key is heard before the singing starts
        const h = harmoniseRun(tune.notes, tune.keys, ladderIn, range, { intro: true });
        const later = passes.map((p) => ({ ...p, notes: p.notes.map((x) => ({ ...x, at: x.at + BEATS_PER_BAR })) }));
        return { ladder, passes: later, notes: h.notes, harmony: h.chords };
      }
      return { ladder, passes, notes: placeRun(tune.notes, tune.keys, ladderIn, range), harmony: none };
    }
    const ladder = ladderIn(pc, range);
    if (chords) {
      const h = harmoniseTune(tune.notes, ladder, range);
      return { ladder, passes: [], notes: h.notes, harmony: h.chords };
    }
    return { ladder, passes: [], notes: placeTune(tune.notes, ladder, range), harmony: none };
  }, [tune, pc, range, chords]);
  const beat = 60000 / BPM;
  const [tapped, setTapped] = useState<number | null>(null);
  if (!tune || !notes.length) return null;
  const tap = async (i: number) => {
    await wakeAudio();
    const midi = notes[i].midi;
    const piano = getSharedPiano();
    piano.noteOn(midi);
    setTapped(i);
    setTimeout(() => {
      piano.noteOff(midi);
      setTapped((p) => (p === i ? null : p));
    }, TAP_MS);
  };
  return (
    <SingAlong key={`${n}-${pc}-${voice}-${chords}-${metronome}`} notes={notes} chords={harmony} ladder={ladder} clef={clef} beatMs={beat} click={metronome} tapped={tapped} onNote={(i) => void tap(i)}
      info={passes.length ? (at) => {
        // the pass playing, by its first beat; stopped, the keys the run goes through
        const k = at === null ? -1 : passes.findLastIndex((p) => p.notes[0].at <= at);
        const where = k < 0 ? `${passes.length} keys · ${passes[0].ladder.title} up to ${passes.at(-1)!.ladder.title}` : `Pass ${k + 1} of ${passes.length} · ${passes[k].ladder.title}`;
        return <>{tune.stage.title} · {where} · {range.label} · {BPM} bpm</>;
      } : <>Melody #{tune.n} · {tune.stage.title} · {ladder.title} · {range.label} · {BPM} bpm</>} />
  );
}
