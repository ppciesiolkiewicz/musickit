"use client";

import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { PlanTool } from "@/features/plan/model/tools";
import { contentVideoFileUrl } from "../client/api";
import { beatAt } from "../model/clock";
import { PLAYBACK_LOOK, readOverlay, type Overlay } from "../model/overlay";
import { panelClass, panelStyle } from "./lookPanel";
import Scaled from "./Scaled";
import type { PlayInfo } from "../server/access";

/** Draws a tool at a beat over a video: the host's (the plan's `ToolOverlay`); this feature never draws a tool itself. */
export type DrawTool = (tool: PlanTool, beat: number | null) => ReactNode;

const Draw = createContext<DrawTool | null>(null);

/** Gives every content video under it a way to draw its tool. With none, a video just plays. */
export function OverlayDrawProvider({ draw, children }: { draw: DrawTool; children: ReactNode }) {
  return <Draw.Provider value={draw}>{children}</Draw.Provider>;
}

export const TOOL_OVER = "Tool over the video";

/** The page's way to draw a tool, or null when it gives none. */
export const useDrawTool = () => useContext(Draw);

/**
 * A content video, with its tool drawn over the top of it when the video saved one (`model/overlay.ts`) and the page
 * gives a way to draw it (`OverlayDrawProvider`). The tool follows the video's own clock (`beatAt`): it moves while the
 * video plays, holds while it is paused, follows a seek exactly, and makes no sound. **Tool over the video** hides it.
 */
/**
 * The tool drawn over a video at the video's own clock (`beatAt`): it moves while the video plays, holds while it is paused,
 * follows a seek exactly, and makes no sound. Sits in the video's `relative` box, where its look puts it.
 */
export function ToolOverVideo({ video, overlay, draw, hidden = false }: { video: HTMLVideoElement | null; overlay: Overlay; draw: DrawTool; hidden?: boolean }) {
  const [beat, setBeat] = useState<number | null>(null);
  useEffect(() => {
    const v = video;
    if (!v) return;
    let raf = 0;
    const read = () => setBeat(beatAt(overlay.clock, v.currentTime));
    const loop = () => { read(); raf = requestAnimationFrame(loop); };
    const play = () => { cancelAnimationFrame(raf); loop(); };
    const hold = () => { cancelAnimationFrame(raf); read(); };
    v.addEventListener("play", play);
    v.addEventListener("pause", hold);
    v.addEventListener("ended", hold);
    v.addEventListener("seeked", read);
    v.addEventListener("loadedmetadata", read);
    if (!v.paused) play(); else read();
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("play", play);
      v.removeEventListener("pause", hold);
      v.removeEventListener("ended", hold);
      v.removeEventListener("seeked", read);
      v.removeEventListener("loadedmetadata", read);
    };
  }, [video, overlay]);
  const look = overlay.look ?? PLAYBACK_LOOK;
  // where it sat over the camera (older takes: at the top), clear of the video's own controls
  return (
    <div className={`${panelClass(look, "play")} ${hidden ? "hidden" : ""}`} style={panelStyle(look)}>
      {look.place === "free" ? <Scaled on className="p-2">{draw(overlay.tool, beat)}</Scaled> : draw(overlay.tool, beat)}
    </div>
  );
}

/**
 * A content video, with its tool drawn over the top of it when the video saved one (`model/overlay.ts`) and the page
 * gives a way to draw it (`OverlayDrawProvider`), with `ToolOverVideo`. **Tool over the video** hides it.
 */
export default function OverlayVideo({ video, autoPlay = false, className = "", style, onError }: {
  video: Pick<PlayInfo, "id" | "title" | "overlay">;
  autoPlay?: boolean;
  className?: string;
  style?: CSSProperties;
  onError?: () => void;
}) {
  const draw = useContext(Draw);
  const overlay = useMemo(() => (draw ? readOverlay(video.overlay) : null), [draw, video.overlay]);
  const [el, setEl] = useState<HTMLVideoElement | null>(null);
  const [shown, setShown] = useState(true);

  const player = (
    <video ref={setEl} src={contentVideoFileUrl(video.id)} controls autoPlay={autoPlay} playsInline preload="metadata" aria-label={video.title}
      style={style} className={className} onError={onError} />
  );
  if (!overlay || !draw) return player;
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        {player}
        <ToolOverVideo video={el} overlay={overlay} draw={draw} hidden={!shown} />
      </div>
      <label className="flex w-fit items-center gap-1.5 text-xs text-slate-300">
        <input type="checkbox" checked={shown} onChange={(e) => setShown(e.target.checked)} className="accent-emerald-500" /> {TOOL_OVER}
      </label>
    </div>
  );
}
