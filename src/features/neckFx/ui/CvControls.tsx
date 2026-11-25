"use client";

import { useState } from "react";
import { AMOUNT_MAX } from "../model/fx";
import { DEFAULT_CV, NUMBERS, NUMBER_WORDS, readCv, type CvSettings, type Numbers } from "../model/cvFx";

/** Kept in this browser, shared by both pages with Read the neck (OpenCV). */
const KEY = "musickit.neckCv";

function load(): CvSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? readCv(JSON.parse(raw)) : DEFAULT_CV;
  } catch { return DEFAULT_CV; }
}

/** The OpenCV reader's settings, kept in this browser. */
export function useCv(): [CvSettings, (part: Partial<CvSettings>) => void] {
  const [cv, setState] = useState<CvSettings>(load);
  const set = (part: Partial<CvSettings>) => setState((c) => {
    const next = { ...c, ...part };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* kept for this visit only */ }
    return next;
  });
  return [cv, set];
}

const input = "rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200";
const field = "flex items-center gap-1.5 text-slate-300";

/**
 * Fret numbers, Strings, Notes under fingers, Neck fire with its Strength, Pick pulse, the take's layers (Chord shapes,
 * Fingers, Coming next) and Labels, for a page that shows NeckCvView. `hasKey`: the page gives a key, so notes can be numbered in it.
 */
export default function CvControls({ cv, set, hasKey = false }: { cv: CvSettings; set: (part: Partial<CvSettings>) => void; hasKey?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <label className={field} title="Which frets get their number above and below the board.">
        Fret numbers
        <select value={cv.numbers} onChange={(e) => set({ numbers: e.target.value as Numbers })} className={input}>
          {NUMBERS.map((n) => <option key={n} value={n}>{NUMBER_WORDS[n]}</option>)}
        </select>
      </label>
      <label className={field} title="Draws the six strings where they are found.">
        <input type="checkbox" checked={cv.strings} onChange={(e) => set({ strings: e.target.checked })} className="accent-sky-500" /> Strings
      </label>
      <label className={field} title="Names the note under each fingertip on the board. A note heard lights the place it was most likely played.">
        <input type="checkbox" checked={cv.notes} onChange={(e) => set({ notes: e.target.checked })} className="accent-sky-500" /> Notes under fingers
      </label>
      <label className={field} title="Flames along the board's edges, hottest by the fretting hand. A note heard shakes its string and lights it in the note's colour.">
        <input type="checkbox" checked={cv.fire} onChange={(e) => set({ fire: e.target.checked })} className="accent-sky-500" /> Neck fire
      </label>
      <label className={`${field} ${cv.fire ? "" : "opacity-40"}`} title="How strong Neck fire is. 100% is the usual look.">
        Strength
        <input type="range" min={0} max={AMOUNT_MAX} step={0.05} value={cv.fireStrength} disabled={!cv.fire} onChange={(e) => set({ fireStrength: Number(e.target.value) })} className="w-24 accent-sky-500" />
        <span className="w-10 text-right font-mono text-xs text-slate-400">{Math.round(cv.fireStrength * 100)}%</span>
      </label>
      <label className={field} title="A ring from each note's place as it is played, its name while it sounds, and the chord the notes make above the board (on a take with Chord shapes on, over the shape).">
        <input type="checkbox" checked={cv.pulse} onChange={(e) => set({ pulse: e.target.checked })} className="accent-sky-500" /> Pick pulse
      </label>
      <label className={field} title="On a take, notes played together are joined in one shape with the chord's name over it.">
        <input type="checkbox" checked={cv.chords} onChange={(e) => set({ chords: e.target.checked })} className="accent-sky-500" /> Chord shapes
      </label>
      <label className={field} title="On a take, the finger that plays each note, as a small number beside it.">
        <input type="checkbox" checked={cv.fingers} onChange={(e) => set({ fingers: e.target.checked })} className="accent-sky-500" /> Fingers
      </label>
      <label className={field} title="On a take, the places of the next notes show faintly just before they are played.">
        <input type="checkbox" checked={cv.next} onChange={(e) => set({ next: e.target.checked })} className="accent-sky-500" /> Coming next
      </label>
      <label className={field} title={`What the notes on the neck show: their names, or their numbers in the key (1, 3, 5).${hasKey ? "" : " This page gives no key, so notes show their names."}`}>
        Labels
        {/* with no key, numbers can't be shown: the select reads Note names whatever is kept */}
        <select value={hasKey ? cv.labels : "name"} onChange={(e) => set({ labels: e.target.value as CvSettings["labels"] })} className={input}>
          <option value="name">Note names</option>
          <option value="degree" disabled={!hasKey}>Numbers in the key</option>
        </select>
      </label>
    </div>
  );
}
