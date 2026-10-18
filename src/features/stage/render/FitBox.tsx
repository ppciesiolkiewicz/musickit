"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lays its content out at a fixed design width, then scales it to fit the box, so a widget looks the same at any size
 * and in any frame (the studio's, a recording's, the editor's preview). Centred, never cropped.
 */
export default function FitBox({ width, children }: { width: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0, h: 0 });

  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const h = i.offsetHeight;
      if (h) setFit({ scale: Math.min(o.clientWidth / width, o.clientHeight / h), h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={outer} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div style={{ width: width * fit.scale, height: fit.h * fit.scale }} className="relative shrink-0">
        <div ref={inner} style={{ width, transform: `scale(${fit.scale})`, transformOrigin: "top left", visibility: fit.scale ? "visible" : "hidden" }} className="absolute left-0 top-0">
          {children}
        </div>
      </div>
    </div>
  );
}
