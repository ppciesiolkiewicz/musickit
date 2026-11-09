import { canChooseOutput, findDevice, listAudioDevices, readDeviceChoice, subscribeDeviceChoice } from "./devices";
import { createSettle } from "./settle";
import { attachMaster } from "./volume";

let audioContext: AudioContext | null = null;
let settle: ReturnType<typeof createSettle> | null = null;
/** the output is being moved to a chosen device */
let sinkChange: Promise<void> | null = null;
let waking: Promise<void> | null = null;

/** A chosen device that does not answer must not hold the sound back for long. */
const SINK_WAIT_MS = 1000;
const SETTLE_LOOKS = 5;
const INAUDIBLE = 1e-6;

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** The one AudioContext of the whole app. */
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
    settle = createSettle(audioContext);
    keepOutputOpen(audioContext);
    watchOutput(audioContext);
    followChosenOutput(audioContext);
  }
  return audioContext;
}

/** The output is running and past its first moments, so a sound started now is heard whole. */
export function audioSettled(): boolean {
  const ctx = getAudioContext();
  return ctx.state === "running" && !sinkChange && settle!.lead() === 0;
}

/**
 * Make sure the output is running and settled: what plays after this promise starts cleanly and on time. It stays quick once
 * that is so. Not only "suspended": Safari puts the context in "interrupted" when the output changes (a Bluetooth speaker or
 * headphones connecting), and it stays silent until resumed. The resume is asked for at once, inside the person's click.
 */
export function wakeAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "closed" || audioSettled()) return Promise.resolve();
  const resumed = ctx.state === "running" ? null : ctx.resume().catch(() => undefined);
  waking ??= (async () => {
    await resumed;
    if (sinkChange) await Promise.race([sinkChange, wait(SINK_WAIT_MS)]);
    for (let i = 0; i < SETTLE_LOOKS && settle!.lead() > 0; i++) await wait(Math.ceil(settle!.lead() * 1000));
  })().finally(() => {
    waking = null;
  });
  return waking;
}

/**
 * The audio-clock time for a sound starting "now": never in the part of the clock already rendered, where its attack would be
 * lost to a click, and past the output's first moments. For code that must start in one go; otherwise `await wakeAudio()` first.
 */
export function audioStartTime(): number {
  const ctx = getAudioContext();
  return ctx.currentTime + settle!.startIn();
}

/**
 * After about 30 seconds of pure silence Chrome swaps the output for a fake one, and reopening the real one on the next sound
 * stalls the audio for over half a second, right on that first note. So while the tab is in view the output is never quite
 * silent: a level far under hearing (-120 dB), straight to the speakers, past the volume and anything that records.
 */
function keepOutputOpen(ctx: AudioContext) {
  if (typeof document === "undefined") return;
  const hum = ctx.createConstantSource();
  const level = () => (document.visibilityState === "visible" ? INAUDIBLE : 0);
  hum.offset.value = level();
  hum.connect(ctx.destination);
  hum.start();
  document.addEventListener("visibilitychange", () => {
    hum.offset.value = level();
    if (level()) settle?.restart(); // it may have gone idle while away
  });
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
    settle?.restart();
  };
  const follow = () => {
    const change: Promise<void> = apply()
      .catch(() => undefined)
      .finally(() => {
        if (sinkChange === change) sinkChange = null;
      });
    sinkChange = change;
  };
  follow();
  subscribeDeviceChoice(follow);
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
    settle?.look();
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
    attachMaster(ctx, outputBus);
  }
  return outputBus;
}
