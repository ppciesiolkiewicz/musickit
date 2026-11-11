"use client";

import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { FlowInBox, InGrid, ScrollInBox, ShapeReport } from "./shape";

/** a page in a given box is laid out at least this wide (a cheatsheet page's width on the site) */
const PAGE_WIDTH = 1200;
/** a box narrower than this is a phone's: the page is laid out at the box's width, not scaled down */
const NARROW = 640;

/**
 * Lays its content out at a fixed design width, then scales it to fit the box, so a widget looks the same at any size
 * and in any frame (the studio's, a recording's, the editor's preview). Centred, never cropped.
 * With `scroll`, a long widget (a whole cheatsheet page) is scaled to the box's width only and scrolls inside it. A page's full-bleed
 * sections (`bleed`, and the scale settings bar's 50vw margins, sized from the window) keep to the box.
 * In a given box (`ScrollInBox`, a page on the grid) it scrolls too, laid out at the page's width, or on a narrow box at the box's own, so it reflows as on a phone instead of shrinking.
 * Tells the frame around it the content's shape (`ShapeReport`), except a scrolling one, which has no shape to keep.
 * With `trueSize`, on the grid (`InGrid`) the content is laid out at the box's own width and never scaled: a text box being typed in,
 * as a browser extension's marks and popups over it (spelling, writing and AI helpers) are placed for an unscaled field.
 */
export default function FitBox({ width, scroll: ownScroll = false, trueSize = false, children }: { width: number; scroll?: boolean; trueSize?: boolean; children: ReactNode }) {
  const inBox = useContext(ScrollInBox);
  const natural = useContext(InGrid) && trueSize;
  const flow = useContext(FlowInBox);
  // a long widget in a flowing page is laid out like one in a given box, but grows to its content instead of scrolling
  const reflow = inBox || (flow && ownScroll);
  const scroll = !flow && (inBox || ownScroll);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0, w: width, h: 0, design: width });
  const report = useContext(ShapeReport);

  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const h = i.offsetHeight;
      if (!h) return;
      // content wider than its design width (it does not wrap) is scaled in whole, never cut off on the right
      if (natural) {
        const w = o.clientWidth;
        setFit({ scale: 1, w, h, design: w });
        report?.(w / h);
        return;
      }
      const design = !reflow ? width : o.clientWidth < NARROW ? o.clientWidth : Math.max(width, PAGE_WIDTH);
      const w = Math.max(design, i.scrollWidth);
      setFit({ scale: scroll ? o.clientWidth / w : Math.min(o.clientWidth / w, o.clientHeight / h), w, h, design });
      if (!scroll) report?.(w / h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width, reflow, scroll, natural, report]);

  return (
    <div ref={outer} className={`flex h-full w-full justify-center ${scroll ? "items-start overflow-y-auto overflow-x-hidden" : "items-center overflow-hidden"}`}>
      <div style={{ width: fit.w * fit.scale, height: fit.h * fit.scale }} className="relative shrink-0">
        <div ref={inner} style={{ width: fit.design, transform: fit.scale === 1 ? undefined : `scale(${fit.scale})`, transformOrigin: "top left", visibility: fit.scale ? "visible" : "hidden" }} className="absolute left-0 top-0 [&_.bleed]:mx-0 [&_[class*='50vw']]:mx-0">
          {children}
        </div>
      </div>
    </div>
  );
}
