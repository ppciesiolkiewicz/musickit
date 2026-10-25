"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { hzToNote, type Pitch } from "@/features/tuner/pitch";
import { createDetector } from "@/features/tuner/detector";
import { stablePitch } from "@/lib/practice/noteGame";
import { acquireStream } from "@/lib/practice/mic";
import { readDeviceChoice, serverDeviceChoice, subscribeDeviceChoice } from "@/features/sound";

export type MicStatus = "off" | "asking" | "on" | "denied" | "error" | "insecure";
export interface MicReading { midi: number; t: number }

/**
 * Listen to the microphone (the input chosen in the nav's devices menu, reopened when it changes) while `enabled` and keep the last ~400 ms of detected notes.
 * Pitch comes from the tuner's detector (CREPE, YIN until the model loads), which keeps reading a voice over room noise where bare YIN goes quiet.
 * `onFrame` is called every frame with the pitch class held for 150 ms, or null when nothing steady is heard.
 * `onPitch` gets every raw reading (null when nothing is pitched), for a display that follows the voice continuously.
 * Everything is released (tracks stopped, context closed) when disabled or unmounted.
 */
export function useMicPitch(enabled: boolean, onFrame?: (pc: number | null) => void, onPitch?: (p: Pitch | null) => void): { status: MicStatus; heard: number | null } {
  const [status, setStatus] = useState<MicStatus>("off");
  const [heard, setHeard] = useState<number | null>(null);
  const buf = useRef<MicReading[]>([]);
  const cb = useRef(onFrame);
  const raw = useRef(onPitch);
  const inputId = useSyncExternalStore(subscribeDeviceChoice, readDeviceChoice, serverDeviceChoice).input?.id;
  useEffect(() => {
    cb.current = onFrame;
    raw.current = onPitch;
  }, [onFrame, onPitch]);

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
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
        stream = await acquireStream(() => navigator.mediaDevices.getUserMedia({ audio: { deviceId: inputId ? { ideal: inputId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }), () => stopped);
        if (!stream) return;
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 4096;
        src.connect(an);
        const data = new Float32Array(an.fftSize);
        setStatus("on");
        const detect = createDetector();
        const tick = () => {
          if (stopped || !ctx) return;
          an.getFloatTimeDomainData(data);
          // undefined: the last frame is still being read, so nothing new this frame
          void detect(data, ctx.sampleRate, 70).then((p) => {
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
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close().catch(() => undefined);
      buf.current = [];
      setHeard(null);
      setStatus("off");
    };
  }, [enabled, inputId]);

  return { status, heard };
}
