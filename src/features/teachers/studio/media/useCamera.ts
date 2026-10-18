"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORE = "musickit.studio.camera";

function savedDevice(): string | null {
  try {
    return window.localStorage.getItem(STORE);
  } catch {
    return null;
  }
}

/**
 * The webcam. It opens only from `start` (a click); the chosen camera is remembered for next time but never opened on load.
 * Video only: sound comes from the audio inputs (a later plan). If the camera is refused or unplugged, `error` says so.
 */
export default function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const current = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    current.current?.getTracks().forEach((t) => t.stop());
    current.current = null;
    setStream(null);
  }, []);

  const start = useCallback(
    async (id?: string) => {
      const want = id ?? deviceId ?? savedDevice();
      stop();
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: want ? { ideal: want } : undefined, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        const track = s.getVideoTracks()[0];
        track?.addEventListener("ended", () => {
          if (current.current !== s) return;
          current.current = null;
          setStream(null);
          setError("Camera disconnected");
        });
        current.current = s;
        setStream(s);
        setError(null);
        const used = track?.getSettings().deviceId ?? null;
        setDeviceId(used);
        try {
          if (used) window.localStorage.setItem(STORE, used);
        } catch {
          /* ignore */
        }
        setDevices((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Camera unavailable");
      }
    },
    [deviceId, stop],
  );

  useEffect(() => () => current.current?.getTracks().forEach((t) => t.stop()), []);

  return { stream, error, devices, deviceId, start, stop };
}
