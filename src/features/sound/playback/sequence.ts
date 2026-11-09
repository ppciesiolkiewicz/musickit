import { createPlayer, type Player } from "../engine/player";
import { audioSettled, wakeAudio } from "../engine/context";
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
const silenceListeners = new Set<() => void>();

/** Stop everything the sequences started and cancel notes that have not sounded yet. */
export function silence(): void {
  generation++;
  timers.forEach(clearTimeout);
  timers = [];
  used.forEach((p) => p.allOff());
  used.clear();
  silenceListeners.forEach((fn) => fn());
}

/** Hear when the sequences are silenced (a stop, or a new sequence replacing the one playing). Returns the unsubscribe. */
export function onSilence(fn: () => void): () => void {
  silenceListeners.add(fn);
  return () => silenceListeners.delete(fn);
}

let generation = 0;
const ready = new WeakSet<Player>();

/**
 * Play timed notes on a player (the shared piano by default). A new sequence replaces the one playing. The notes wait for
 * the output to run and settle, every time (it can stop again: a tab in the background, a new speaker), and the first time a
 * player is used for its samples to load, so the opening notes of a short sequence (an interval of two) are not lost,
 * crackled or stacked by a suspended context or a sample still downloading.
 */
export function playSequence(steps: Step[], player: Player = getSharedPiano()): void {
  silence();
  const mine = ++generation;
  const go = () => {
    if (mine !== generation) return; // replaced or silenced while waiting
    used.add(player);
    steps.forEach((s) => {
      timers.push(setTimeout(() => player.noteOn(s.note, s.velocity), s.at));
      timers.push(setTimeout(() => player.noteOff(s.note), s.at + s.hold));
    });
  };
  if (ready.has(player) && audioSettled()) return go();
  void Promise.all([wakeAudio(), player.preload().catch(() => undefined)]).then(() => {
    ready.add(player);
    go();
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
