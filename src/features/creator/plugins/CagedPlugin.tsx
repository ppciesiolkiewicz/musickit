"use client";

import { useMemo } from "react";
import ChordDiagram from "@/components/chordKit/ChordDiagram";
import { CAGED_THEORY, cagedBoxes, cagedContext, type CagedQuality } from "@/lib/chordKit/caged";
import { strumShape } from "@/lib/chordKit/playback";
import { useCreatorKey } from "../KeyProvider";
import { Body, Hint } from "./common";

/** The five CAGED shapes of the key's tonic chord, from the nut up, each with its fret box. Minor-third keys use the minor forms. */
export default function CagedPlugin() {
  const { ctx } = useCreatorKey();
  const rootPc = ctx ? ctx.tonic.pc : 0;
  const quality: CagedQuality = ctx && ctx.steps[2] === 3 ? "minor" : "major";
  const boxes = useMemo(() => cagedBoxes(rootPc, quality), [rootPc, quality]);
  const cctx = useMemo(() => cagedContext(rootPc, quality), [rootPc, quality]);
  const th = CAGED_THEORY[quality];
  return (
    <Body title={`CAGED · ${cctx.names[0]} ${quality}`} general={!ctx}>
      {!ctx && <Hint>Pick a key above to move the shapes. Until then, C major.</Hint>}
      <div className="grid gap-1 [grid-template-columns:repeat(auto-fit,minmax(5.5rem,1fr))]">
        {boxes.map((b) => (
          <div key={b.letter} className="flex flex-col items-center rounded-lg border border-slate-800 bg-slate-950/50 p-1">
            <span className="text-xs font-medium text-slate-200">{b.letter} shape</span>
            <span className="text-[10px] text-slate-500">frets {b.from}–{b.to}</span>
            <div className="w-full max-w-[7rem]"><ChordDiagram shape={b.shape} rootFret={b.rootFret} ctx={cctx} onPlay={() => strumShape(b.shape, b.rootFret)} /></div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400"><b className="text-slate-200">{th.pentName}</b> {th.pent.map((s) => cctx.names[th.scale.indexOf(s)]).join(" ")} · <b className="text-slate-200">{th.scaleName}</b> {cctx.names.join(" ")}</p>
    </Body>
  );
}
