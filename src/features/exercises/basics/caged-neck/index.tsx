"use client";

import { CagedBoxPanels, CagedNeckMap } from "@/components/chordKit/CagedExplorer";
import { keyChoiceFor, keyContext } from "@/features/creator";
import type { CagedLetter } from "@/lib/chordKit/caged";

/** The CAGED shapes of the key's chord on the guitar neck (the minor shapes when the scale has a minor 3rd): with `shapes`, those shapes one under another, each with its chord, arpeggio, pentatonic and scale; without, all five on the whole neck. */
export function View({ pc, scale, shapes }: { pc: number; scale: string; shapes?: CagedLetter[] }) {
  const quality = keyContext(keyChoiceFor(pc, scale))?.steps[2] === 3 ? "minor" : "major";
  return (
    <div data-tour="caged-neck-panel" className="flex flex-col gap-4">
      {shapes?.length ? shapes.map((l) => <CagedBoxPanels key={l} rootPc={pc} quality={quality} letter={l} />) : <CagedNeckMap rootPc={pc} quality={quality} />}
    </div>
  );
}
