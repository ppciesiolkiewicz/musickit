"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ChordDiagram from "@/components/chordKit/ChordDiagram";
import { chordShapeFor } from "@/features/exercises/cues/voicing";
import { strumShape } from "@/lib/chordKit/playback";
import type { InlineChordInfo } from "../model/noteText";

/** how long the card stays after the pointer leaves, ms: time to move from the name down into the card */
const LINGER = 150;
/** the card's width, px; it is kept this far inside the window */
const WIDTH = 224;

/**
 * A chord named in an exercise's text by its number in the key (`{{chord:ii7}}`), drawn as its name in the key the
 * tools are in. Pointing at it (or tapping it) opens a card: which chord of the key it is, the syllable of its root,
 * and its chord box with its Play. The card is drawn on the body, since a chord box can't sit inside a paragraph.
 */
export default function InlineChord({ info }: { info: InlineChordInfo }) {
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const name = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiced = useMemo(() => chordShapeFor(info.name.replace("♭", "b").replace("♯", "#"), "open"), [info.name]);
  const shifted = /^[b#♭♯]/.test(info.numeral);
  const number = `${shifted ? (/^[b♭]/.test(info.numeral) ? "♭" : "♯") : ""}${info.number}`;

  const keep = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const show = () => {
    keep();
    const r = name.current?.getBoundingClientRect();
    if (!r) return;
    const half = WIDTH / 2 + 8;
    setAt({ left: Math.min(window.innerWidth - half, Math.max(half, r.left + r.width / 2)), top: r.bottom });
  };
  const hide = () => {
    keep();
    timer.current = setTimeout(() => setAt(null), LINGER);
  };
  useEffect(() => keep, []);
  // a scroll moves the name away from the card
  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [at]);

  return (
    <>
      <button
        ref={name}
        type="button"
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
        onClick={() => (at ? setAt(null) : show())}
        onFocus={show}
        onBlur={hide}
        aria-expanded={!!at}
        className="cursor-help whitespace-nowrap font-semibold text-sky-200 underline decoration-sky-400/60 decoration-dotted underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
      >
        {info.name}
      </button>
      {at && createPortal(
        // the padding is part of the hover area, so the pointer can move down into the card without closing it
        <div className="fixed z-50 -translate-x-1/2 pt-1.5 text-left text-xs text-slate-300" style={{ left: at.left, top: at.top, width: WIDTH }} onPointerEnter={keep} onPointerLeave={(e) => e.pointerType === "mouse" && hide()}>
          <div className="flex flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-xl">
            <span className="font-medium text-slate-100">{info.name}: the {number} chord</span>
            <span>{shifted ? `In ${info.key} major it is built on ${info.syllable}.` : `In ${info.key} major it is built on ${info.syllable}, the ${info.ordinal} note of the scale.`}</span>
            {voiced && (
              <div className="w-40 self-center">
                <ChordDiagram shape={voiced.shape} rootFret={voiced.fret} onPlay={() => strumShape(voiced.shape, voiced.fret)} />
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
