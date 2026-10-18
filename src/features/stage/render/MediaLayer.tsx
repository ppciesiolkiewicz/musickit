"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/Icon";

function Video({ stream, fit }: { stream: MediaStream; fit: "cover" | "contain" }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay muted playsInline className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`} />;
}

export interface MediaControls {
  /** the layer fills the frame now */
  full: boolean;
  onToggleFull: () => void;
  onClose: () => void;
  /** "camera" or "screen share", for the buttons' names */
  name: string;
}

const cornerBtn = "flex h-6 w-6 items-center justify-center rounded-md bg-slate-950/80 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-800";

/** Fullscreen/minimize and close, in the layer's top-right corner on hover. `data-chrome`: never in a recording. */
function Corner({ c }: { c: MediaControls }) {
  return (
    <div data-chrome className="absolute right-1.5 top-1.5 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" title={c.full ? `Minimize ${c.name}` : `Fullscreen ${c.name}`} aria-label={c.full ? `Minimize ${c.name}` : `Fullscreen ${c.name}`} onClick={c.onToggleFull} className={cornerBtn}>
        <Icon name={c.full ? "minimize" : "maximize"} size={13} />
      </button>
      <button type="button" title={`Close ${c.name}`} aria-label={`Close ${c.name}`} onClick={c.onClose} className={`${cornerBtn} hover:text-rose-300`}>
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}

/**
 * A camera layer: the live video cropped to fill its rect (any shape: portrait, square, wide). Until the camera is started, or after
 * it fails, a button the recording never shows (`data-chrome`) asks for a click, the only way the camera ever opens.
 */
export function CameraLayer({ stream, error, onStart, controls }: { stream: MediaStream | null; error: string | null; onStart: () => void; controls?: MediaControls }) {
  return (
    <div className="relative h-full w-full">
      {stream ? (
        <div className="h-full w-full overflow-hidden rounded-md bg-black"><Video stream={stream} fit="cover" /></div>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-900/60">
          <button data-chrome type="button" onClick={onStart} className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400">
            {error ? "Camera off: click to retry" : "Start camera"}
          </button>
        </div>
      )}
      {controls && <Corner c={controls} />}
    </div>
  );
}

/** A screen-share layer: the shared window shown whole (letterboxed) inside its rect. */
export function ScreenLayer({ stream, onStart, controls }: { stream: MediaStream | null; onStart: () => void; controls?: MediaControls }) {
  return (
    <div className="relative h-full w-full">
      {stream ? (
        <div className="h-full w-full bg-black"><Video stream={stream} fit="contain" /></div>
      ) : (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-700 bg-slate-900/60">
          <button data-chrome type="button" onClick={onStart} className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400">
            Share a screen or window
          </button>
        </div>
      )}
      {controls && <Corner c={controls} />}
    </div>
  );
}
