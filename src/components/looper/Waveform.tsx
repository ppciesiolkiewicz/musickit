"use client";

import { useEffect, useRef } from "react";

/** Draws a channel's waveform peaks and, when given, a moving playhead. */
export default function Waveform({ peaks, getPosition, active, colour }: { peaks: Float32Array | null; getPosition: () => number | null; active: boolean; colour: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf = 0;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const g = canvas.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      g.fillStyle = "#0f172a";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#1e293b";
      g.beginPath();
      g.moveTo(0, h / 2);
      g.lineTo(w, h / 2);
      g.stroke();
      if (peaks && peaks.length) {
        g.fillStyle = active ? colour : "#475569";
        const bw = w / peaks.length;
        for (let i = 0; i < peaks.length; i++) {
          const amp = Math.max(1, peaks[i] * (h - 4));
          g.fillRect(i * bw, (h - amp) / 2, Math.max(1, bw - 0.5), amp);
        }
      }
      const pos = getPosition();
      if (pos !== null) {
        g.fillStyle = "#f8fafc";
        g.fillRect(pos * w - 1, 0, 2, h);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [peaks, getPosition, active, colour]);

  return <canvas ref={ref} className="h-14 w-full rounded-md" aria-hidden />;
}
