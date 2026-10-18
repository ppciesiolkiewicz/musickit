"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A shared screen or window, picked in Chrome's dialog (only from a click). No sound: the shared app's audio is not part of a lesson.
 * When the person stops sharing from Chrome's own bar, `onEnded` runs so the studio can drop the layer.
 */
export default function useScreenShare(onEnded: () => void) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const current = useRef<MediaStream | null>(null);
  const ended = useRef(onEnded);
  useEffect(() => {
    ended.current = onEnded;
  }, [onEnded]);

  const stop = useCallback(() => {
    current.current?.getTracks().forEach((t) => t.stop());
    current.current = null;
    setStream(null);
  }, []);

  /** true when a screen is now shared, false when the person cancelled Chrome's dialog */
  const start = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      current.current?.getTracks().forEach((t) => t.stop());
      s.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (current.current !== s) return;
        current.current = null;
        setStream(null);
        ended.current();
      });
      current.current = s;
      setStream(s);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => () => current.current?.getTracks().forEach((t) => t.stop()), []);

  return { stream, start, stop };
}
