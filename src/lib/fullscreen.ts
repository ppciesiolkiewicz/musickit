/**
 * The browser's full screen, with the webkit-prefixed calls older Safari and iPad still need. iPhone Safari has neither, so
 * `canFullscreen` is false there and the calls do nothing. Entering must run inside a click or key press.
 */
type WebkitDocument = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void };

const doc = () => document as WebkitDocument;

export const canFullscreen = (): boolean => doc().fullscreenEnabled === true || doc().webkitFullscreenEnabled === true;
export const isFullscreen = (): boolean => (doc().fullscreenElement ?? doc().webkitFullscreenElement ?? null) !== null;

export function enterFullscreen(el: HTMLElement = document.documentElement): void {
  if (isFullscreen()) return;
  const e = el as WebkitElement;
  if (e.requestFullscreen) e.requestFullscreen().catch(() => {});
  else e.webkitRequestFullscreen?.();
}

export function exitFullscreen(): void {
  if (!isFullscreen()) return;
  if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  else doc().webkitExitFullscreen?.();
}

/** Calls back on entering and leaving full screen; returns the unsubscribe. */
export function onFullscreenChange(cb: () => void): () => void {
  document.addEventListener("fullscreenchange", cb);
  document.addEventListener("webkitfullscreenchange", cb);
  return () => {
    document.removeEventListener("fullscreenchange", cb);
    document.removeEventListener("webkitfullscreenchange", cb);
  };
}
