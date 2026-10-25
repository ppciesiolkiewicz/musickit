import { canChooseOutput, findDevice, listAudioDevices, readDeviceChoice, subscribeDeviceChoice } from "./devices";

let audioContext: AudioContext | null = null;

/** The one AudioContext of the whole app. */
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
    watchOutput(audioContext);
    followChosenOutput(audioContext);
  }
  return audioContext;
}

/**
 * Make sure the context is running. Not only "suspended": Safari puts it in "interrupted" when the output changes
 * (a Bluetooth speaker or headphones connecting), and it stays silent until resumed.
 */
export function wakeAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "running" || ctx.state === "closed") return Promise.resolve();
  return ctx.resume().catch(() => undefined);
}

type SinkContext = AudioContext & { sinkId?: string | object; setSinkId?: (id: string) => Promise<void> };

/**
 * Play through the output chosen in the nav's devices menu, now and whenever it changes. Nothing is touched until one was chosen,
 * so the looper's own output picker keeps working on the same context. A remembered device that is not plugged in leaves the default.
 */
function followChosenOutput(ctx: SinkContext) {
  if (typeof window === "undefined" || !canChooseOutput()) return;
  let applied: string | undefined;
  const apply = async () => {
    const wanted = readDeviceChoice().output;
    if (!wanted && applied === undefined) return;
    const id = wanted ? (findDevice((await listAudioDevices()).outputs, wanted)?.id ?? "") : "";
    if (id === applied || ctx.state === "closed") return;
    applied = id;
    await ctx.setSinkId?.(id).catch(() => undefined);
  };
  void apply();
  subscribeDeviceChoice(() => void apply());
}

/**
 * Follow output changes. When a speaker connects, some browsers keep the context playing into the old device (or
 * nowhere) until its output is reopened, and Safari interrupts it. So: resume on the next tap or key and when the tab
 * comes back, and when the list of outputs changes, reopen the output (suspend, then resume) so the sound moves to the
 * new default device. A context sent to a chosen output (the looper's output picker) is left to that.
 */
function watchOutput(ctx: AudioContext) {
  if (typeof window === "undefined") return;
  let wanted = false; // it has run, so it should be running
  ctx.addEventListener("statechange", () => {
    if (ctx.state === "running") wanted = true;
    else if (wanted && ctx.state !== "closed" && document.visibilityState === "visible") void ctx.resume().catch(() => undefined);
  });
  const wake = () => {
    if (wanted || ctx.state === "suspended") void wakeAudio();
  };
  for (const ev of ["pointerdown", "keydown", "touchend"]) window.addEventListener(ev, wake, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && wanted) void wakeAudio();
  });

  const media = navigator.mediaDevices;
  if (!media?.enumerateDevices) return;
  const outputs = async () =>
    (await media.enumerateDevices().catch(() => []))
      .filter((d) => d.kind === "audiooutput")
      .map((d) => `${d.deviceId}|${d.label}`)
      .sort()
      .join(",");
  let last: string | null = null;
  void outputs().then((o) => (last ??= o));
  let timer: ReturnType<typeof setTimeout> | null = null;
  media.addEventListener?.("devicechange", () => {
    if (timer) clearTimeout(timer);
    // it fires in bursts (and when the tab gets focus back); look once things settle
    timer = setTimeout(async () => {
      timer = null;
      const now = await outputs();
      const changed = last !== null && now !== last;
      last = now;
      if (!changed || !wanted || ctx.state === "closed") return;
      const sink = (ctx as SinkContext).sinkId;
      if (typeof sink === "string" && sink !== "") return; // sent to a chosen device, not the default
      try {
        if (ctx.state === "running") await ctx.suspend();
        await ctx.resume();
      } catch {
        // resumed on the next tap instead
      }
    }, 600);
  });
}

let outputBus: GainNode | null = null;

/**
 * The app's main output: players send their sound here by default, on its way to the speakers.
 * Other features (the looper) can tap it to record what is played.
 */
export function getOutputBus(): GainNode {
  const ctx = getAudioContext();
  if (!outputBus) {
    outputBus = ctx.createGain();
    outputBus.connect(ctx.destination);
  }
  return outputBus;
}
