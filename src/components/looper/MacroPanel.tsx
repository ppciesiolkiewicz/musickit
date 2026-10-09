"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import type { LooperEngine } from "@/lib/looper/engine";
import { buildPrompt, parseScript } from "@/lib/looper/script";
import { loadMacros, parseMacros, playMacro, saveMacros, serialiseMacros, type Macro } from "@/lib/looper/macros";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const field = "rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} s`;

/** Record what you do as a macro, then replay it with one click. A run is one step in the history, so one undo takes it back. */
export default function MacroPanel({ engine }: { engine: LooperEngine }) {
  const rec = engine.macroRecorder;
  const state = useSyncExternalStore(rec.subscribe, () => rec.stepCount * 2 + (rec.recording ? 1 : 0), () => 0);
  const recording = state % 2 === 1;
  const steps = Math.floor(state / 2);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [name, setName] = useState("");
  const [playing, setPlaying] = useState<Record<string, () => void>>({});
  const [instant, setInstant] = useState(false);
  const [io, setIo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    setMacros(loadMacros());
    loaded.current = true;
  }, []);
  const update = (next: Macro[]) => {
    setMacros(next);
    saveMacros(next);
  };

  const stop = () => {
    const m = rec.stop(name || `Macro ${macros.length + 1}`);
    setName("");
    if (m) update([...macros, m]);
  };
  const play = (m: Macro) => {
    const cancel = playMacro(engine.history, m, {
      speed: instant ? 0 : 1,
      onEnd: () => setPlaying((p) => { const n = { ...p }; delete n[m.id]; return n; }),
    });
    setPlaying((p) => ({ ...p, [m.id]: cancel }));
  };
  const importJson = (text: string) => {
    let found = parseMacros(text);
    let dropped: string[] = [];
    if (!found.length) {
      // not a saved macro: maybe a plain list of actions, such as an AI's reply
      const r = parseScript(text, `AI script ${macros.length + 1}`);
      found = r.macro ? [r.macro] : [];
      dropped = r.errors;
    }
    if (!found.length) {
      setError(dropped[0] ?? "No macros or actions found in that text.");
      return;
    }
    setError(dropped.length ? `Imported. Left out: ${dropped.slice(0, 3).join("; ")}${dropped.length > 3 ? ` and ${dropped.length - 3} more` : ""}` : null);
    const ids = new Set(macros.map((m) => m.id));
    update([...macros, ...found.map((m) => (ids.has(m.id) ? { ...m, id: `${m.id}-${Date.now().toString(36)}` } : m))]);
    if (!dropped.length) setIo(null);
  };
  const copyPrompt = () => void navigator.clipboard?.writeText(buildPrompt(engine.getSnapshot())).catch(() => undefined);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-auto p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {recording ? (
          <>
            <span className="flex items-center gap-1.5 text-xs text-rose-300"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden />Recording · {steps} change{steps === 1 ? "" : "s"}</span>
            <input className={`${field} min-w-0 flex-1`} placeholder={`Macro ${macros.length + 1}`} value={name} onChange={(e) => setName(e.target.value)} aria-label="Macro name" />
            <button type="button" className={`${ibtn} !border-rose-500 !bg-rose-500/15 !text-rose-100`} onClick={stop} title="Stop and save" aria-label="Stop recording and save"><Icon name="square" fill /></button>
          </>
        ) : (
          <>
            <button type="button" className={`${ibtn} gap-1.5 !px-2.5`} onClick={() => rec.start()} title="Record the changes you make" aria-label="Start recording a macro"><Icon name="circle-dot" className="text-rose-400" /><span>Record</span></button>
            <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-400" title="Play all steps at once instead of at the recorded pace"><input type="checkbox" className="accent-sky-400" checked={instant} onChange={(e) => setInstant(e.target.checked)} />Instant</label>
          </>
        )}
      </div>

      {macros.length === 0 && !recording && <p className="rounded-lg border border-dashed border-slate-700 p-2 text-xs text-slate-400">No macros yet. Press Record, change volumes, mute loops, move groups or start sequencers, then stop and save. Replay it with one click.</p>}

      <ul className="flex flex-col gap-1" aria-label="Macros">
        {macros.map((m) => (
          <li key={m.id} className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-1.5">
            <button type="button" className={`${ibtn} ${playing[m.id] ? "!border-emerald-500 !bg-emerald-500/15 !text-emerald-100" : ""}`} onClick={() => (playing[m.id] ? playing[m.id]() : play(m))} title={playing[m.id] ? "Stop this run" : "Play"} aria-label={playing[m.id] ? `Stop ${m.name}` : `Play ${m.name}`}><Icon name={playing[m.id] ? "square" : "play"} fill /></button>
            <input value={m.name} onChange={(e) => update(macros.map((x) => (x.id === m.id ? { ...x, name: e.target.value.slice(0, 40) } : x)))} aria-label="Macro name" className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-slate-100 hover:border-slate-700 focus:border-slate-500 focus:outline-none" />
            <span className="shrink-0 text-xs tabular-nums text-slate-500">{m.steps.length} · {secs(m.duration)}</span>
            <button type="button" className={ibtn} onClick={() => setIo(serialiseMacros([m]))} title="Show as JSON to copy" aria-label={`Export ${m.name}`}><Icon name="copy" /></button>
            <button type="button" className={ibtn} onClick={() => update(macros.filter((x) => x.id !== m.id))} title="Delete" aria-label={`Delete ${m.name}`}><Icon name="trash" /></button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={`${ibtn} !px-2.5`} onClick={() => setIo(io === null ? "" : null)} aria-expanded={io !== null}>{io === null ? "Import / export" : "Hide"}</button>
        {macros.length > 0 && io === null && <button type="button" className={`${ibtn} !px-2.5`} onClick={() => setIo(serialiseMacros(macros))}>Export all</button>}
      </div>
      {io !== null && (
        <div className="flex flex-col gap-1.5">
          <textarea className={`${field} h-32 font-mono`} value={io} onChange={(e) => setIo(e.target.value)} placeholder="Paste macro JSON or an AI's list of actions, then Import" aria-label="Macro JSON" spellCheck={false} />
          <div className="flex gap-1.5">
            <button type="button" className={`${ibtn} !px-2.5`} onClick={() => importJson(io)} disabled={!io.trim()} title="Macro JSON, or a list of actions from an AI">Import</button>
            <button type="button" className={`${ibtn} gap-1 !px-2.5`} onClick={copyPrompt} title="Copy a prompt that tells an AI every action, effect and sound, and your current mix"><Icon name="zap" size={14} />AI prompt</button>
            <button type="button" className={`${ibtn} !px-2.5`} onClick={() => void navigator.clipboard?.writeText(io).catch(() => undefined)} disabled={!io.trim()}>Copy</button>
          </div>
          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
