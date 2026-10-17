"use client";

import { useMemo, useState } from "react";
import { Piano, type PianoKeyInfo } from "@/features/sound";
import { PIANO_SCALES, makeKey, spellNote, type ScaleId } from "@/features/theory/piano/key";
import { emptyTrail, press, release } from "@/features/theory/piano/trail";
import GrandStaff from "./GrandStaff";
import { Select } from "@/components/ui";

/** The theory piano: pick a key, play, and watch the staff name every note, interval and chord in that key. */
export default function TheoryPiano() {
  const [tonicPc, setTonicPc] = useState(0);
  const [scale, setScale] = useState<ScaleId>("major");
  const [trail, setTrail] = useState(emptyTrail);
  const key = useMemo(() => makeKey(tonicPc, scale), [tonicPc, scale]);

  const keyInfo = useMemo<PianoKeyInfo>(() => ({
    inScale: (m) => key.scalePcs.has(((m % 12) + 12) % 12),
    isTonic: (m) => ((m % 12) + 12) % 12 === key.tonicPc,
    degree: (m) => (key.scalePcs.has(((m % 12) + 12) % 12) ? spellNote(key, m).degree : null),
  }), [key]);

  // the trail holds spellings from the old key, so a new key starts it afresh
  const changeKey = (pc: number, s: ScaleId) => {
    setTonicPc(pc);
    setScale(s);
    setTrail(emptyTrail);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Key
          <Select value={tonicPc} onChange={(pc) => changeKey(pc, scale)} aria-label="Key" options={Array.from({ length: 12 }, (_, pc) => ({ value: pc, label: makeKey(pc, scale).tonic }))} />
        </label>
        <Select value={scale} onChange={(s) => changeKey(tonicPc, s)} aria-label="Scale" options={PIANO_SCALES.map((s) => ({ value: s.id, label: s.name }))} />
        <span className="text-sm text-slate-300">{key.tonic} {PIANO_SCALES.find((s) => s.id === scale)?.name.toLowerCase()}</span>
        <button type="button" onClick={() => setTrail(emptyTrail)} className="ml-auto rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500">Clear staff</button>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
        <GrandStaff steps={trail.steps} signature={key.signature} tonic={key.tonic} numerals={scale !== "chromatic"} />
      </div>

      <div className="overflow-x-auto pb-1">
        <Piano
          keyInfo={keyInfo}
          onNoteOn={(m) => setTrail((t) => press(t, key, m, performance.now()))}
          onNoteOff={(m) => setTrail((t) => release(t, m))}
        />
      </div>
    </div>
  );
}
