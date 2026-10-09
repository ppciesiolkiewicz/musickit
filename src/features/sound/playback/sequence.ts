import { createPlayer, type Player } from "../engine/player";
import type { NoteLike } from "../engine/notes";

let shared: Player | null = null;

/** The app's shared piano: what the chord, scale and arpeggio pages play through. */
export function getSharedPiano(): Player {
  if (!shared) {
    shared = createPlayer({ instrumentId: "PIANO" });
    void shared.preload().catch(() => undefined);
  }
  return shared;
}

export interface Step {
  note: NoteLike;
  /** ms from the start of the sequence */
  at: number;
  /** ms the note is held */
  hold: number;
  velocity?: number;
}

let timers: ReturnType<typeof setTimeout>[] = [];
const used = new Set<Player>();

/** Stop everything the sequences started and cancel notes that have not sounded yet. */
export function silence(): void {
  timers.forEach(clearTimeout);
  timers = [];
  used.forEach((p) => p.allOff());
  used.clear();
}

/** Play timed notes on a player (the shared piano by default). A new sequence replaces the one playing. */
export function playSequence(steps: Step[], player: Player = getSharedPiano()): void {
  silence();
  used.add(player);
  steps.forEach((s) => {
    timers.push(setTimeout(() => player.noteOn(s.note, s.velocity), s.at));
    timers.push(setTimeout(() => player.noteOff(s.note), s.at + s.hold));
  });
}

/** Notes one after another, each held for most of its slot (a scale, an arpeggio, a motive). */
export function playMelody(notes: NoteLike[], stepMs = 300, player?: Player): void {
  playSequence(notes.map((note, i) => ({ note, at: i * stepMs, hold: stepMs * 0.9 })), player);
}

/** Notes strummed low to high: each starts `gapMs` after the last and all ring for `holdMs`. */
export function strum(notes: NoteLike[], opts: { gapMs?: number; holdMs?: number } = {}, player?: Player): void {
  const { gapMs = 45, holdMs = 1400 } = opts;
  playSequence(notes.map((note, i) => ({ note, at: i * gapMs, hold: holdMs })), player);
}
