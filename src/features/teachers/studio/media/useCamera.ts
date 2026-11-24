"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** the device each camera layer last used, by layer id */
const STORE = "musickit.studio.cameras";
/** the camera layers whose picture is flipped, by layer id */
const MIRROR = "musickit.studio.cameraMirrors";
/** the one camera of before: its device is the first camera's guess */
const OLD_STORE = "musickit.studio.camera";

function read<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, v: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function savedDevices(): Record<string, string> {
  const v = read<unknown>(STORE, {});
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === "string"));
}

function savedMirrors(): string[] {
  const v = read<unknown>(MIRROR, []);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export interface CameraFeed {
  stream: MediaStream | null;
  error: string | null;
  deviceId: string | null;
}

const OFF: CameraFeed = { stream: null, error: null, deviceId: null };

/**
 * The cameras, one per camera layer (a webcam and an iPhone over Continuity Camera, say), keyed by the layer's id. A camera opens
 * only from `start` (a click); its device is remembered for that layer but never opened on load. A layer with no device of its
 * own takes a camera no other layer is showing, so a second camera shows a second picture. Video only. If a camera is refused or
 * unplugged, its `error` says so. A mirrored layer is flipped left to right (in the recording too); the choice is remembered.
 * `keep` lets go of the streams of layers that are gone.
 */
export default function useCameras() {
  const [feeds, setFeeds] = useState<Record<string, CameraFeed>>({});
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const streams = useRef<Record<string, MediaStream>>({});
  // the studio draws nothing until mounted, so reading storage here can't mismatch the server's markup
  const [mirrors, setMirrors] = useState<string[]>(() => (typeof window === "undefined" ? [] : savedMirrors()));

  const toggleMirror = useCallback((id: string) => {
    setMirrors((m) => {
      const next = m.includes(id) ? m.filter((x) => x !== id) : [...m, id];
      write(MIRROR, next);
      return next;
    });
  }, []);

  const stop = useCallback((id: string) => {
    streams.current[id]?.getTracks().forEach((t) => t.stop());
    delete streams.current[id];
    setFeeds((f) => {
      if (!(id in f)) return f;
      const next = { ...f };
      delete next[id];
      return next;
    });
  }, []);

  const start = useCallback(
    async (id: string, deviceId?: string) => {
      const saved = savedDevices();
      const inUse = Object.entries(streams.current)
        .filter(([k]) => k !== id)
        .map(([, s]) => s.getVideoTracks()[0]?.getSettings().deviceId)
        .filter(Boolean);
      let want = deviceId ?? saved[id] ?? (Object.keys(streams.current).length === 0 ? read<string | null>(OLD_STORE, null) : null) ?? undefined;
      if (!deviceId && (!want || inUse.includes(want))) {
        // a camera no other layer is showing; labels and ids are known once one camera was allowed
        const all = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput" && d.deviceId);
        want = all.find((d) => !inUse.includes(d.deviceId))?.deviceId ?? want;
      }
      streams.current[id]?.getTracks().forEach((t) => t.stop());
      delete streams.current[id];
      const open = (exact: boolean) =>
        navigator.mediaDevices.getUserMedia({
          video: { deviceId: want ? (exact ? { exact: want } : { ideal: want }) : undefined, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      try {
        let s: MediaStream;
        try {
          s = await open(true);
        } catch (e) {
          // a remembered camera that is gone: take any
          if (!want || deviceId || !(e instanceof Error) || e.name !== "OverconstrainedError") throw e;
          s = await open(false);
        }
        const track = s.getVideoTracks()[0];
        track?.addEventListener("ended", () => {
          if (streams.current[id] !== s) return;
          delete streams.current[id];
          setFeeds((f) => ({ ...f, [id]: { ...OFF, error: "Camera disconnected" } }));
        });
        streams.current[id] = s;
        const used = track?.getSettings().deviceId ?? null;
        setFeeds((f) => ({ ...f, [id]: { stream: s, error: null, deviceId: used } }));
        if (used) write(STORE, { ...savedDevices(), [id]: used });
        setDevices((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput"));
      } catch (e) {
        setFeeds((f) => ({ ...f, [id]: { ...OFF, error: e instanceof Error ? e.message : "Camera unavailable" } }));
      }
    },
    [],
  );

  /** lets go of every camera whose layer is not in `ids`, and forgets its device */
  const keep = useCallback(
    (ids: string[]) => {
      for (const id of Object.keys(streams.current)) if (!ids.includes(id)) stop(id);
      setFeeds((f) => (Object.keys(f).every((id) => ids.includes(id)) ? f : Object.fromEntries(Object.entries(f).filter(([id]) => ids.includes(id)))));
      const saved = savedDevices();
      if (Object.keys(saved).some((id) => !ids.includes(id))) write(STORE, Object.fromEntries(Object.entries(saved).filter(([id]) => ids.includes(id))));
    },
    [stop],
  );

  useEffect(() => () => Object.values(streams.current).forEach((s) => s.getTracks().forEach((t) => t.stop())), []);

  const feed = useCallback((id: string): CameraFeed => feeds[id] ?? OFF, [feeds]);

  return { feed, devices, start, keep, mirrored: (id: string) => mirrors.includes(id), toggleMirror };
}
