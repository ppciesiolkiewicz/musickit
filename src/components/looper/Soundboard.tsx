"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScaleVoice } from "@/features/sound";
import { PAD_BASE, PAD_KEYS, padIndexOf } from "@/lib/looper/instrumentModel";

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};
const keyLabel = (code: string) => code.replace(/^Key|^Digit/, "");

/** A grid of pads, clicked or played from the computer keys (number row, then Q, A and Z rows). Pad i plays note PAD_BASE + i. */
export default function Soundboard({ pads, voice, labels, warn, selected, onSelect }: { pads: number; voice: ScaleVoice; labels: (string | null)[]; warn: boolean[]; selected: number; onSelect: (i: number) => void }) {
  const [down, setDown] = useState<ReadonlySet<number>>(new Set());
  const held = useRef(new Map<string, number>());

  const press = useCallback((tag: string, i: number) => {
    if (held.current.has(tag)) return;
    held.current.set(tag, i);
    voice.noteOn(PAD_BASE + i);
    setDown(new Set(held.current.values()));
  }, [voice]);
  const release = useCallback((tag: string) => {
    const i = held.current.get(tag);
    if (i === undefined) return;
    held.current.delete(tag);
    voice.noteOff(PAD_BASE + i);
    setDown(new Set(held.current.values()));
  }, [voice]);
  const releaseAll = useCallback(() => {
    held.current.clear();
    voice.allOff();
    setDown(new Set());
  }, [voice]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const i = padIndexOf(e.code, pads);
      if (i === null) return;
      e.preventDefault();
      press(e.code, i);
    };
    const onUp = (e: KeyboardEvent) => release(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [pads, press, release, releaseAll]);

  return (
    <div className="grid w-[34rem] max-w-full grid-cols-4 gap-1.5 p-2 sm:grid-cols-8" role="group" aria-label="Pads">
      {Array.from({ length: pads }, (_, i) => {
        const on = down.has(i);
        return (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            aria-pressed={selected === i}
            aria-label={`Pad ${i + 1}${labels[i] ? `: ${labels[i]}` : ""}, key ${keyLabel(PAD_KEYS[i])}`}
            onPointerDown={(e) => { e.preventDefault(); onSelect(i); press(`p${i}`, i); }}
            onPointerUp={() => release(`p${i}`)}
            onPointerLeave={() => release(`p${i}`)}
            onPointerCancel={() => release(`p${i}`)}
            className={`cursor-sound relative flex h-14 select-none flex-col items-start justify-between rounded-lg border p-1.5 text-left leading-none shadow-sm shadow-black/10 transition-colors ${on ? "border-amber-300 bg-amber-400 text-slate-900" : selected === i ? "border-sky-400 bg-sky-500/10 text-slate-100" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600"}`}
          >
            <span className="text-[10px] opacity-70">{keyLabel(PAD_KEYS[i])}</span>
            <span className="w-full truncate text-[10px]">{labels[i] ?? ""}</span>
            {warn[i] && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" title="Sample missing: choose another" />}
          </button>
        );
      })}
    </div>
  );
}
