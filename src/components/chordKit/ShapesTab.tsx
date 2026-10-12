"use client";

import { useMemo, useSyncExternalStore } from "react";
import ShapeBrowser from "./ShapeBrowser";
import ChordSearchResults from "./ChordSearchResults";
import { plainEntries } from "@/lib/chordKit/shapeTools";
import { matchesText, parseChordQuery } from "@/lib/chordKit/chordSearch";

/* `?q=` is the source of truth, read and written without a navigation, so links like /theory/chords?q=Am open on a search. */
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const readQ = () => new URLSearchParams(window.location.search).get("q") ?? "";
function writeQ(v: string) {
  const url = new URL(window.location.href);
  if (v) url.searchParams.set("q", v);
  else url.searchParams.delete("q");
  window.history.replaceState(null, "", url);
  listeners.forEach((fn) => fn());
}

/** The key-free explorer: open chords and every movable shape, once, with search. */
export default function ShapesTab() {
  const q = useSyncExternalStore(subscribe, readQ, () => "");
  const all = useMemo(() => plainEntries(), []);
  const chord = useMemo(() => parseChordQuery(q), [q]);
  const entries = useMemo(() => (chord ? all : all.filter((e) => matchesText(e, q))), [all, chord, q]);
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Search
        <input
          type="search"
          value={q}
          onChange={(e) => writeQ(e.target.value)}
          placeholder="A chord (C, F#m7, Bb maj7) or a word (shell, funk, open)"
          className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        />
      </label>
      {chord ? (
        <ChordSearchResults rootPc={chord.rootPc} semis={chord.semis} name={chord.name} />
      ) : (
        <ShapeBrowser
          entries={entries}
          header={<p className="text-xs text-slate-400">Open chords first, then every movable shape, drawn once. Slide a movable shape&rsquo;s root fret, tap a diagram to hear it, tap tags to filter.</p>}
        />
      )}
    </div>
  );
}
