import { useSyncExternalStore } from "react";
import { DEFAULT_STUDIO, STUDIO_KEY, readStudio, type StudioState } from "../model/compose";

const noSubscribe = () => () => {};

/** False on the server and while hydrating, true after: render storage-backed UI only once this is true. */
export const useMounted = (): boolean => useSyncExternalStore(noSubscribe, () => true, () => false);

/** The studio's saved state (defaults on the server or when nothing usable is stored). */
export function loadStudio(): StudioState {
  if (typeof window === "undefined") return DEFAULT_STUDIO;
  try {
    return readStudio(JSON.parse(localStorage.getItem(STUDIO_KEY) ?? "null"));
  } catch {
    return readStudio(null);
  }
}
