"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_VOLUME, getVolume, setVolume, subscribeVolume } from "./volume";

/** The one volume for every sound in the app, persisted. */
export function useVolume(): [number, (v: number) => void] {
  return [useSyncExternalStore(subscribeVolume, getVolume, () => DEFAULT_VOLUME), setVolume];
}
