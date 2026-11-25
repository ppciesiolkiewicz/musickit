"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** The width a Free tool is laid out at, over the camera and over the video; it is then scaled to the box's width. */
export const FREE_WIDTH = 640;

/**
 * A Free tool, laid out at `FREE_WIDTH` and scaled as a whole to the width it is given, so sizing the box shrinks or grows
 * the tool proportionally instead of reflowing it. Its height follows. With `on` false it adds two plain boxes and nothing
 * else, so a tool that moves between Free and another place keeps its tree and never restarts.
 */
export default function Scaled({ on, className = "", children }: { on: boolean; className?: string; children: ReactNode }) {
  const outer = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ scale: 1, height: 0 });

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!on || !o || !i) return;
    // layout sizes (clientWidth, offsetHeight) are the unscaled ones, so this never feeds on itself
    const read = () => {
      const scale = o.clientWidth / FREE_WIDTH;
      const height = i.offsetHeight;
      setSize((s) => (s.scale === scale && s.height === height ? s : { scale, height }));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [on]);

  if (!on) return <div><div>{children}</div></div>;
  return (
    <div ref={outer} className="relative overflow-hidden" style={{ height: size.height * size.scale }}>
      <div ref={inner} className={className} style={{ width: FREE_WIDTH, transform: `scale(${size.scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}
