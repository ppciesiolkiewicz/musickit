import type { KitNote } from "@/features/exercises/cues/cueNotes";
import type { TakeNote } from "@/features/neckFx/model/cvFx";
import type { Piece } from "./clock";

const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;

/** The clock of a take made with the click only: beat 0 at `downbeat` seconds, then on at `bpm`. */
export function clickClock(downbeat: number, bpm: number): Piece[] {
  return [[0, round((-downbeat * bpm) / 60, 3), round(bpm / 60, 4)]];
}

/**
 * The tool's notes at the times they sound in a take. Each running piece of the clock covers a stretch of beats; every
 * note (repeated each `loopBeats` when the tool loops) whose beat falls in that stretch starts at its time in the video.
 * A stopped piece has no notes.
 */
export function takeNotes(notes: KitNote[], loopBeats: number | null, clock: Piece[], seconds: number): TakeNote[] {
  const out: TakeNote[] = [];
  clock.forEach(([t, beat, rate], i) => {
    if (beat === null || rate <= 0) return;
    const tEnd = Math.min(clock[i + 1]?.[0] ?? seconds, seconds);
    if (tEnd <= t) return;
    const bEnd = beat + rate * (tEnd - t);
    for (const n of notes) {
      const first = loopBeats && loopBeats > 0 ? Math.max(0, Math.ceil((beat - n.beat) / loopBeats)) : 0;
      for (let k = first; ; k++) {
        const nb = n.beat + (loopBeats && loopBeats > 0 ? k * loopBeats : 0);
        if (nb >= bEnd) break;
        if (nb >= beat) {
          const start = t + (nb - beat) / rate;
          out.push({ start, end: start + n.beats / rate, midi: n.midi, string: n.string, fret: n.fret, finger: n.finger });
        }
        if (!loopBeats || loopBeats <= 0) break;
      }
    }
  });
  return out.sort((a, b) => a.start - b.start);
}
