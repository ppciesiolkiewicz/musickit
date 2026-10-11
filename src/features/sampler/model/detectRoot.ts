import { detectPitch, hzToNote } from "@/features/tuner/pitch";

const WINDOW = 2048;
const HOP = 1024;
/** only the start matters: the attack and the body of the sound */
const MAX_SECONDS = 4;

/**
 * The note a sample sounds at, as a MIDI note: pitch of many short windows (YIN, the tuner's), then the median of the windows that
 * found one. null when fewer than half the windows (or fewer than 3) are clearly pitched: silence, noise, a click.
 */
export function detectRoot(samples: Float32Array, sampleRate: number): number | null {
  const end = Math.min(samples.length, Math.floor(sampleRate * MAX_SECONDS));
  const hz: number[] = [];
  let windows = 0;
  for (let at = 0; at + WINDOW <= end; at += HOP) {
    windows++;
    const p = detectPitch(samples.subarray(at, at + WINDOW), sampleRate, { minHz: 50, maxHz: 1500 });
    if (p) hz.push(p.freq);
  }
  if (hz.length < Math.max(3, windows / 2)) return null;
  hz.sort((a, b) => a - b);
  return hzToNote(hz[Math.floor(hz.length / 2)]).midi;
}
