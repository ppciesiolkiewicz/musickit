import { findDevice, getAudioContext, listAudioDevices, openInputStream, openLiveInput, readDeviceChoice, setDeviceChoice, tapChannels } from "@/features/sound";
import { FRAME_MS } from "./pitch";
import { oldInputId } from "./choice";

const FRAME = 4096;

/** The tuner's old input picker kept its own device and channel here; the app's one input replaces it. */
export const OLD_INPUT_STORE = "musickit.tuner.input";

/** The microphone open for a tuner: the analyser of the input heard, and `close`. */
export interface TunerInput {
  analyser: () => AnalyserNode | null;
  close: () => void;
}

/**
 * Open the app's chosen input (the devices menu, or the input chip) for a tuner, on the app's chosen channel (both inputs of an audio
 * interface mixed, or Input 1 or 2, followed live) as the app's other listeners hear it; each input's level is published for the
 * input chip while open.
 * Asks for the microphone, so call it from a click.
 */
export async function openTunerInput(): Promise<TunerInput> {
  const stream = await openInputStream({ channelCount: { ideal: 2 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false });
  try {
    const ctx = getAudioContext();
    await ctx.resume();
    const src = ctx.createMediaStreamSource(stream);
    const tap = tapChannels(ctx, src, stream.getAudioTracks()[0]?.getSettings().channelCount ?? 1);
    const an = ctx.createAnalyser();
    an.fftSize = FRAME;
    tap.output.connect(an);
    const live = openLiveInput();
    let closed = false;
    const id = window.setInterval(() => live.levels(tap.levels()), FRAME_MS);
    return {
      analyser: () => (closed ? null : an),
      close: () => {
        if (closed) return;
        closed = true;
        window.clearInterval(id);
        live.close();
        tap.close();
        src.disconnect();
        stream.getTracks().forEach((t) => t.stop());
      },
    };
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }
}

/**
 * Once: the device the tuner page's old picker saved becomes the app's input when the app has none yet (matched in today's list),
 * then the old save goes. A saved device that is not plugged in now waits for a later visit. Lists devices only; never prompts.
 */
export async function migrateOldInput(): Promise<void> {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(OLD_INPUT_STORE);
  } catch {
    return;
  }
  if (raw === null) return;
  const id = oldInputId(raw);
  if (id && !readDeviceChoice().input) {
    const found = findDevice((await listAudioDevices()).inputs, { id, label: "" });
    if (!found) return;
    if (!readDeviceChoice().input) setDeviceChoice({ input: found });
  }
  try {
    window.localStorage.removeItem(OLD_INPUT_STORE);
  } catch {}
}
