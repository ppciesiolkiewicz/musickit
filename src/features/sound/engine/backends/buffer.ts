/**
 * Our own sample player: the nearest sample (by `pickSample`, with the instrument's tuning) in an AudioBufferSourceNode, moved to the
 * note by its playback rate, under one gain envelope. Plays on any context, live or offline; the samples are shared by all.
 */

import type { NoteRequest, SampleBackend, SoundingNote } from "../backend";
import { getInstrumentConfig } from "../instruments";
import { pickSample } from "../notes";
import { cachedSample, instrumentSamples, loadInstrumentSamples, loadSample } from "../samples";

/** A tap let go before its note started (the output was still settling) is heard for this long, not lost. */
const SHORTEST_NOTE = 0.12;
/** a note sounds this long past its release ramp before its source is stopped */
const TAIL = 0.05;

export type EnvelopeOp = ["set" | "ramp", number, number];

/**
 * The gain of one note, as `setValueAtTime` ("set") and `linearRampToValueAtTime` ("ramp") calls: up from 0 over the attack to the
 * peak, and with a duration, held to its end and down over the release, the source stopped just after. Released before the attack
 * is over, it is cut where the ramp had got to. Pure.
 */
export function bufferEnvelope(config: { attack: number; release: number }, note: NoteRequest): { ops: EnvelopeOp[]; peak: number; stopAt: number | null } {
  const attack = config.attack || 0.01;
  const peak = 0.8 * Math.max(0.05, Math.min(1, note.velocity / 0.8));
  const ops: EnvelopeOp[] = [["set", note.at, 0], ["ramp", note.at + attack, peak]];
  if (note.duration === undefined) return { ops, peak, stopAt: null };
  const off = note.at + Math.max(0.02, note.duration);
  ops.push(["set", off, Math.min(peak, peak * ((off - note.at) / attack))], ["ramp", off + config.release, 0.001]);
  return { ops, peak, stopAt: off + config.release + TAIL };
}

const apply = (param: AudioParam, ops: EnvelopeOp[]) =>
  ops.forEach(([kind, t, v]) => (kind === "set" ? param.setValueAtTime(v, t) : param.linearRampToValueAtTime(v, t)));

/** The sample `midi` plays from on this instrument, with its rate, or null (no instrument, or a strict pad with no sample there). */
function match(instrumentId: string, midi: number) {
  const config = getInstrumentConfig(instrumentId);
  if (!config) return null;
  const m = pickSample(midi, instrumentSamples(instrumentId), config.strict, config.tuning);
  return m ? { config, url: m.sample.url, rate: m.rate } : null;
}

export function createBufferBackend(ctx: BaseAudioContext): SampleBackend {
  return {
    id: "buffer",
    isLoaded(instrumentId, midi) {
      const m = match(instrumentId, midi);
      return !!m && !!cachedSample(m.url);
    },
    async load(instrumentId, midi) {
      if (midi === undefined) return loadInstrumentSamples(instrumentId);
      const url = match(instrumentId, midi)?.url;
      if (url) await loadSample(url);
    },
    start(instrumentId, note, destination) {
      const m = match(instrumentId, note.midi);
      const buffer = m && cachedSample(m.url);
      if (!m || !buffer) return null;
      const { config } = m;
      const env = bufferEnvelope(config, note);
      const gain = ctx.createGain();
      apply(gain.gain, env.ops);
      gain.connect(destination);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = m.rate;
      src.connect(gain);
      src.start(note.at);
      if (env.stopAt !== null) src.stop(env.stopAt);
      const ended: (() => void)[] = [];
      src.onended = () => {
        gain.disconnect();
        ended.forEach((fn) => fn());
      };
      const attack = config.attack || 0.01;
      const playing: SoundingNote = {
        at: note.at,
        release(at, seconds) {
          if (at < note.at) {
            // let go before it sounded: it still plays briefly, from its start
            const off = note.at + Math.max(attack, SHORTEST_NOTE);
            gain.gain.setValueAtTime(env.peak, off);
            gain.gain.linearRampToValueAtTime(0.001, off + (seconds ?? config.release));
            src.stop(off + (seconds ?? config.release) + TAIL);
            return;
          }
          const r = seconds ?? config.release;
          gain.gain.cancelScheduledValues(at);
          gain.gain.setValueAtTime(gain.gain.value, at);
          gain.gain.linearRampToValueAtTime(0.001, at + r);
          src.stop(at + r + TAIL);
        },
        stop(at) {
          src.stop(at);
        },
        onEnded(fn) {
          ended.push(fn);
        },
      };
      return playing;
    },
  };
}

const live = new WeakMap<BaseAudioContext, SampleBackend>();
/** One buffer backend per context, so the live player and the scheduler share one. */
export function bufferBackendFor(ctx: BaseAudioContext): SampleBackend {
  let b = live.get(ctx);
  if (!b) live.set(ctx, (b = createBufferBackend(ctx)));
  return b;
}
