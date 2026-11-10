"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { hzToNote, type Pitch } from "@/features/tuner/pitch";
import { createDetector } from "@/features/tuner/detector";
import { stablePitch } from "@/lib/practice/noteGame";
import { acquireStream } from "@/lib/practice/mic";
import { openInputStream, openLiveInput, readDeviceChoice, serverDeviceChoice, subscribeDeviceChoice, tapChannels, type ChannelTap, type InputChannel, type LiveInputHandle } from "@/features/sound";

/** The input to open for `id`: the app's chosen one with its name (found again if its id changed), another device by id, or the default. */
function wantedInput(id: string | null | undefined) {
  const chosen = readDeviceChoice().input;
  return !id ? null : chosen?.id === id ? chosen : { id, label: "" };
}

export type MicStatus = "off" | "asking" | "on" | "denied" | "error" | "insecure";
export interface MicReading { midi: number; t: number }
export interface MicOptions {
  /** a device id instead of the one chosen in the nav's devices menu */
  deviceId?: string | null;
  /** the channel of that device (both mixed, Input 1 or Input 2) instead of the app's channel choice */
  channel?: InputChannel;
}

/**
 * Listen to the microphone (the input chosen in the nav's devices menu, reopened when it changes) while `enabled` and keep the last ~400 ms of detected notes.
 * Pitch comes from the tuner's detector (CREPE, YIN until the model loads), which keeps reading a voice over room noise where bare YIN goes quiet.
 * `onFrame` is called every frame with the pitch class held for 150 ms, or null when nothing steady is heard.
 * `onPitch` gets every raw reading (null when nothing is pitched), for a display that follows the voice continuously.
 * It hears the app's chosen channel (both inputs mixed by default, or an audio interface's Input 1 or 2, followed live); `options`
 * pick another device or a channel of its own; a change of device reopens the input.
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
  const channel = options.channel ?? null;
  useEffect(() => {
    cb.current = onFrame;
    raw.current = onPitch;
  }, [onFrame, onPitch]);

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let live: LiveInputHandle | null = null;
    let tap: ChannelTap | null = null;
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
        stream = await acquireStream(() => openInputStream({ channelCount: { ideal: 2 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false }, wantedInput(inputId)), () => stopped);
        if (!stream) return;
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const channels = stream.getAudioTracks()[0]?.getSettings().channelCount ?? 1;
        tap = channel ? tapChannels(ctx, src, channels, { read: () => channel, subscribe: () => () => {} }) : tapChannels(ctx, src, channels);
        const an = ctx.createAnalyser();
        an.fftSize = 4096;
        tap.output.connect(an);
        const frame = new Float32Array(an.fftSize);
        live = openLiveInput();
        setStatus("on");
        const detect = createDetector();
        const tick = () => {
          if (stopped || !ctx) return;
          an.getFloatTimeDomainData(frame);
          if (tap) live?.levels(tap.levels());
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
      tap?.close();
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close().catch(() => undefined);
      buf.current = [];
      setHeard(null);
      setStatus("off");
    };
  }, [enabled, inputId, channel]);

  return { status, heard };
}
