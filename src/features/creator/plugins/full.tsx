"use client";

import ArpeggiosExplorer from "@/components/chordKit/ArpeggiosExplorer";
import CagedExplorer from "@/components/chordKit/CagedExplorer";
import ChordKit from "@/components/chordKit/ChordKit";
import ProgressionsTab from "@/components/chordKit/ProgressionsTab";
import ScalePage from "@/components/chordKit/ScalePage";
import ScalesIndex from "@/components/chordKit/ScalesIndex";
import TriadsExplorer from "@/components/chordKit/TriadsExplorer";
import ImprovApp from "@/components/improv/ImprovApp";
import CircleOfFifths from "@/components/theory/CircleOfFifths";
import { PROG_LIST } from "@/features/theory";
import { useCreatorKey } from "../KeyProvider";

/**
 * The full views: each theory page itself, started on the creator's key (C when there is none). A page keeps its own pickers;
 * changing the creator's key starts it again on the new key (the `key` prop remounts it).
 */
function useStart() {
  const { ctx, choice } = useCreatorKey();
  const tonic = choice.tonicPc ?? 0;
  return { ctx, choice, tonic, minor: !!ctx && ctx.steps[2] === 3, id: `${choice.tonicPc}-${choice.family}-${choice.mode}` };
}

export function ScaleFull() {
  const s = useStart();
  return <ScalePage key={s.id} familyIndex={s.choice.family} modeIndex={s.choice.mode} initialKey={s.tonic} syncUrl={false} />;
}

export function ModesFull() {
  const s = useStart();
  return <ScalesIndex key={s.id} initialKey={s.tonic} syncUrl={false} />;
}

export function ChordsFull() {
  const s = useStart();
  return <ChordKit key={s.id} initialTab={s.ctx ? "key" : "shapes"} initialKey={{ tonicPc: s.tonic, family: s.choice.family, mode: s.choice.mode }} />;
}

export function ProgressionsFull() {
  const s = useStart();
  const sel = PROG_LIST.findIndex((p) => p.fam === s.choice.family && p.k === s.choice.mode);
  return <ProgressionsTab key={s.id} initialSel={Math.max(0, sel)} />;
}

export function CircleFull() {
  const { ctx, choice, setKey } = useCreatorKey();
  const value = ctx && choice.tonicPc !== null ? { pc: choice.tonicPc, minor: ctx.steps[2] === 3 } : null;
  return <CircleOfFifths value={value} onChange={(k) => setKey({ tonicPc: k.pc, family: 0, mode: k.minor ? 5 : 0 })} />;
}

export function TriadsFull() {
  const s = useStart();
  const tri = s.ctx?.chords[0].tri;
  return <TriadsExplorer key={s.id} initialTonic={s.tonic} initialQuality={tri && tri !== "other" ? tri : "maj"} />;
}

export function CagedFull() {
  const s = useStart();
  return <CagedExplorer key={s.id} initialRoot={s.tonic} initialQuality={s.minor ? "minor" : "major"} />;
}

export function ArpeggiosFull() {
  const s = useStart();
  return <ArpeggiosExplorer key={s.id} initialTonic={s.tonic} initialFamily={s.choice.family} initialMode={s.choice.mode} />;
}

export function ImprovFull() {
  return <ImprovApp />;
}
