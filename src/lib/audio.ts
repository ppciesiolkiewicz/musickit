import { Note } from "@tonaljs/tonal";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

const activeNotes = new Map<
  string,
  { oscillator: OscillatorNode; gainNode: GainNode }
>();

export function playNote(noteName: string): void {
  const freq = Note.get(noteName).freq;
  if (freq == null) return;

  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  if (activeNotes.has(noteName)) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = freq;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01);
  gainNode.gain.setValueAtTime(0.2, ctx.currentTime + 0.05);

  oscillator.start(ctx.currentTime);
  activeNotes.set(noteName, { oscillator, gainNode });
}

export function stopNote(noteName: string): void {
  const entry = activeNotes.get(noteName);
  if (!entry) return;

  const { oscillator, gainNode } = entry;
  const ctx = gainNode.context;
  const now = ctx.currentTime;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(0.001, now + 0.15);
  oscillator.stop(now + 0.2);

  activeNotes.delete(noteName);
}

export function stopAllNotes(): void {
  for (const noteName of [...activeNotes.keys()]) {
    stopNote(noteName);
  }
}
