"use client";

import { useEffect, useRef, useState } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { NeckRead } from "./takes";

/** The hand model and its runtime, fetched on first use (dev tool only). */
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
/** Printable markers for the detector's dictionary (ARUCO_MIP_36h12). */
export const MARKER_PAGE = "https://damianofalcioni.github.io/js-aruco2/samples/marker-creator/marker-creator.html?dictionary=ARUCO_MIP_36h12";
/** Marker detection runs on a frame this wide, for speed. */
const DETECT_WIDTH = 640;
const TIPS = [4, 8, 12, 16, 20];

type Marker = { id: number; corners: { x: number; y: number }[] };
type Detector = { detect: (img: ImageData) => Marker[] };

let hands: Promise<HandLandmarker> | null = null;
function loadHands() {
  hands ??= import("@mediapipe/tasks-vision").then(async ({ FilesetResolver, HandLandmarker }) =>
    HandLandmarker.createFromOptions(await FilesetResolver.forVisionTasks(WASM), {
      baseOptions: { modelAssetPath: HAND_MODEL }, runningMode: "VIDEO", numHands: 2,
    }));
  hands.catch(() => { hands = null; });
  return hands;
}
async function loadMarkers(): Promise<Detector> {
  // CommonJS: the library puts AR on its exports
  const mod = (await import("js-aruco2")) as unknown as { AR?: { Detector: new (o: object) => Detector }; default?: { AR: { Detector: new (o: object) => Detector } } };
  const AR = mod.AR ?? mod.default!.AR;
  return new AR.Detector({ dictionaryName: "ARUCO_MIP_36h12" });
}

/**
 * Over the take video: the ArUco markers seen on the neck (outlined, with their id) and the hands (fingertips of the fretting
 * hand). Works on the live camera too. Only shows what it finds: the fret grid from the markers is the next step (tasks.txt NEW18).
 */
export default function NeckView({ video, onRead }: { video: HTMLVideoElement | null; /** each frame read, for the take's log */ onRead?: (r: NeckRead) => void }) {
  const report = useRef(onRead);
  useEffect(() => { report.current = onRead; }, [onRead]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Loading the hand model…");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!video) return;
    let gone = false, id = 0, lastTime = -1;
    const drawn = canvas.current;
    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d", { willReadFrequently: true })!;
    void Promise.all([loadHands(), loadMarkers()]).then(([hand, markers]) => {
      if (gone) return;
      setStatus("Play the take to read it.");
      const frame = () => {
        if (gone) return;
        id = requestAnimationFrame(frame);
        const c = canvas.current;
        if (!c || !video.videoWidth || video.currentTime === lastTime) return;
        lastTime = video.currentTime;
        const w = video.videoWidth, h = video.videoHeight;
        if (c.width !== w) { c.width = w; c.height = h; }
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, w, h);

        const k = Math.min(1, DETECT_WIDTH / w);
        scratch.width = Math.round(w * k); scratch.height = Math.round(h * k);
        sctx.drawImage(video, 0, 0, scratch.width, scratch.height);
        const found = markers.detect(sctx.getImageData(0, 0, scratch.width, scratch.height));
        ctx.lineWidth = 3; ctx.font = "bold 22px sans-serif";
        for (const m of found) {
          ctx.strokeStyle = "#34d399"; ctx.fillStyle = "#34d399";
          ctx.beginPath();
          m.corners.forEach((p, i) => (i ? ctx.lineTo(p.x / k, p.y / k) : ctx.moveTo(p.x / k, p.y / k)));
          ctx.closePath(); ctx.stroke();
          ctx.fillText(String(m.id), m.corners[0].x / k, m.corners[0].y / k - 6);
        }

        const res = hand.detectForVideo(video, performance.now());
        ctx.fillStyle = "#fbbf24";
        for (const lm of res.landmarks) {
          for (const p of lm) ctx.fillRect(p.x * w - 2, p.y * h - 2, 4, 4);
          for (const t of TIPS) { ctx.beginPath(); ctx.arc(lm[t].x * w, lm[t].y * h, 7, 0, Math.PI * 2); ctx.fill(); }
        }
        const r2 = (v: number) => Math.round(v * 1000) / 1000;
        report.current?.({
          t: video.currentTime,
          markers: found.map((m) => m.id).sort((a, b) => a - b),
          at: found.map((m) => ({
            id: m.id,
            x: r2(m.corners.reduce((t, p) => t + p.x, 0) / 4 / scratch.width),
            y: r2(m.corners.reduce((t, p) => t + p.y, 0) / 4 / scratch.width),
          })),
          hands: res.landmarks.map((lm) => TIPS.map((t) => ({ x: r2(lm[t].x), y: r2((lm[t].y * h) / w) }))),
        });
        setStatus(`Markers: ${found.length ? found.map((m) => m.id).sort((a, b) => a - b).join(", ") : "none"} · Hands: ${res.landmarks.length}`);
      };
      id = requestAnimationFrame(frame);
    }).catch((e: unknown) => {
      if (!gone) setProblem(`The neck reader didn't load: ${e instanceof Error ? e.message : String(e)}. Check the connection, then turn Read the neck off and on.`);
    });
    return () => { gone = true; cancelAnimationFrame(id); drawn?.getContext("2d")?.clearRect(0, 0, drawn.width, drawn.height); };
  }, [video]);

  return (
    <>
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
      <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-1.5 text-xs text-slate-300">{problem || status}</span>
    </>
  );
}
