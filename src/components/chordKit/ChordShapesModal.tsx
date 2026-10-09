"use client";

import { useMemo, useState } from "react";
import ShapeBrowser from "./ShapeBrowser";
import { Chip, Modal } from "@/components/ui";
import { keyEntries } from "@/lib/chordKit/shapeTools";
import type { KeyContext } from "@/features/theory/theory";

/** Every shape for every chord of the mode, in the same browser as the chord explorer, opened on one chord. */
export default function ChordShapesModal({ ctx, degree, onClose }: { ctx: KeyContext; degree: number; onClose: () => void }) {
  const [d, setD] = useState<number | null>(degree);
  const entries = useMemo(() => keyEntries(ctx), [ctx]);
  return (
    <Modal title={`Guitar shapes in ${ctx.names[0]} ${ctx.modeName}`} onClose={onClose}>
      <ShapeBrowser
        entries={entries}
        ctx={ctx}
        forcedTags={d === null ? [] : ["d:" + ctx.chords[d].roman]}
        header={
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chord">
            <Chip on={d === null} onClick={() => setD(null)}>All chords</Chip>
            {ctx.chords.map((c) => (
              <Chip key={c.degree} on={d === c.degree} onClick={() => setD(c.degree)}>
                {c.roman} <span className="text-slate-400">{c.seventhName}</span>
              </Chip>
            ))}
          </div>
        }
      />
    </Modal>
  );
}
