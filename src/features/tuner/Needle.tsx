"use client";

import { useEffect, useRef } from "react";

/** How quickly the needle closes on a reading: about two thirds of the way in this many ms. Short enough to follow a bend. */
const GLIDE_MS = 30;

/**
 * The tuner's needle, `cents` off centre (clamped to ±50, two SVG units a cent). It eases toward each reading every display frame,
 * independent of how often readings arrive, so it moves continuously instead of stepping; the position is written straight to the
 * element, not through a render. Fades out while `visible` is false.
 */
export default function Needle({
  cents,
  visible,
  colour,
}: {
  cents: number;
  visible: boolean;
  colour: string;
}) {
  const el = useRef<SVGPolygonElement>(null);
  const target = useRef(0);
  useEffect(() => {
    target.current = Math.max(-50, Math.min(50, cents));
  }, [cents]);

  useEffect(() => {
    let pos = 0,
      last = performance.now(),
      raf = 0;
    const tick = (now: number) => {
      // frame-rate independent: the same glide at 60 Hz and 120 Hz, and no overshoot after a dropped frame
      pos += (target.current - pos) * (1 - Math.exp(-(now - last) / GLIDE_MS));
      last = now;
      el.current?.setAttribute(
        "transform",
        `translate(${(pos * 2).toFixed(2)} 0)`,
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <polygon
      ref={el}
      points="-5,-4 5,-4 0,8"
      fill={colour}
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms, fill 200ms",
      }}
    />
  );
}
