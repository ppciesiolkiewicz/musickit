"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { hzToNote, type Pitch } from "@/features/tuner/pitch";
import { createDetector } from "@/features/tuner/detector";
import { stablePitch } from "@/lib/practice/noteGame";
import { acquireStream, createChannelPicker, rms } from "@/lib/practice/mic";
import { openInputStream, openLiveInput, readDeviceChoice, serverDeviceChoice, subscribeDeviceChoice, type LiveInputHandle } from "@/features/sound";

/** The input to open for `id`: the app's chosen one with its name (found again if its id changed), another device by id, or the default. */
function wantedInput(id: string | null | undefined) {
  const chosen = readDeviceChoice().input;
  return !id ? null : chosen?.id === id ? chosen : { id, label: "" };
}

export type MicStatus = "off" | "asking" | "on" | "denied" | "error" | "insecure";
export interface MicReading { midi: number; t: number }
/**
 * which channel of the device to listen to: Input 1, Input 2 (an audio interface's two inputs), both mixed, or `auto`: each input
 * kept apart and the louder one heard (a guitar on Input 1 and a voice on Input 2 never mix into one confused pitch)
 */
export type MicChannel = "left" | "right" | "sum" | "auto";
export interface MicOptions {
  /** a device id instead of the one chosen in the nav's devices menu */
  deviceId?: string | null;
  channel?: MicChannel;
}

/**
 * Listen to the microphone (the input chosen in the nav's devices menu, reopened when it changes) while `enabled` and keep the last ~400 ms of detected notes.
 * Pitch comes from the tuner's detector (CREPE, YIN until the model loads), which keeps reading a voice over room noise where bare YIN goes quiet.
 * `onFrame` is called every frame with the pitch class held for 150 ms, or null when nothing steady is heard.
 * `onPitch` gets every raw reading (null when nothing is pitched), for a display that follows the voice continuously.
 * A device with two inputs is heard on the louder one (`auto`); `options` pick another device or one channel of it (an audio
 * interface's Input 1 or 2); a change reopens the input.
 * While it listens, each input's level is published (`openLiveInput`) for the input chip.
 * Everything is released (tracks stopped, context closed) when disabled or unmounted.
 */
export function useMicPitch(enabled: boolean, onFrame?: (pc: number | null) => void, onPitch?: (p: Pitch | null) => void, options: MicOptions = {}): { status: MicStatus; heard: number | null } {
  const [status, setStatus] = useState<MicStatus>("off");
  const [heard, setHeard] = useState<number | null>(null);
  const buf = useRef<MicReading[]>([]);
  const cb = useRef(onFrame);
  const raw = useRef(onPitch);
  const chosenId = useSyncExternalStore(subscribeDeviceChoice, readDeviceChoice, serverDeviceChoice).input?.id;
  const inputId = options.deviceId ?? chosenId;
  const channel = options.channel ?? "auto";
  useEffect(() => {
    cb.current = onFrame;
    raw.current = onPitch;
  }, [onFrame, onPitch]);

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let live: LiveInputHandle | null = null;
    let raf = 0;
    let stopped = false;
    queueMicrotask(() => !stopped && setStatus("asking"));
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        // browsers only allow the mic on https (or localhost)
        if (!stopped) setStatus("insecure");
        return;
      }
      try {
        stream = await acquireStream(() => openInputStream({ channelCount: channel === "sum" ? undefined : { ideal: 2 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false }, wantedInput(inputId)), () => stopped);
        if (!stream) return;
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = () => {
          const an = ctx!.createAnalyser();
          an.fftSize = 4096;
          return an;
        };
        const inputs = channel === "auto" ? Math.min(2, stream.getAudioTracks()[0]?.getSettings().channelCount ?? 1) : 1;
        let ans: AnalyserNode[];
        if (channel === "sum" || inputs === 1) {
          ans = [analyser()];
          src.connect(ans[0]);
        } else {
          // the inputs apart: one asked for, or both for `auto` (a mono device has nothing on Input 2)
          const split = ctx.createChannelSplitter(2);
          src.connect(split);
          ans = channel === "auto" ? [analyser(), analyser()] : [analyser()];
          ans.forEach((an, i) => split.connect(an, channel === "right" ? 1 : i));
        }
        const data = ans.map((an) => new Float32Array(an.fftSize));
        const picker = createChannelPicker();
        live = openLiveInput();
        setStatus("on");
        const detect = createDetector();
        const tick = () => {
          if (stopped || !ctx) return;
          ans.forEach((an, i) => an.getFloatTimeDomainData(data[i]));
          const levels = data.map(rms);
          const heard = data.length > 1 ? picker.pick(levels) : 0;
          live?.levels(levels, heard);
          const frame = data[heard];
          // undefined: the last frame is still being read, so nothing new this frame
          void detect(frame, ctx.sampleRate, 70).then((p) => {
            if (stopped || p === undefined) return;
            const now = performance.now();
            raw.current?.(p);
            if (p) buf.current.push({ midi: hzToNote(p.freq).midi, t: now });
            buf.current = buf.current.filter((r) => now - r.t < 400);
            const pc = stablePitch(buf.current);
            setHeard(pc);
            cb.current?.(pc);
          });
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        if (stopped) return;
        setStatus(e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "error");
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      live?.close();
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close().catch(() => undefined);
      buf.current = [];
      setHeard(null);
      setStatus("off");
    };
  }, [enabled, inputId, channel]);

  return { status, heard };
}
