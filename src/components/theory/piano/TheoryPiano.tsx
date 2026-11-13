"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Piano, type PianoKeyInfo } from "@/features/sound";
import { PIANO_SCALES, makeKey, spellNote, type ScaleId } from "@/features/theory/piano/key";
import { VolumeRow } from "@/features/settings";
import { emptyTrail, press, release } from "@/features/theory/piano/trail";
import GrandStaff from "./GrandStaff";
import { SettingsPanel, SettingsSection } from "@/components/ui";
import { PianoSettings } from "./PianoSettings";

/**
 * The theory piano: pick a key, play, and watch the staff name every note, interval and chord in that key. The key, scale
 * and volume sit in the page's settings panel; `lead` and `children` are the page's text before and after the piano, so
 * the panel runs beside all of it.
 */
export default function TheoryPiano({ lead, children }: { lead?: ReactNode; children?: ReactNode }) {
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

  const settings = (
    <SettingsSection first>
      <div data-tour="piano-key" className="flex flex-col gap-2">
        <PianoSettings tonicPc={tonicPc} scale={scale} onChange={changeKey} />
      </div>
      <VolumeRow />
    </SettingsSection>
  );

  return (
    <SettingsPanel name={`${key.tonic} ${PIANO_SCALES.find((s) => s.id === scale)?.name.toLowerCase()}`} settings={settings}>
    {lead}
    <div className="flex flex-col gap-3">
      <div data-tour="piano-staff" className="mx-auto flex w-full max-w-3xl flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
        <button type="button" onClick={() => setTrail(emptyTrail)} className="self-end rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500">Clear staff</button>
        <GrandStaff steps={trail.steps} signature={key.signature} tonic={key.tonic} numerals={scale !== "chromatic"} />
      </div>

      <div data-tour="piano-keys" className="overflow-x-auto pb-1">
        <Piano
          keyInfo={keyInfo}
          onNoteOn={(m) => setTrail((t) => press(t, key, m, performance.now()))}
          onNoteOff={(m) => setTrail((t) => release(t, m))}
        />
      </div>
    </div>
    {children}
    </SettingsPanel>
  );
}
