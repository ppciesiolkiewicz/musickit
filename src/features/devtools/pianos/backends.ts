/**
 * TEMPORARY (delete with /dev/pianos). Ways to play an instrument's note, behind one shape (`PianoBackend`), so the thing that
 * plays can be swapped without its callers knowing: our own sample player over a set of files, Tone.js's Sampler over the same
 * files, smplr's soundfonts and grand piano, or an exact synth tone.
 *
 * Every backend takes an optional `tuning`: the cents each note measures sharp (+) or flat (−) at A440, as
 * `scripts/measure-pianos.mts` writes them. With it, each note is played shifted back by its cents; without it, as recorded.
 * The same code runs in the browser and, under node-web-audio-api, in that script.
 */

import { sampleFor, sharpFile, type Instrument, type SampleSet } from "./instruments";

/** cents each MIDI note measures off A440 equal temperament, + sharp */
export type Tuning = Record<number, number>;

export interface BackendOptions {
  /** shift each note by minus its cents; omitted: play the samples as they are */
  tuning?: Tuning;
}

export interface PianoBackend {
  /** resolves when the samples for `notes` (all of G2–C6 by default) are loaded */
  load(notes?: number[]): Promise<void>;
  /** sound `midi` at `at` (the context's clock), held `seconds` */
  play(midi: number, at: number, seconds: number): void;
}

export interface BackendSpec {
  /** `<instrument>/<kind>:<source>`, unique across instruments: the measured table's key */
  id: string;
  label: string;
  about: string;
  create(ctx: BaseAudioContext, dest: AudioNode, options?: BackendOptions): PianoBackend;
}

/** G2 to C6: the notes the singing tools ask for, and what gets measured */
export const LOW = 43, HIGH = 84;
const ALL = Array.from({ length: HIGH - LOW + 1 }, (_, i) => LOW + i);

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
/** what a note is shifted by under a tuning: back by its measured cents */
export const shiftOf = (tuning: Tuning | undefined, midi: number) => -(tuning?.[midi] ?? 0);

/** Fetches a sample's bytes. The browser fetches; the measuring script swaps in a reader for the app's own `/instruments/…` files. */
let read = async (url: string): Promise<ArrayBuffer> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.arrayBuffer();
};
export const setSampleReader = (fn: (url: string) => Promise<ArrayBuffer>) => {
  read = fn;
};

const bytes = new Map<string, Promise<ArrayBuffer>>();
async function decode(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  let p = bytes.get(url);
  if (!p) {
    p = read(url);
    p.catch(() => bytes.delete(url));
    bytes.set(url, p);
  }
  // decodeAudioData detaches what it is given, so each decode gets a copy
  return ctx.decodeAudioData((await p).slice(0));
}

/** Our own player: the nearest sample, moved to the note by its playback rate (and by the tuning's cents). */
function ownPlayer(inst: Instrument, set: SampleSet): BackendSpec {
  return {
    id: `${inst.id}/own:${set.id}`,
    label: `Own player · ${set.label}`,
    about: set.about,
    create(ctx, dest, { tuning } = {}) {
      const buffers = new Map<number, AudioBuffer>();
      return {
        async load(notes = ALL) {
          const needed = new Set(notes.map((m) => sampleFor(set, m).note));
          await Promise.all([...needed].map(async (n) => buffers.set(n, await decode(ctx, set.files[n]))));
        },
        play(midi, at, seconds) {
          const { note, rate } = sampleFor(set, midi);
          const buf = buffers.get(note);
          if (!buf) return;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.playbackRate.value = rate * 2 ** (shiftOf(tuning, midi) / 1200);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.8, at);
          g.gain.setTargetAtTime(0, at + seconds, 0.08);
          src.connect(g).connect(dest);
          src.start(at);
          src.stop(at + seconds + 0.5);
        },
      };
    },
  };
}

