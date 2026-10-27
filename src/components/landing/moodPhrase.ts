import { getAudioContext, getOutputBus, silence, wakeAudio } from "@/features/sound";

/**
 * A short phrase for each landing mood, in A, over a held chord: a soft plucked synth with a pad underneath and a room
 * around it. Fixed phrases rather than generated tunes, each written to show its mood.
 * Semitones from A3 (`phrase`) and from A2 (`chord`), in the order of the hero's moods: Dreamy, Bright, Bluesy, Soulful, Sad, Dark.
 */
const PHRASES = [
  { phrase: [7, 11, 14, 18, 16, 11, 9, 7], chord: [0, 7, 11, 16, 18], bpm: 72, wet: 0.65, cut: 2600, ring: 2.2 },
  { phrase: [0, 4, 7, 12, 11, 7, 9, 12], chord: [0, 7, 12, 16], bpm: 116, wet: 0.3, cut: 5200, ring: 1.3 },
  { phrase: [0, 3, 5, 6, 7, 10, 12, 10, 7], chord: [0, 7, 10, 16], bpm: 96, wet: 0.35, cut: 3600, ring: 1.3 },
  { phrase: [0, 3, 7, 9, 10, 9, 7, 3, 5], chord: [0, 7, 10, 14, 15], bpm: 84, wet: 0.45, cut: 3000, ring: 1.3 },
  { phrase: [12, 10, 8, 7, 5, 3, 2, 0], chord: [0, 7, 12, 15], bpm: 66, wet: 0.55, cut: 2200, ring: 2.2 },
  { phrase: [0, 1, 0, 3, 1, 7, 8, 7], chord: [0, 7, 12, 13, 15], bpm: 78, wet: 0.4, cut: 1500, ring: 1.3 },
];
const ROOT = 57;
const BASS = 45;

const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

let room: AudioBuffer | null = null;
/** three seconds of fading noise: a cheap, soft reverb */
function roomOf(ctx: AudioContext) {
  if (room) return room;
  const len = ctx.sampleRate * 3.2;
  room = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = room.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  return room;
}

function pluck(ctx: AudioContext, out: AudioNode, m: number, t: number, dur: number, vol = 0.32) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(hz(m) * 9, t);
  f.frequency.exponentialRampToValueAtTime(hz(m) * 1.6, t + dur * 0.6);
  for (const [type, mul, v] of [["triangle", 1, 1], ["sawtooth", 1, 0.18], ["sine", 2, 0.25]] as const) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz(m) * mul;
    const og = ctx.createGain();
    og.gain.value = v;
    o.connect(og).connect(f);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  f.connect(g).connect(out);
}

function pad(ctx: AudioContext, out: AudioNode, notes: number[], t: number, dur: number) {
  notes.forEach((m, i) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.9);
    g.gain.setValueAtTime(0.05, t + dur - 1.2);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = hz(m);
    o.detune.value = i % 2 ? 6 : -6;
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.1);
  });
}

/**
 * Play mood `i`'s phrase, calling `onNote` with each note's MIDI number as it sounds. Silences the app's other sequences first.
 * Returns a stop that fades this phrase out.
 */
export function playMoodPhrase(i: number, onNote: (midi: number) => void): () => void {
  const p = PHRASES[i];
  silence();
  void wakeAudio();
  const ctx = getAudioContext();
  const bus = ctx.createGain();
  bus.gain.value = 0.5;
  bus.connect(getOutputBus());
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = p.cut;
  const dry = ctx.createGain();
  dry.gain.value = 1 - p.wet * 0.6;
  const wet = ctx.createGain();
  wet.gain.value = p.wet;
  const verb = ctx.createConvolver();
  verb.buffer = roomOf(ctx);
  tone.connect(dry).connect(bus);
  tone.connect(verb).connect(wet).connect(bus);

  const step = 60 / p.bpm / 2;
  const t0 = ctx.currentTime + 0.08;
  pad(ctx, tone, p.chord.map((s) => BASS + s), t0, p.phrase.length * step + 1.6);
  pluck(ctx, tone, BASS, t0, 2.4, 0.22);
  const timers = p.phrase.map((s, k) => {
    const t = t0 + 0.25 + k * step * (k === p.phrase.length - 1 ? 1.15 : 1);
    pluck(ctx, tone, ROOT + s, t, p.ring);
    return setTimeout(() => onNote(ROOT + s), (t - ctx.currentTime) * 1000);
  });

  return () => {
    timers.forEach(clearTimeout);
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    setTimeout(() => bus.disconnect(), 600);
  };
}
