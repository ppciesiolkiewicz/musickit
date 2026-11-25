"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { fitBox, type Box, type Look } from "../model/overlay";
import type { Piece } from "../model/clock";
import { panelBg, panelClass, panelStyle } from "./lookPanel";
import { useVideoBeat } from "./OverlayVideo";
import { useFrameBeat, type KitView } from "./kit";
import Scaled from "./Scaled";

/**
 * The tool's box over the camera, where the look puts it. One tree for every place, so changing the place never restarts
 * the tool. With Free, the bar on top moves it and either bottom corner sizes it, as shares of `frame`'s picture.
 */
export default function ToolBox({ look, unsetBox, narrow, shown, frame, onBox, onLetGo, children }: {
  look: Look;
  /** where a Free box sits until it is moved */
  unsetBox: Box;
  /** a narrow tool, laid out at its own width when Free */
  narrow: boolean;
  shown: boolean;
  /** the camera's frame: the box's place and size are shares of it */
  frame: RefObject<HTMLDivElement | null>;
  /** the box moved or sized (while dragging) */
  onBox: (box: Box) => void;
  /** the drag let go: keep the look */
  onLetGo: () => void;
  children: ReactNode;
}) {
  const free = look.place === "free";
  // Free: the bar on top of the tool moves it, a bottom corner sizes it, as shares of the camera's picture; kept when let go
  const dragBox = (mode: "move" | "size" | "sizeLeft") => (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height || e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    const panel = el.parentElement?.getBoundingClientRect();
    // the height follows the scaled tool (`Scaled`): read it off the screen, and keep the tool's proportions when sizing
    const box0 = look.box ?? unsetBox;
    const from = panel?.height ? { ...box0, h: panel.height / rect.height } : box0;
    const tall = from.h / from.w;
    const [sx, sy] = [e.clientX, e.clientY];
    el.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent) => {
      const dx = (m.clientX - sx) / rect.width;
      const dy = (m.clientY - sy) / rect.height;
      // the corner follows whichever way the pointer went further, across or down
      // the bottom left corner sizes it the other way across, keeping its right edge where it was
      const left = mode === "sizeLeft";
      const right = from.x + from.w;
      const w = Math.min(left ? right : 1 - from.x, (1 - from.y) / tall, Math.max(from.w + (left ? -dx : dx), from.w + dy / tall));
      onBox(fitBox(mode === "move" ? { ...from, x: from.x + dx, y: from.y + dy } : { ...from, x: left ? right - w : from.x, w, h: w * tall }));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      onLetGo();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  return (
    <div className={`${free ? "absolute" : panelClass(look, "record")} ${shown ? "" : "hidden"}`} style={panelStyle(look, unsetBox)}>
      <div className={free ? `${panelBg(look)} pt-2.5` : undefined}>
        <Scaled on={free} fit={narrow} className="p-2">{children}</Scaled>
      </div>
      {free && <div onPointerDown={dragBox("move")} title="Drag to move the tool" className="absolute inset-x-0 top-0 h-2.5 cursor-move touch-none bg-slate-600/40 hover:bg-slate-500/80"><span className="mx-auto mt-1 block h-0.5 w-8 rounded-full bg-slate-300/50" /></div>}
      {/* faint until pointed at: they sit over the camera's picture */}
      {free && <div onPointerDown={dragBox("sizeLeft")} title="Drag to size the tool" className="absolute bottom-0 left-0 size-4 cursor-sw-resize touch-none border-b-2 border-l-2 border-slate-300/25 hover:border-white/80" />}
      {free && <div onPointerDown={dragBox("size")} title="Drag to size the tool" className="absolute bottom-0 right-0 size-4 cursor-se-resize touch-none border-b-2 border-r-2 border-slate-300/25 hover:border-white/80" />}
    </div>
  );
}

/** A kit view over the camera, at the beat `read` gives each frame (the click's while recording to it, else the tool's). */
export function LiveView({ view, read }: { view: KitView; read: () => number | null }) {
  return <>{view.draw(useFrameBeat(read))}</>;
}

/**
 * A kit view over the take, in the panel the tool sits in over the take (Place, Size and Free apply), at the take's beat
 * (`beatAt` of `clock` at the video's time; null without a clock). It is in the take's box, so Export with overlay records it.
 */
export function ViewOverTake({ video, clock, view, look, hidden }: { video: HTMLVideoElement | null; clock: Piece[] | null; view: KitView; look: Look; hidden: boolean }) {
  const beat = useVideoBeat(video, clock);
  return (
    <div className={`${panelClass(look, "play")} ${hidden ? "hidden" : ""}`} style={panelStyle(look)}>
      {look.place === "free" ? <Scaled on className="p-2">{view.draw(beat)}</Scaled> : view.draw(beat)}
    </div>
  );
}
