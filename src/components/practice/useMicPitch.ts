"use client";

import { useEffect, useRef, useState } from "react";
import { detectPitch, hzToNote } from "@/features/tuner/pitch";
import { stablePitch } from "@/lib/practice/noteGame";

export type MicStatus = "off" | "asking" | "on" | "denied" | "error";
export interface MicReading { midi: number; t: number }

/**
 * Listen to the microphone while `enabled` and keep the last ~400 ms of detected notes.
 * `onStable` is called with a pitch class each time one has been held for 150 ms.
 * Everything is released (tracks stopped, context closed) when disabled or unmounted.
 */
export function useMicPitch(enabled: boolean, onStable?: (pc: number) => void): { status: MicStatus; heard: number | null } {
  const [status, setStatus] = useState<MicStatus>("off");
  const [heard, setHeard] = useState<number | null>(null);
  const buf = useRef<MicReading[]>([]);
  const cb = useRef(onStable);
  useEffect(() => {
    cb.current = onStable;
  }, [onStable]);

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let stopped = false;
    queueMicrotask(() => !stopped && setStatus("asking"));
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        if (stopped) return;
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 4096;
        src.connect(an);
        const data = new Float32Array(an.fftSize);
        setStatus("on");
        const tick = () => {
          if (stopped || !ctx) return;
          an.getFloatTimeDomainData(data);
          const p = detectPitch(data, ctx.sampleRate, { minHz: 70, maxHz: 1400 });
          const now = performance.now();
          if (p) buf.current.push({ midi: hzToNote(p.freq).midi, t: now });
          buf.current = buf.current.filter((r) => now - r.t < 400);
          const pc = stablePitch(buf.current);
          setHeard(pc);
          if (pc !== null) cb.current?.(pc);
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
  }, [enabled]);

  return { status, heard };
}
