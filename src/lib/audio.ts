import { Note } from "@tonaljs/tonal";
import { OSCILLATOR_ID, getInstrumentConfig } from "./instruments";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// --- Sample buffer cache ---
const bufferCache = new Map<string, AudioBuffer>();
const loadingPromises = new Map<string, Promise<AudioBuffer>>();

async function loadSample(url: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(url);
  if (cached) return cached;

  const existing = loadingPromises.get(url);
  if (existing) return existing;

  const promise = (async () => {
    const ctx = getAudioContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    bufferCache.set(url, audioBuffer);
    loadingPromises.delete(url);
    return audioBuffer;
  })();

  loadingPromises.set(url, promise);
  return promise;
}

export async function preloadInstrument(instrumentId: string): Promise<void> {
  const config = getInstrumentConfig(instrumentId);
  if (!config) return;
  await Promise.all(
    Object.values(config.urls).map((file) => loadSample(config.baseUrl + file))
  );
}

function findClosestSample(
  targetNote: string,
  urls: Record<string, string>,
  baseUrl: string
): { url: string; playbackRate: number } | null {
  const targetFreq = Note.get(targetNote).freq;
  if (targetFreq == null) return null;

  let closestFreq = 0;
  let closestFile = "";
  let closestDist = Infinity;

  for (const [sampleNote, file] of Object.entries(urls)) {
    const sampleFreq = Note.get(sampleNote).freq;
    if (sampleFreq == null) continue;
    const dist = Math.abs(Math.log2(targetFreq / sampleFreq));
    if (dist < closestDist) {
      closestDist = dist;
      closestFreq = sampleFreq;
      closestFile = file;
    }
  }

  if (!closestFile || !closestFreq) return null;

  return {
    url: baseUrl + closestFile,
    playbackRate: targetFreq / closestFreq,
  };
}

// --- Active notes ---
type ActiveNote =
  | { type: "oscillator"; oscillator: OscillatorNode; gainNode: GainNode }
  | { type: "sample"; source: AudioBufferSourceNode; gainNode: GainNode };

const activeNotes = new Map<string, ActiveNote>();

let currentInstrument = OSCILLATOR_ID as string;

export function setInstrument(instrumentId: string): void {
  stopAllNotes();
  currentInstrument = instrumentId;
}

export function playNote(noteName: string): void {
  if (activeNotes.has(noteName)) return;

  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  if (currentInstrument === OSCILLATOR_ID) {
    playOscillatorNote(noteName, ctx);
  } else {
    playSampledNote(noteName, ctx);
  }
}

function playOscillatorNote(noteName: string, ctx: AudioContext): void {
  const freq = Note.get(noteName).freq;
  if (freq == null) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = freq;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.01);
  gainNode.gain.setValueAtTime(0.5, ctx.currentTime + 0.05);

  oscillator.start(ctx.currentTime);
  activeNotes.set(noteName, { type: "oscillator", oscillator, gainNode });
}

function playSampledNote(noteName: string, ctx: AudioContext): void {
  const config = getInstrumentConfig(currentInstrument);
  if (!config) return;

  const match = findClosestSample(noteName, config.urls, config.baseUrl);
  if (!match) return;

  const buffer = bufferCache.get(match.url);
  if (!buffer) {
    loadSample(match.url).then((buf) => {
      if (activeNotes.has(noteName)) return;
      playSampleBuffer(noteName, buf, match.playbackRate, config.attack, ctx);
    });
    return;
  }

  playSampleBuffer(noteName, buffer, match.playbackRate, config.attack, ctx);
}

function playSampleBuffer(
  noteName: string,
  buffer: AudioBuffer,
  playbackRate: number,
  attack: number,
  ctx: AudioContext
): void {
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();

  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  const attackTime = attack || 0.01;
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + attackTime);

  source.start(ctx.currentTime);
  source.onended = () => activeNotes.delete(noteName);
  activeNotes.set(noteName, { type: "sample", source, gainNode });
}

export function stopNote(noteName: string): void {
  const entry = activeNotes.get(noteName);
  if (!entry) return;

  const { gainNode } = entry;
  const ctx = gainNode.context as AudioContext;
  const now = ctx.currentTime;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);

  if (entry.type === "oscillator") {
    gainNode.gain.linearRampToValueAtTime(0.001, now + 0.15);
    entry.oscillator.stop(now + 0.2);
  } else {
    const config = getInstrumentConfig(currentInstrument);
    const releaseTime = config?.release ?? 0.3;
    gainNode.gain.linearRampToValueAtTime(0.001, now + releaseTime);
    entry.source.stop(now + releaseTime + 0.05);
  }

  activeNotes.delete(noteName);
}

export function stopAllNotes(): void {
  for (const noteName of [...activeNotes.keys()]) {
    stopNote(noteName);
  }
}
