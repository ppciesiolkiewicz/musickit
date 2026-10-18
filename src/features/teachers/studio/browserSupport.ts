/** Smallest window the studio lays out in: the frame plus its two side columns. */
export const MIN_STUDIO_WIDTH = 1024;

/**
 * The studio records exactly its 16:9 frame through element capture, which only desktop Chrome and Edge have
 * (`RestrictionTarget`, or the older `CropTarget`). Elsewhere, and on small screens, it shows a message instead.
 */
export function isStudioSupported(): boolean {
  if (typeof window === "undefined") return false;
  return ("RestrictionTarget" in window || "CropTarget" in window) && window.innerWidth >= MIN_STUDIO_WIDTH;
}
