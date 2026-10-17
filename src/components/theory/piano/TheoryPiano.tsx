"use client";

import { useMemo, useState } from "react";
import { Piano, type PianoKeyInfo } from "@/features/sound";
import { PIANO_SCALES, makeKey, spellNote, type ScaleId } from "@/features/theory/piano/key";
import { emptyTrail, press, release } from "@/features/theory/piano/trail";
import GrandStaff from "./GrandStaff";

const field = "h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-400";

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
          <select className={field} value={tonicPc} onChange={(e) => { changeKey(Number(e.target.value), scale); e.target.blur(); }} aria-label="Key">
            {Array.from({ length: 12 }, (_, pc) => <option key={pc} value={pc}>{makeKey(pc, scale).tonic}</option>)}
          </select>
        </label>
        <select className={field} value={scale} onChange={(e) => { changeKey(tonicPc, e.target.value as ScaleId); e.target.blur(); }} aria-label="Scale">
          {PIANO_SCALES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-sm text-slate-300">{key.tonic} {PIANO_SCALES.find((s) => s.id === scale)?.name.toLowerCase()}</span>
        <button type="button" onClick={() => setTrail(emptyTrail)} className="ml-auto rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500">Clear staff</button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
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
