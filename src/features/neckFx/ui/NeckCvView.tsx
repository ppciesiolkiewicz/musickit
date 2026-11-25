"use client";

import { useEffect, useRef, useState } from "react";
import { boardMarkers, type BoardMarker } from "../model/cvFrets";
import { MARKER_MM, OFF_BOARD } from "../model/fx";
import { parsePlaced, type Pt } from "../model/grid";
import { loadCvReader, type CvReader } from "../client/cv";

/** How long the frets stay once the markers are gone (s), and how far toward a new read they move each read. */
const KEEP = 0.5, EASE = 0.45;

/**
 * Over a video (the live camera or a take), the OpenCV reader: the fret markers it finds, and each fret wire across the board
 * with its number above and below. Markers come from `fx.markers` (each one's size from Markers or the A3 layout).
 */
export default function NeckCvView({ video, markers, fit = "contain", bare = false }: {
  video: HTMLVideoElement | null;
  /** "id@fret, …" (the Markers setting) */
  markers: string;
  fit?: "contain" | "cover";
  /** no status line: the take is being exported with the drawing in it */
  bare?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const placed = useRef<BoardMarker[]>([]);
  useEffect(() => {
    placed.current = boardMarkers(parsePlaced(markers), (id) => parsePlaced(markers).find((p) => p.id === id)?.mm ?? MARKER_MM.get(id), OFF_BOARD);
  }, [markers]);
  const [status, setStatus] = useState("Loading OpenCV…");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!video) return;
    let gone = false, id = 0, lastTime = -1, reader: CvReader | null = null;
    const drawn = canvas.current;
    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d", { willReadFrequently: true })!;
    let seen: { id: number; corners: Pt[]; followed: boolean }[] = [];
    let wires: { top: Pt; bottom: Pt }[] | null = null, wiresAt = -Infinity;
    const mix = (a: Pt, b: Pt) => ({ x: a.x + (b.x - a.x) * EASE, y: a.y + (b.y - a.y) * EASE });

    void loadCvReader().then((r) => {
      if (gone) { r.close(); return; }
      reader = r;
      setStatus("Play the take to read it.");
      const frame = () => {
        if (gone) return;
        id = requestAnimationFrame(frame);
        const c = canvas.current;
        if (!c || !video.videoWidth) return;
        const w = video.videoWidth, h = video.videoHeight;
        if (c.width !== w) { c.width = w; c.height = h; }
        const now = performance.now() / 1000;
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          if (scratch.width !== w) { scratch.width = w; scratch.height = h; }
          sctx.drawImage(video, 0, 0, w, h);
          const read = r.read(sctx.getImageData(0, 0, w, h), placed.current);
          seen = read.markers.map((m) => ({ ...m, followed: read.followed.includes(m.id) }));
          if (read.wires) {
            wires = wires && wires.length === read.wires.length
              ? read.wires.map((nw, i) => ({ top: mix(wires![i].top, nw.top), bottom: mix(wires![i].bottom, nw.bottom) }))
              : read.wires;
            wiresAt = now;
          } else if (now - wiresAt > KEEP) wires = null;
          const ids = seen.map((m) => m.id).sort((a, b) => a - b);
          setStatus(`OpenCV · Markers: ${ids.length ? ids.join(", ") : "none"} · ${read.wires ? "Frets found" : "No frets: under two fret markers seen"} · ${Math.round(read.ms)} ms a frame`);
        }

        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, w, h);
        const scale = w / 1280;
        ctx.lineWidth = 2 * scale;
        for (const m of seen) {
          ctx.strokeStyle = m.followed ? "#fb923c" : "#e879f9";
          ctx.beginPath();
          m.corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
          ctx.closePath(); ctx.stroke();
        }
        if (!wires) return;
        const font = Math.round(16 * scale);
        ctx.font = `bold ${font}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        wires.forEach((wire, f) => {
          const { top, bottom } = wire, len = Math.hypot(bottom.x - top.x, bottom.y - top.y) || 1;
          const u = { x: (bottom.x - top.x) / len, y: (bottom.y - top.y) / len };
          ctx.strokeStyle = f === 0 ? "rgba(253,224,71,0.9)" : "rgba(134,239,172,0.8)"; ctx.lineWidth = (f === 0 ? 3 : 1.5) * scale;
          ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bottom.x, bottom.y); ctx.stroke();
          // the number just beyond each edge, along the wire
          for (const [p, sgn] of [[top, -1], [bottom, 1]] as const) {
            const at = { x: p.x + u.x * sgn * font * 0.9, y: p.y + u.y * sgn * font * 0.9 };
            ctx.lineWidth = 3 * scale; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(String(f), at.x, at.y);
            ctx.fillStyle = "white"; ctx.fillText(String(f), at.x, at.y);
          }
        });
      };
      id = requestAnimationFrame(frame);
    }).catch((e: unknown) => {
      if (!gone) setProblem(`OpenCV didn't load: ${e instanceof Error ? e.message : String(e)}. Check the connection, then turn Read the neck (OpenCV) off and on.`);
    });
    return () => {
      gone = true; cancelAnimationFrame(id); reader?.close();
      drawn?.getContext("2d")?.clearRect(0, 0, drawn.width, drawn.height);
    };
  }, [video]);

  return (
    <>
      <canvas ref={canvas} className={`pointer-events-none absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`} />
      {!bare && <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-1.5 text-xs text-slate-300">{problem || status}</span>}
    </>
  );
}
