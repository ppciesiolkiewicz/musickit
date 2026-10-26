"use client";

import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ShapeReport } from "./shape";

/**
 * Lays its content out at a fixed design width, then scales it to fit the box, so a widget looks the same at any size
 * and in any frame (the studio's, a recording's, the editor's preview). Centred, never cropped.
 * With `scroll`, a long widget (a whole cheatsheet page) is scaled to the box's width only and scrolls inside it. A page's full-bleed
 * sections (`bleed`, sized from the window) keep to the box.
 * Tells the frame around it the content's shape (`ShapeReport`), except a scrolling one, which has no shape to keep.
 */
export default function FitBox({ width, scroll = false, children }: { width: number; scroll?: boolean; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0, w: width, h: 0 });
  const report = useContext(ShapeReport);

  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const h = i.offsetHeight;
      if (!h) return;
      // content wider than its design width (it does not wrap) is scaled in whole, never cut off on the right
      const w = Math.max(width, i.scrollWidth);
      setFit({ scale: scroll ? o.clientWidth / w : Math.min(o.clientWidth / w, o.clientHeight / h), w, h });
      if (!scroll) report?.(w / h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width, scroll, report]);

  return (
    <div ref={outer} className={`flex h-full w-full justify-center ${scroll ? "items-start overflow-y-auto overflow-x-hidden" : "items-center overflow-hidden"}`}>
      <div style={{ width: fit.w * fit.scale, height: fit.h * fit.scale }} className="relative shrink-0">
        <div ref={inner} style={{ width, transform: `scale(${fit.scale})`, transformOrigin: "top left", visibility: fit.scale ? "visible" : "hidden" }} className="absolute left-0 top-0 [&_.bleed]:mx-0">
          {children}
        </div>
      </div>
    </div>
  );
}
