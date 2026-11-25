"use client";

import { useState } from "react";
import { DEFAULT_FACE, FACE_EFFECTS, FACE_HINTS, FACE_WORDS, STRENGTH_MAX, readFace, type FaceSettings } from "../model/settings";

/** Kept in this browser and shared by every page with the face effects. */
const KEY = "musickit.faceFx";

function load(): FaceSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? readFace(JSON.parse(raw)) : DEFAULT_FACE;
  } catch { return DEFAULT_FACE; }
}

/** The face effects' settings, kept in this browser. */
export function useFace(): [FaceSettings, (part: Partial<FaceSettings>) => void] {
  const [face, setState] = useState<FaceSettings>(load);
  const set = (part: Partial<FaceSettings>) => setState((f) => {
    const next = { ...f, ...part };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* kept for this visit only */ }
    return next;
  });
  return [face, set];
}

const field = "flex items-center gap-1.5 text-slate-300";

/** Face: each effect's tick and Strength. */
export default function FaceControls({ face, set }: { face: FaceSettings; set: (part: Partial<FaceSettings>) => void }) {
  return (
    <fieldset className="flex flex-col gap-1 text-sm">
      <legend className="mb-1 text-slate-400">Face</legend>
      {FACE_EFFECTS.map((e) => {
        const off = !face.effects.includes(e);
        return (
          <div key={e} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <label className={`${field} w-32`}>
              <input type="checkbox" checked={!off} className="accent-sky-500"
                onChange={(ev) => set({ effects: ev.target.checked ? FACE_EFFECTS.filter((x) => x === e || face.effects.includes(x)) : face.effects.filter((x) => x !== e) })} />
              {FACE_WORDS[e]}
            </label>
            <label className={`${field} ${off ? "opacity-40" : ""}`} title="How strong the effect is. 100% is the usual look.">
              Strength
              <input type="range" min={0} max={STRENGTH_MAX} step={0.05} value={face.strength[e]} disabled={off}
                onChange={(ev) => set({ strength: { ...face.strength, [e]: Number(ev.target.value) } })} className="w-24 accent-sky-500" />
              <span className="w-10 text-right font-mono text-xs text-slate-400">{Math.round(face.strength[e] * 100)}%</span>
            </label>
            <span className="text-xs text-slate-500">{FACE_HINTS[e]}</span>
          </div>
        );
      })}
    </fieldset>
  );
}
