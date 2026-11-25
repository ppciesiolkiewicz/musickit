"use client";

import { useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { easeFace, type Pt } from "../model/face";
import type { FaceSettings } from "../model/settings";
import { createFaceLook } from "../client/faceLook";
import { loadFaces } from "../client/load";

/** How long a face is kept once the face model loses it (s). */
const KEEP_FACE = 0.3;
const LOADING = "Loading the face model…";

/**
 * The face effects over a video (the live camera or a take), on their own canvas. Put it before any other overlay, so
 * those draw over the face. It follows the video's CSS filter and transform, so another overlay that grades or moves the
 * video (the neck effects' Mood light and Beat bump) grades and moves the face with it.
 */
export default function FaceView({ video, face, fit = "contain", bare = false }: {
  video: HTMLVideoElement | null;
  face: FaceSettings;
  /** how the video fills its box (its object-fit), so the drawing lines up with it */
  fit?: "contain" | "cover";
  /** no status line: the take is being exported with the effects in it */
  bare?: boolean;
}) {
  const settings = useRef(face);
  useEffect(() => { settings.current = face; }, [face]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState(LOADING);
  const on = face.effects.length > 0;

  useEffect(() => {
    if (!video || !on) return;
    let gone = false, id = 0, lastTime = -1;
    let model: FaceLandmarker | null = null;
    let pts: Pt[] | null = null, seenAt = -Infinity;
    const look = createFaceLook();
    const drawn = canvas.current;
    loadFaces().then((m) => { if (!gone) { model = m; setStatus(""); } })
      .catch((e: unknown) => { if (!gone) setStatus(`The face model didn't load: ${e instanceof Error ? e.message : String(e)}. Check the connection, then untick every Face effect and tick one again.`); });
    const frame = () => {
      if (gone) return;
      id = requestAnimationFrame(frame);
      const c = canvas.current;
      if (!c || !video.videoWidth || !model) return;
      const w = video.videoWidth, h = video.videoHeight;
      if (c.width !== w) { c.width = w; c.height = h; }
      const now = performance.now() / 1000;
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const found = model.detectForVideo(video, performance.now()).faceLandmarks[0];
        if (found) { pts = easeFace(pts, found.map((p) => ({ x: p.x * w, y: p.y * h }))); seenAt = now; }
        else if (now - seenAt > KEEP_FACE) pts = null;
        setStatus(pts ? "" : "Face: none");
      }
      c.style.transform = video.style.transform;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, w, h);
      const s = settings.current;
      if (pts) look(ctx, video, pts, new Set(s.effects), s.strength, video.style.filter);
    };
    id = requestAnimationFrame(frame);
    return () => {
      gone = true; cancelAnimationFrame(id);
      drawn?.getContext("2d")?.clearRect(0, 0, drawn.width, drawn.height);
      setStatus(LOADING);
    };
  }, [video, on]);

  if (!on) return null;
  return (
    <>
      <canvas ref={canvas} className={`pointer-events-none absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`} />
      {!bare && status && <span className="absolute bottom-2 left-2 rounded bg-slate-900/80 px-1.5 text-xs text-slate-300">{status}</span>}
    </>
  );
}
