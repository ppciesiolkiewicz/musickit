"use client";

import { useEffect, useRef } from "react";

function Video({ stream, fit }: { stream: MediaStream; fit: "cover" | "contain" }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay muted playsInline className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`} />;
}

/**
 * A camera layer: the live video cropped to fill its rect (any shape: portrait, square, wide). Until the camera is started, or after
 * it fails, a button the recording never shows (`data-chrome`) asks for a click, the only way the camera ever opens.
 */
export function CameraLayer({ stream, error, onStart }: { stream: MediaStream | null; error: string | null; onStart: () => void }) {
  if (stream) return <div className="h-full w-full overflow-hidden rounded-md bg-black"><Video stream={stream} fit="cover" /></div>;
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-900/60">
      <button data-chrome type="button" onClick={onStart} className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400">
        {error ? "Camera off: click to retry" : "Start camera"}
      </button>
    </div>
  );
}

/** A screen-share layer: the shared window shown whole (letterboxed) inside its rect. */
export function ScreenLayer({ stream, onStart }: { stream: MediaStream | null; onStart: () => void }) {
  if (stream) return <div className="h-full w-full bg-black"><Video stream={stream} fit="contain" /></div>;
  return (
    <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-700 bg-slate-900/60">
      <button data-chrome type="button" onClick={onStart} className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400">
        Share a screen or window
      </button>
    </div>
  );
}
