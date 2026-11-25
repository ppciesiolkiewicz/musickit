"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { PlayInfo } from "../server/access";
import { contentVideoFileUrl } from "../client/api";

export const WATCH = "Watch video";
export const HIDE = "Hide video";
export const NOT_PLAYED = "The video could not be played. Check your connection, then press Watch video again.";

/**
 * A content video above the tool it shows: Watch video opens it in place, above the tool, which stays on screen and
 * playable; Hide video closes it. Nothing is loaded until it is opened. A file that fails says so under the button.
 */
export default function CellVideo({ video, measure = "w-full max-w-3xl" }: { video: PlayInfo; measure?: string }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const aspect = video.width > 0 && video.height > 0 ? `${video.width} / ${video.height}` : "16 / 9";
  return (
    <div className={`flex flex-col gap-2 ${measure}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { setFailed(false); setOpen((o) => !o); }}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-100 hover:border-violet-300 hover:bg-violet-500/20"
      >
        <Icon name="video" size={13} />
        {open ? HIDE : WATCH}
      </button>
      {open && (
        <video
          src={contentVideoFileUrl(video.id)}
          controls
          playsInline
          preload="metadata"
          aria-label={video.title}
          style={{ aspectRatio: aspect }}
          className="max-h-[70vh] w-full rounded-lg bg-black object-contain"
          onError={() => { setOpen(false); setFailed(true); }}
        />
      )}
      {failed && <p role="alert" className="text-xs text-rose-300">{NOT_PLAYED}</p>}
    </div>
  );
}