/** Tone.js's Sampler over the same files: another engine playing the same samples. Tuned by asking for the shifted frequency. */
function toneSampler(inst: Instrument, set: SampleSet): BackendSpec {
  return {
    id: `${inst.id}/tone:${set.id}`,
    label: `Tone.js Sampler · ${set.label}`,
    about: `npm tone (MIT), its Sampler over these files. ${set.about}`,
    create(ctx, dest, { tuning } = {}) {
      let sampler: import("tone").Sampler | null = null;
      return {
        async load(notes = ALL) {
          const Tone = await import("tone");
          const context = typeof OfflineAudioContext !== "undefined" && ctx instanceof OfflineAudioContext ? new Tone.OfflineContext(ctx) : new Tone.Context(ctx as AudioContext);
          // Tone loads a Sampler's files through its global context, whatever context the Sampler is given
          Tone.setContext(context);
          // only the samples these notes are played from: Tone picks the nearest of what it has, as ours does
          const needed = new Set(notes.map((m) => sampleFor(set, m).note));
          const urls = Object.fromEntries([...needed].map((n) => [sharpFile(n).replace("s", "#"), set.files[n]]));
          await new Promise<void>((done, fail) => {
            sampler = new Tone.Sampler({ urls, context, onload: done, onerror: fail });
          });
          sampler!.connect(dest);
        },
        play(midi, at, seconds) {
          sampler?.triggerAttackRelease(hz(midi) * 2 ** (shiftOf(tuning, midi) / 1200), seconds, at);
        },
      };
    },
  };
}

/** Plays through a smplr instrument; tuned with its per-note `detune`. */
type SmplrLike = { start(e: { note: number; velocity: number; time: number; duration: number; detune: number }): unknown };
function smplr(id: string, label: string, about: string, make: (ctx: BaseAudioContext, dest: AudioNode, notes: number[]) => Promise<SmplrLike>): BackendSpec {
  return {
    id,
    label,
    about,
    create(ctx, dest, { tuning } = {}) {
      let inst: SmplrLike | null = null;
      return {
        async load(notes = ALL) {
          inst = await make(ctx, dest, notes);
        },
        play(midi, at, seconds) {
          inst?.start({ note: midi, velocity: 80, time: at, duration: seconds, detune: shiftOf(tuning, midi) });
        },
      };
    },
  };
}

const smplrSoundfont = (inst: Instrument, name: string) =>
  smplr(`${inst.id}/smplr:soundfont`, `smplr · soundfont (${name})`, `npm smplr (MIT), its Soundfont: the gleitz MusyngKite General MIDI ${name}, streamed from GitHub.`, async (ctx, dest, notes) => {
    const { Soundfont } = await import("smplr");
    return Soundfont(ctx, { instrument: name, kit: "MusyngKite", destination: dest, notesToLoad: { notes } }).load;
  });

const smplrSplendid = (inst: Instrument) =>
  smplr(`${inst.id}/smplr:splendid`, "smplr · Splendid Grand Piano", "npm smplr (MIT), its SplendidGrandPiano: a Steinway D at several velocities, streamed from smplr's sample host.", async (ctx, dest, notes) => {
    const { SplendidGrandPiano } = await import("smplr");
    // with no document (the measuring script) smplr picks ogg, which node-web-audio-api cannot decode
    const formats = typeof document === "undefined" ? ["m4a"] : undefined;
    return SplendidGrandPiano(ctx, { destination: dest, formats, notesToLoad: { notes, velocityRange: [70, 90] } }).load;
  });

/** Three sine harmonics at the exact pitch, as the tuner's reference plays: the yardstick, it should measure 0. */
export const EXACT: BackendSpec = {
  id: "exact",
  label: "Exact tone (synth)",
  about: "Three harmonics at the exact pitch, as the tuner's reference plays. The yardstick: it should measure 0.",
  create(ctx, dest) {
    return {
      load: async () => undefined,
      play(midi, at, seconds) {
        const out = ctx.createGain();
        out.gain.setValueAtTime(0, at);
        out.gain.linearRampToValueAtTime(0.25, at + 0.02);
        out.gain.setTargetAtTime(0, at + seconds, 0.08);
        out.connect(dest);
        [1, 0.4, 0.2].forEach((level, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = hz(midi) * (i + 1);
          g.gain.value = level;
          o.connect(g).connect(out);
          o.start(at);
          o.stop(at + seconds + 0.5);
        });
      },
    };
  },
};

/** Every way to play this instrument: our player over each of its sample sets, Tone.js over the tonejs-instruments ones, smplr's, the exact tone. */
export function backendsFor(inst: Instrument): BackendSpec[] {
  return [
    ...inst.sets.map((s) => ownPlayer(inst, s)),
    ...inst.sets.filter((s) => s.id.startsWith("tji-")).map((s) => toneSampler(inst, s)),
    ...(inst.splendid ? [smplrSplendid(inst)] : []),
    ...(inst.soundfont ? [smplrSoundfont(inst, inst.soundfont)] : []),
    EXACT,
  ];
}
