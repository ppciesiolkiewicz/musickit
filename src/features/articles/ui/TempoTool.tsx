"use client";

import { useState } from "react";
import { Chip, ChipRow } from "@/components/ui";
import type { PlanTool } from "@/features/plan/model/tools";
import { Tool } from "@/features/plan/ui/Tool";

/** The tempos an article offers a sung tune or run, slowest first: it starts on the one the article wrote (40). */
export const ARTICLE_TEMPOS = [40, 60, 80, 90];

type Sung = Extract<PlanTool, { type: "melody-singer" | "run-singer" }>;

/** A melody or run singer with a Tempo selector over it; a change starts the tool over at the new tempo. */
export default function TempoTool({ tool }: { tool: Sung }) {
  const [bpm, setBpm] = useState(tool.bpm ?? 90);
  return (
    <div className="flex flex-col gap-3">
      {/* "40 bpm, 60 bpm…" over every sung tool: kept out of search snippets */}
      <div data-nosnippet>
        <ChipRow label="Tempo">
          {ARTICLE_TEMPOS.map((t) => <Chip key={t} on={t === bpm} onClick={() => setBpm(t)}>{t} bpm</Chip>)}
        </ChipRow>
      </div>
      <Tool key={bpm} tool={{ ...tool, bpm }} />
    </div>
  );
}
