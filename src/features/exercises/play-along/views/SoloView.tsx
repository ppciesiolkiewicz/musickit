"use client";

import { useMemo, useRef } from "react";
import { ScaleNeck, cellKey, type DotState } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import SingingStaff from "@/components/theory/singing/SingingStaff";
import { makeKey, spellNote } from "@/features/theory/piano/key";
import type { Ladder } from "@/features/theory/singing";
import { useLabelRoot, useLabelSystem } from "@/features/theory/useLabelSystem";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { SCALE_NECK_FRETS, type ScaleCell } from "@/lib/chordKit/scalePositions";
import type { SoloTargets } from "../solo";
import { cellOf, noteOf } from "./common";

/**
 * Improvising (solo-over, two-scales): one fixed set of notes on the whole neck for the whole exercise, so nothing
 * jumps when the chord changes. Only the highlight moves, to the sounding chord's targets (its tones when it has
 * none); in a scale switch the notes outside the scale playing now are muted. `others: "hidden"` leaves only the highlighted notes. Labels count from
 * the key or the chord root, by the label setting; tap a note to hear it.
 */
export default function SoloView({ targets, mode, others, keyPc }: { targets: SoloTargets; mode: "neck" | "notes" | "tab"; others: "muted" | "hidden"; keyPc?: number }) {
  const [system] = useLabelSystem();
  const [from] = useLabelRoot();
  const { active, tap } = useNotePlayer();
  const chordRoot = parseChordQuery(targets.chord)?.rootPc;
  const root = (from === "scale" && keyPc !== undefined ? keyPc : chordRoot) ?? keyPc ?? 0;
  const lit = useMemo(() => new Set(targets.lit), [targets.lit]);
  const muted = useMemo(() => new Set(targets.muted), [targets.muted]);
  const shown = others === "hidden" ? targets.lit : targets.pcs;
  const cells = useMemo(() => {
    const keep = new Set(shown);
    const out: ScaleCell[] = [];
    for (let s = 0; s < 6; s++) for (let f = 0; f <= SCALE_NECK_FRETS; f++) {
      const c = cellOf(s, f, root);
      if (keep.has(c.pc)) out.push(c);
    }
    return out;
  }, [shown, root]);
  const stateOf = (pc: number): DotState => (lit.has(pc) ? "highlighted" : muted.has(pc) ? "muted" : "normal");
  const over = targets.chord ? ` over ${targets.chord}` : "";
  if (mode === "notes")
    return <SoloStaff shown={shown} root={root} keyPc={keyPc} stateOf={stateOf} onNote={(midi) => tap(`staff-${midi}`, midi)} />;
  return (
    <div className="flex flex-col gap-1">
      {mode === "tab" && <p className="text-[11px] text-slate-500">Improvise: no fixed tab. Aim for the ringed notes{over}.</p>}
      <ScaleNeck cells={cells} big={() => true} active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} title={`Notes to play from${over}`} states={(c) => stateOf(c.pc)} />
    </div>
  );
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/**
 * The notes to play from on the guitar's staff, one octave up from the label root and the root again on top, each
 * labelled by the label setting; the highlighted ones stand out and the rest are dimmed. Tap a note to hear it.
 */
function SoloStaff({ shown, root, keyPc, stateOf, onNote }: { shown: number[]; root: number; keyPc?: number; stateOf: (pc: number) => DotState; onNote: (midi: number) => void }) {
  const none = useRef<number | null>(null);
  const key = makeKey(keyPc ?? root, "major");
  const ladder = useMemo((): Ladder => {
    const base = 48 + root;
    const midis = [...shown.map((pc) => base + mod12(pc - root)).sort((a, b) => a - b), base + 12];
    const notes = midis.map((midi) => {
      const n = noteOf(midi, root);
      return { midi, spelled: spellNote(key, midi), degree: n.degree, label: n.semi === 0 ? "R" : n.degreeText };
    });
    return { notes, signature: key.signature, pcs: new Set(midis.map((m) => m % 12)), title: "Notes to play from" };
  }, [shown, root, key]);
  const lit = shown.some((pc) => stateOf(pc) === "highlighted");
  return (
    <SingingStaff ladder={ladder} clef="treble8" pitch={none} played={null} onNote={(i) => onNote(ladder.notes[i].midi)}
      muted={(i) => { const st = stateOf(ladder.notes[i].midi % 12); return st === "muted" || (lit && st !== "highlighted"); }} />
  );
}
