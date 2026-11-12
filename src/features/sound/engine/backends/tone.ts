/**
 * Tone.js plays the built-in instruments: one `Tone.Sampler` per instrument and destination, fed the AudioBuffers our sample loader
 * already decodes and caches (`samples.ts`), so a sample is fetched once whichever backend plays it. A note asks Tone for its exact
 * frequency shifted by the tuning of the sample it plays from; that sample is the same one `closestSample` picks, since a sampler only
 * ever holds the samples asked for and Tone, like us, takes the higher one on a tie.
 *
 * Tone is imported on the first load, so pages that play nothing never download it. Tone loads through its global context, which is
 * set once to wrap the app's AudioContext; offline renders never come here (see `choose.ts`).
 */

import type { NoteRequest, SampleBackend, SoundingNote } from "../backend";
import { getInstrumentConfig } from "../instruments";
import { midiToHz, pickSample, tunedCents } from "../notes";
import { cachedSample, instrumentSamples, loadSample } from "../samples";

type ToneModule = typeof import("tone");

/** The sample `midi` plays from on a non-strict instrument, with the frequency that puts it right. */
function plan(instrumentId: string, midi: number) {
  const config = getInstrumentConfig(instrumentId);
  if (!config) return null;
  const m = pickSample(midi, instrumentSamples(instrumentId));
  if (!m) return null;
  return { config, url: m.sample.url, sampleMidi: m.sample.midi, hz: midiToHz(midi) * 2 ** (tunedCents(config.tuning, m.sample.midi) / 1200) };
}

/** Our velocity (0.8 a normal press) as the gain the buffer player gives it, so both backends play as loud. */
const gainOf = (velocity: number) => 0.8 * Math.max(0.05, Math.min(1, velocity / 0.8));

export function createToneBackend(ctx: AudioContext): SampleBackend {
  let tone: ToneModule | null = null;
  let loadingTone: Promise<ToneModule> | null = null;
  const loadTone = () =>
    (loadingTone ??= import("tone").then((T) => {
      T.setContext(new T.Context(ctx));
      tone = T;
      return T;
    }));
  /** one sampler per instrument and destination, and the sample notes each already holds */
  const samplers = new Map<string, Map<AudioNode, { sampler: import("tone").Sampler; holds: Set<number> }>>();

  const samplerFor = (T: ToneModule, instrumentId: string, dest: AudioNode, config: { attack: number; release: number }) => {
    let byDest = samplers.get(instrumentId);
    if (!byDest) samplers.set(instrumentId, (byDest = new Map()));
    let s = byDest.get(dest);
    if (!s) {
      const sampler = new T.Sampler({ attack: config.attack, release: config.release });
      sampler.connect(dest);
      byDest.set(dest, (s = { sampler, holds: new Set() }));
    }
    return s;
  };

  return {
    id: "tone",
    isLoaded(instrumentId, midi) {
      const p = plan(instrumentId, midi);
      return !!tone && !!p && !!cachedSample(p.url);
    },
    async load(instrumentId, midi) {
      const urls = midi === undefined ? instrumentSamples(instrumentId).map((s) => s.url) : [plan(instrumentId, midi)?.url].filter((u): u is string => !!u);
      await Promise.all([loadTone(), ...urls.map(loadSample)]);
    },
    start(instrumentId, note: NoteRequest, dest) {
      const p = plan(instrumentId, note.midi);
      const buffer = p && cachedSample(p.url);
      if (!tone || !p || !buffer) return null;
      const s = samplerFor(tone, instrumentId, dest, p.config);
      if (!s.holds.has(p.sampleMidi)) {
        s.sampler.add(p.sampleMidi as import("tone/build/esm/core/type/NoteUnits").MidiNote, buffer);
        s.holds.add(p.sampleMidi);
      }
      const { sampler } = s;
      const velocity = gainOf(note.velocity);
      const ended: (() => void)[] = [];
      const endAfter = (at: number, seconds: number) => {
        const ms = Math.max(0, (at + seconds - ctx.currentTime) * 1000) + 50;
        window.setTimeout(() => ended.forEach((fn) => fn()), ms);
      };
      if (note.duration !== undefined) {
        sampler.triggerAttackRelease(p.hz, Math.max(0.02, note.duration), note.at, velocity);
        endAfter(note.at + Math.max(0.02, note.duration), p.config.release);
      } else sampler.triggerAttack(p.hz, note.at, velocity);
      const playing: SoundingNote = {
        at: note.at,
        // Tone's release is one setting per sampler, so a quick release (`seconds`) is not per note here
        release(at) {
          const t = Math.max(at, note.at + 0.12);
          sampler.triggerRelease(p.hz, t);
          endAfter(t, p.config.release);
        },
        stop(at) {
          sampler.triggerRelease(p.hz, at);
          endAfter(at, p.config.release);
        },
        onEnded(fn) {
          ended.push(fn);
        },
      };
      return playing;
    },
  };
}

const live = new WeakMap<AudioContext, SampleBackend>();
/** One Tone backend per (live) context. */
export function toneBackendFor(ctx: AudioContext): SampleBackend {
  let b = live.get(ctx);
  if (!b) live.set(ctx, (b = createToneBackend(ctx)));
  return b;
}
