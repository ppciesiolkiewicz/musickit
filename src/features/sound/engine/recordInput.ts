import { getAudioContext, wakeAudio } from "./context";
import { openInputStream } from "./devices";
import { tapChannels } from "./channelTap";
import { openLiveInput } from "./liveInput";

export interface RecordInput {
  /** the audio track to record: the input as it comes for a one-input device; the chosen channel (Both mixed, 1 or 2) for a two-input one */
  track: MediaStreamTrack;
  /** the device the browser opened */
  deviceId: string | null;
  /** seconds from the sound reaching the device to `track`: the input's own latency, plus the audio graph's for a routed one */
  latency: number;
  close(): void;
}

export interface RecordInputOptions {
  /** effects the take is recorded through (the caller's own nodes, e.g. an `EffectChain`): the input goes into `input`, the take records `output` */
  through?: { input: AudioNode; output: AudioNode };
}

/**
 * Opens the app's chosen input (`DeviceChoice.input`, exactly, falling back to the system default) for a recorder, untouched: no echo
 * cancelling, noise removal or level riding, which smear the picks and bend the pitch. A two-input device (an audio interface) goes
 * through the app's channel choice, so a take with the guitar on Input 1 has it in both ears and not the other socket; the choice is
 * followed live. While open, each input's level is published (`openLiveInput`) for the input chip and the record pages' meter. With
 * `through` the take records the input after those effects (in stereo: a reverb is wide); the nodes stay the caller's, so their
 * settings can change while the input is open, and closing only takes the input off them.
 */
export async function openRecordInput({ through }: RecordInputOptions = {}): Promise<RecordInput> {
  const stream = await openInputStream({ channelCount: { ideal: 2 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false });
  const raw = stream.getAudioTracks()[0];
  const stopRaw = () => stream.getTracks().forEach((t) => t.stop());
  if (!raw) {
    stopRaw();
    throw new Error("the input gave no sound");
  }
  const ctx = getAudioContext();
  await wakeAudio();
  const channels = raw.getSettings().channelCount ?? 1;
  const src = ctx.createMediaStreamSource(stream);
  const tap = tapChannels(ctx, src, channels);
  // a two-input device is recorded as the app hears it; a mic straight from the browser, with nothing in between
  const out = through || tap.channels > 1 ? ctx.createMediaStreamDestination() : null;
  if (out && through) {
    tap.output.connect(through.input);
    through.output.connect(out);
  } else if (out) {
    out.channelCount = 1;
    tap.output.connect(out);
  }
  const live = openLiveInput();
  let frame = 0;
  const publish = () => {
    live.levels(tap.levels());
    frame = requestAnimationFrame(publish);
  };
  frame = requestAnimationFrame(publish);
  let closed = false;
  return {
    track: out ? out.stream.getAudioTracks()[0] : raw,
    deviceId: raw.getSettings().deviceId ?? null,
    latency: ((raw.getSettings() as { latency?: number }).latency ?? 0) + (out ? ctx.baseLatency || 0 : 0),
    close() {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(frame);
      live.close();
      if (through && out) {
        try { tap.output.disconnect(through.input); through.output.disconnect(out); } catch { /* already gone */ }
      }
      tap.close();
      out?.stream.getTracks().forEach((t) => t.stop());
      try { src.disconnect(); } catch { /* already gone */ }
      stopRaw();
    },
  };
}
