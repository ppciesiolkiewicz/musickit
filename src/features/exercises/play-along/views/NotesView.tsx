"use client";

import { useMemo, useRef } from "react";
import SingingStaff from "@/components/theory/singing/SingingStaff";
import { getSharedPiano, midiToName, wakeAudio } from "@/features/sound";
import { useLabelRoot } from "@/features/theory/useLabelSystem";
import { clefFor, spellName, type Ladder } from "@/features/theory/singing";
import { isNow, noteOf, rootOf, type ViewProps } from "./common";

/**
 * The cues in order on the shared staff, the chord named above each new chord, each note labelled by the label
 * setting (counted from the chord root, or the key by the "count from" setting); the note sounding now is lit, the
 * ones not highlighted dimmed. Strummed chords can't sit on one staff line of single notes, so a line with strums is
 * drawn as chips instead.
 */
export default function NotesView({ cues, pos, keyPc }: ViewProps) {
  const [from] = useLabelRoot();
  const none = useRef<number | null>(null);
  const single = cues.length > 1 && cues.every((c) => c.midi.length === 1);
  const ladder = useMemo((): Ladder => {
    const notes = cues.map((c) => {
      const midi = c.midi[0] ?? 60;
      const n = noteOf(midi, rootOf(c, keyPc, from));
      return { midi, spelled: spellName(n.name, midi, n.degreeText), degree: n.degree, label: n.semi === 0 ? "R" : n.degreeText };
    });
    return { notes, signature: 0, pcs: new Set(notes.map((n) => n.midi % 12)), title: "The line" };
  }, [cues, keyPc, from]);
  if (!single) return <Chips cues={cues} pos={pos} />;
  const midis = cues.map((c) => c.midi[0]);
  const marks = cues.map((c, i) => (c.chord && c.chord !== cues[i - 1]?.chord ? c.chord : undefined));
  const playing = cues.findIndex((c) => isNow(c, pos));
  const tap = async (i: number) => {
    await wakeAudio();
    const piano = getSharedPiano();
    piano.noteOn(midis[i]);
    setTimeout(() => piano.noteOff(midis[i]), 600);
  };
  return (
    <SingingStaff ladder={ladder} clef={clefFor({ low: Math.min(...midis), high: Math.max(...midis) })} pitch={none} played={playing < 0 ? null : playing}
      onNote={(i) => void tap(i)} marks={marks} muted={(i) => !cues[i].highlighted} />
  );
}

/** Strums and notes as chips, the chord named above each new chord. */
function Chips({ cues, pos }: Pick<ViewProps, "cues" | "pos">) {
  return (
    <div className="flex flex-wrap items-end gap-1.5">
      {cues.map((c, i) => {
        const now = isNow(c, pos);
        const label = c.chord && c.chord !== cues[i - 1]?.chord ? c.chord : "";
        return (
          <div key={`${c.at}-${i}`} className="flex flex-col items-center gap-0.5">
            <span className="h-4 text-[10px] text-slate-500">{label}</span>
            <span className={`rounded-md border px-1.5 py-0.5 font-mono text-xs transition ${now ? "border-sky-400 bg-sky-500/20 text-sky-100" : c.highlighted ? "border-slate-700 text-slate-100" : "border-slate-800 text-slate-600"}`}>
              {c.kind === "strum" ? `${c.chord} ↓` : c.midi.map(midiToName).join(" ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
