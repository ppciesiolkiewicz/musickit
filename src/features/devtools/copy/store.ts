"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { COPY_NOTES_KEY, readCopyNotes, type CopyNote } from "../model/copyNotes";

const EVENT = "musickit.dev.copyNotes";
let cache: { raw: string | null; list: CopyNote[] } = { raw: null, list: [] };
const EMPTY: CopyNote[] = [];

function snapshot(): CopyNote[] {
  const raw = localStorage.getItem(COPY_NOTES_KEY);
  if (raw !== cache.raw) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw ?? "null");
    } catch {
      /* broken: no notes */
    }
    cache = { raw, list: readCopyNotes(parsed) };
  }
  return cache.list;
}
const subscribe = (on: () => void) => {
  window.addEventListener(EVENT, on);
  window.addEventListener("storage", on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener("storage", on);
  };
};

/** Every saved note, on every page; empty on the server. */
export const useCopyNotes = (): CopyNote[] => useSyncExternalStore(subscribe, snapshot, () => EMPTY);

/** Changes the saved notes; every open overlay and page follows. */
export const writeCopyNotes = (change: (l: CopyNote[]) => CopyNote[]) => {
  localStorage.setItem(COPY_NOTES_KEY, JSON.stringify(change(snapshot())));
  window.dispatchEvent(new Event(EVENT));
};

/** The checkout's HEAD (short), from /api/dev/commit; null until it arrives, or without git. */
export function useHead(): string | null {
  const [head, setHead] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/dev/commit").then((r) => (r.ok ? r.json() : null)).then((c: { head?: string } | null) => setHead(c?.head ?? null), () => setHead(null));
  }, []);
  return head;
}
