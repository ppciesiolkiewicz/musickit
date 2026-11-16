"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { catalogue } from "@/features/plan/model/catalogue";
import { parsePlanConfig } from "@/features/plan/model/config";
import { PasteBox } from "@/features/plan/ui/PromptAndPaste";
import type { Composed, StudioState } from "../model/compose";
import type { RunInput, RunRecord } from "../model/history";
import { post } from "./api";

/**
 * Keep a reply pasted from an AI the prompt was copied into: it lands in the history with the prompt and its inputs and
 * comes back through `onRecord`. The page doesn't run the prompt itself.
 */
export default function PastePanel({ composed, state, answers, onRecord }: {
  composed: Composed; state: StudioState; answers: unknown; onRecord: (r: RunRecord) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const entries = useMemo(() => catalogue(), []);
  const pastedResult = useMemo(() => (pasted.trim() ? parsePlanConfig(pasted, entries) : null), [pasted, entries]);

  const input: RunInput = {
    prompt: composed.text, mode: state.mode, answers, overrides: state.overrides, parts: composed.parts,
    ...(state.mode === "next" && state.previousId ? { previousId: state.previousId, feedback: state.feedback } : {}),
  };
  const savePasted = async () => {
    setError(null);
    try {
      onRecord(await post("/api/dev/history", { ...input, reply: pasted }));
      setPasted("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <PasteBox text={pasted} onText={setPasted} result={pastedResult} />
      <div><Button size="sm" onClick={savePasted} disabled={!pasted.trim() || !composed.text}>Keep in history</Button></div>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
