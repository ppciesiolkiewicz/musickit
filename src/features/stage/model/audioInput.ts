/**
 * The studio's one audio input: what feeds the widgets (the note heard lights up on the pinned and selected ones). Two sources, as in
 * the looper: a guitar and a voice; one listens at a time. Each source has a device (null, the default: the app's input, chosen in
 * the devices menu or an input chip, and followed when it changes) and a channel (`auto`, the default: the louder input of a
 * two-input device, as the rest of the app hears it). Plain data, saved by the studio. Pure.
 */

export type AudioSource = "guitar" | "voice";
export type InputChannel = "auto" | "left" | "right" | "sum";

export interface SourceSetup {
  device: { id: string; label: string } | null;
  channel: InputChannel;
}

export interface AudioInputSetup {
  source: AudioSource;
  guitar: SourceSetup;
  voice: SourceSetup;
}

export const SOURCES: AudioSource[] = ["guitar", "voice"];
export const SOURCE_NAMES: Record<AudioSource, string> = { guitar: "Guitar", voice: "Voice" };
export const CHANNELS: InputChannel[] = ["auto", "left", "right", "sum"];
export const CHANNEL_NAMES: Record<InputChannel, string> = { auto: "Louder", left: "Input 1", right: "Input 2", sum: "Both" };

export const DEFAULT_AUDIO_INPUT: AudioInputSetup = {
  source: "guitar",
  guitar: { device: null, channel: "auto" },
  voice: { device: null, channel: "auto" },
};

const obj = (v: unknown): Record<string, unknown> | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

function sourceFrom(raw: unknown, fallback: SourceSetup): SourceSetup {
  const o = obj(raw);
  if (!o) return fallback;
  const d = obj(o.device);
  const device = d && typeof d.id === "string" && d.id && typeof d.label === "string" ? { id: d.id, label: d.label } : null;
  const channel = CHANNELS.find((c) => c === o.channel) ?? fallback.channel;
  return { device, channel };
}

/** A saved setup, or the default; anything unreadable falls back part by part. */
export function sanitiseAudioInput(raw: unknown): AudioInputSetup {
  const o = obj(raw);
  if (!o) return DEFAULT_AUDIO_INPUT;
  return {
    source: SOURCES.find((s) => s === o.source) ?? DEFAULT_AUDIO_INPUT.source,
    guitar: sourceFrom(o.guitar, DEFAULT_AUDIO_INPUT.guitar),
    voice: sourceFrom(o.voice, DEFAULT_AUDIO_INPUT.voice),
  };
}

/** The setup listening now: the chosen source's device and channel. */
export const activeSource = (s: AudioInputSetup): SourceSetup => s[s.source];
