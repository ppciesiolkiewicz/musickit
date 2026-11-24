/**
 * Turns a recorded take into riff notes: the tuner's pitch detector says which note sounds in each ~20 ms frame, the rhythm game's
 * onset detector says when a string is picked, and the notes found are snapped to the riff's tempo. One note at a time only: a chord
 * has no single pitch, so it is skipped. Pure, no browser APIs.
 */
import { detectPitch } from "@/features/tuner/pitch";
import { createOnsetDetector } from "@/features/rhythm/onset";
import { placeNear, placesOf, type RiffNote } from "./riff";

/** One note heard in a take: when it starts and ends (seconds) and its pitch. */
export interface Heard { start: number; end: number; midi: number }

/** The notes of a mono recording, in order. */
export function hearNotes(samples: Float32Array, sampleRate: number): Heard[] {
  // a frame of about 43 ms holds three periods of the low E; frames overlap by half
  const frame = 2 ** Math.round(Math.log2(sampleRate * 0.043));
  const step = frame / 2;
  const pitch: (number | null)[] = [];
  for (let at = 0; at + frame <= samples.length; at += step) {
    const p = detectPitch(samples.subarray(at, at + frame), sampleRate, { minHz: 70, maxHz: 1100, minRms: 0.01 });
    const midi = p ? Math.round(69 + 12 * Math.log2(p.freq / 440)) : null;
    pitch.push(midi !== null && placesOf(midi).length ? midi : null);
  }
  // one odd frame between two that agree is a misreading
  for (let i = 1; i < pitch.length - 1; i++) if (pitch[i - 1] === pitch[i + 1] && pitch[i] !== pitch[i - 1]) pitch[i] = pitch[i - 1];

  const onsets = createOnsetDetector(sampleRate).push(samples, 0);
  const onsetIn = (from: number, to: number) => onsets.filter((t) => t > from && t < to);
  const time = (f: number) => (f * step) / sampleRate;

  // runs of one pitch at least two frames long
  const runs: Heard[] = [];
  for (let i = 0; i < pitch.length;) {
    let j = i;
    while (j < pitch.length && pitch[j] === pitch[i]) j++;
    const midi = pitch[i];
    if (midi !== null && j - i >= 2) {
      const last = runs[runs.length - 1];
      const start = time(i), end = time(j);
      // the same note after a short dropout is one note, unless it was picked again
      if (last && last.midi === midi && start - last.end <= time(3) && !onsetIn(last.end - 0.03, start + 0.03).length) last.end = end;
      else runs.push({ start, end, midi });
    }
    i = j;
  }

  // a pick inside a held pitch is the same note played again
  const out: Heard[] = [];
  for (const r of runs) {
    let from = r.start;
    for (const t of onsetIn(r.start + 0.06, r.end - 0.06)) { out.push({ start: from, end: t, midi: r.midi }); from = t; }
    out.push({ start: from, end: r.end, midi: r.midi });
  }
  // the pick comes a moment before the pitch is clear: start the note there
  for (const h of out) {
    const near = onsets.filter((t) => t >= h.start - 0.08 && t <= h.start + 0.05).sort((a, b) => Math.abs(a - h.start) - Math.abs(b - h.start))[0];
    if (near !== undefined) h.start = near;
  }
  return out;
}

/**
 * Heard notes as riff notes at `bpm`, on a grid of `grid` beats, each placed nearest the middle of the hand position at fret `pos`.
 * The grid counts from `from` (seconds into the take: beat 1 after a count-in) or, without it, from the first note; a note before
 * `from` is dropped, and silence from `from` to the first note becomes a rest. With `beats` (the expected length), notes from that
 * beat on are dropped and the last note or rest fills up to it. Two notes that land on one grid step keep the first. Silence of
 * two grid steps or more after a note becomes a rest; less, and the note rings up to the next one.
 */
export function toRiff(heard: Heard[], bpm: number, pos: number, grid = 0.25, opts: { from?: number; beats?: number } = {}): RiffNote[] {
  const origin = opts.from ?? heard[0]?.start;
  if (origin === undefined) return [];
  const beat = 60 / bpm;
  const snap = (seconds: number) => Math.round(seconds / beat / grid) * grid;
  const end = opts.beats ?? Infinity;
  const slots: { at: number; len: number; midi: number }[] = [];
  for (const h of heard) {
    const at = snap(h.start - origin);
    if (at < 0 || at >= end) continue;
    const last = slots[slots.length - 1];
    // the note kept sounds for as long as the one dropped did
    if (last && at <= last.at) { last.len = Math.max(last.len, snap(h.end - origin) - last.at); continue; }
    slots.push({ at, len: Math.min(end - at, Math.max(grid, snap(h.end - h.start))), midi: h.midi });
  }
  if (!slots.length) return opts.beats ? [{ string: null, fret: null, beats: opts.beats }] : [];
  const notes: RiffNote[] = [];
  if (slots[0].at > 0) notes.push({ string: null, fret: null, beats: slots[0].at });
  slots.forEach((s, i) => {
    const place = placeNear(s.midi, pos + 2);
    if (!place) return;
    const gap = i + 1 < slots.length ? slots[i + 1].at - s.at : Number.isFinite(end) ? end - s.at : s.len;
    const beats = gap - s.len >= 2 * grid ? s.len : gap;
    notes.push({ ...place, beats });
    if (gap > beats) notes.push({ string: null, fret: null, beats: gap - beats });
  });
  return notes;
}
