"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Select } from "@/components/ui";
import { catalogue } from "@/features/plan/model/catalogue";
import { parsePlanConfig } from "@/features/plan/model/config";
import { PasteBox } from "@/features/plan/ui/PromptAndPaste";
import type { Composed, StudioState } from "../model/compose";
import { newRunId, type ActiveRun, type RunInput, type RunRecord } from "../model/history";
import { DEV_MODELS, type DevModel } from "../model/models";
import { cancelRunning, fetchRunning, post } from "./api";

const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

/**
 * Run the composed prompt with the local Claude, or keep a reply pasted from another AI; either way it lands in the
 * history and comes back through `onRecord`. Runs live on the dev server, not in the page: a reload doesn't stop them, so
 * every run in progress is listed (polled) with its time and a Cancel, and `onRefresh` fires when one ends.
 */
export default function RunPanel({ composed, state, set, answers, onRecord, onRefresh }: {
  composed: Composed; state: StudioState; set: (change: Partial<StudioState>) => void; answers: unknown;
  onRecord: (r: RunRecord) => void; onRefresh: () => void;
}) {
  const [running, setRunning] = useState<ActiveRun[]>([]);
  const [own, setOwn] = useState<ActiveRun | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<string[]>([]);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const entries = useMemo(() => catalogue(), []);
  const pastedResult = useMemo(() => (pasted.trim() ? parsePlanConfig(pasted, entries) : null), [pasted, entries]);

  const shown = own && !running.some((r) => r.id === own.id) ? [own, ...running] : running;
  const busy = shown.length > 0;
  useEffect(() => {
    fetchRunning().then((r) => {
      seen.current = r.map((x) => x.id);
      setRunning(r);
    });
  }, []);
  useEffect(() => {
    if (!busy) return;
    const tick = setInterval(() => setNow(Date.now()), 500);
    const poll = setInterval(async () => {
      const next = await fetchRunning();
      if (seen.current.some((id) => !next.some((n) => n.id === id))) onRefresh();
      seen.current = next.map((r) => r.id);
      setRunning(next);
    }, 3000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [busy, onRefresh]);

  const input: RunInput = {
    prompt: composed.text, mode: state.mode, answers, overrides: state.overrides, parts: composed.parts,
    ...(state.mode === "next" && state.previousId ? { previousId: state.previousId, feedback: state.feedback } : {}),
  };
  const run = async () => {
    const at = new Date();
    const mine: ActiveRun = { id: newRunId(at), at: at.toISOString(), model: state.model };
    setError(null);
    setOwn(mine);
    setNow(Date.now());
    try {
      onRecord(await post("/api/dev/run", { ...input, model: state.model, id: mine.id }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOwn(null);
      setRunning((list) => list.filter((r) => r.id !== mine.id));
    }
  };
  const savePasted = async () => {
    setError(null);
    try {
      onRecord(await post("/api/dev/history", { ...input, reply: pasted }));
      setPasted("");
      setPasting(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <Select<DevModel> aria-label="Model" size="sm" value={state.model} onChange={(model) => set({ model })} options={DEV_MODELS.map((m) => ({ value: m, label: m }))} />
        <Button onClick={run} disabled={!composed.text || !!own} className="!border-sky-500/70 !bg-sky-500/20 !text-sky-100 hover:!bg-sky-500/30">Run with Claude</Button>
        <Button size="sm" pressed={pasting} onClick={() => setPasting((v) => !v)}>Paste a reply instead</Button>
      </div>
      {shown.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-xs text-sky-300">
          <span className="tabular-nums">Running · {r.model} · {clock(now - Date.parse(r.at))}</span>
          <Button size="sm" onClick={() => cancelRunning(r.id)}>Cancel</Button>
        </div>
      ))}
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      {pasting && (
        <div className="flex flex-col gap-2">
          <PasteBox text={pasted} onText={setPasted} result={pastedResult} />
          <div><Button size="sm" onClick={savePasted} disabled={!pasted.trim()}>Keep in history</Button></div>
        </div>
      )}
    </div>
  );
}
