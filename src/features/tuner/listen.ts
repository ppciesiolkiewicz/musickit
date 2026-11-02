import { findDevice, getAudioContext, listAudioDevices, openLiveInput, readDeviceChoice, setDeviceChoice } from "@/features/sound";
import { createChannelPicker, rms } from "@/lib/practice/mic";
import { FRAME_MS } from "./pitch";
import { oldInputId } from "./choice";

const FRAME = 4096;

/** The tuner's old input picker kept its own device and channel here; the app's one input replaces it. */
export const OLD_INPUT_STORE = "musickit.tuner.input";

/** The microphone open for a tuner: the analyser of the input heard now (it can change), and `close`. */
export interface TunerInput {
  analyser: () => AnalyserNode | null;
  close: () => void;
}

/**
 * Open the app's chosen input (the devices menu, or the input chip) for a tuner. A device with two inputs (an audio interface) is
 * heard on the louder one, as the app's other listeners hear it; each input's level is published for the input chip while open.
 * Asks for the microphone, so call it from a click.
 */
export async function openTunerInput(): Promise<TunerInput> {
  const chosen = readDeviceChoice().input;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: chosen ? { ideal: chosen.id } : undefined, channelCount: { ideal: 2 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  try {
    const ctx = getAudioContext();
    await ctx.resume();
    const inputs = Math.min(2, stream.getAudioTracks()[0]?.getSettings().channelCount ?? 1);
    const src = ctx.createMediaStreamSource(stream);
    const analyser = () => {
      const an = ctx.createAnalyser();
      an.fftSize = FRAME;
      return an;
    };
    let split: ChannelSplitterNode | null = null;
    let ans: AnalyserNode[];
    if (inputs < 2) {
      ans = [analyser()];
      src.connect(ans[0]);
    } else {
      // an interface's two inputs apart (a guitar on Input 1, a voice on Input 2): the louder one is tuned
      split = ctx.createChannelSplitter(2);
      src.connect(split);
      ans = [analyser(), analyser()];
      ans.forEach((an, i) => split!.connect(an, i));
    }
    const data = ans.map((an) => new Float32Array(an.fftSize));
    const picker = createChannelPicker();
    const live = openLiveInput();
    let heard = 0;
    let closed = false;
    const id = window.setInterval(() => {
      ans.forEach((an, i) => an.getFloatTimeDomainData(data[i]));
      const levels = data.map(rms);
      heard = levels.length > 1 ? picker.pick(levels) : 0;
      live.levels(levels, heard);
    }, FRAME_MS);
    return {
      analyser: () => (closed ? null : ans[heard]),
      close: () => {
        if (closed) return;
        closed = true;
        window.clearInterval(id);
        live.close();
        src.disconnect();
        split?.disconnect();
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
