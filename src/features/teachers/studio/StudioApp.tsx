"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { PLUGINS } from "@/features/creator";
import { StageFrame, StageWidget, subjectTitle, type Layer } from "@/features/stage";
import { isStudioSupported } from "./browserSupport";
import useStage from "./useStage";

const PLUGIN_IDS = PLUGINS.map((p) => p.id);

/** The teacher studio: the 16:9 frame in the middle, its layers on the left, the keys that work on the right. */
export default function StudioApp() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [stage, dispatch] = useStage(PLUGIN_IDS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser check needs window, after hydration
    setSupported(isStudioSupported());
  }, []);

  if (supported === null) return null;
  if (!supported) return <p className="mx-auto mt-24 max-w-md text-center text-slate-300">The studio needs desktop Chrome or Edge.</p>;

  const renderLayer = (l: Layer) => (
    <StageWidget subject={l.subject} onSubjectChange={(subject) => dispatch({ type: "swap", id: l.id, subject })} stageKey={stage.key} onStageKey={(key) => dispatch({ type: "setStageKey", key })} />
  );

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_220px] gap-4 p-4">
      <aside data-chrome aria-label="Layers" className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">Layers</h2>
        {stage.layers.length === 0 && <p className="text-xs text-slate-500">Press / to add a widget.</p>}
        <ul className="flex flex-col gap-1">
          {[...stage.layers].reverse().map((l) => (
            <li key={l.id}>
              <div className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm ${stage.selected === l.id ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300"}`}>
                <button type="button" className={`min-w-0 flex-1 truncate text-left ${l.visible ? "" : "opacity-50"}`} onClick={() => dispatch({ type: "select", id: l.id })}>
                  {subjectTitle(l.subject)}
                </button>
                <button type="button" title={l.visible ? "Hide" : "Show"} onClick={() => dispatch({ type: "toggle", id: l.id })} className="p-0.5 text-slate-400 hover:text-slate-100">
                  <Icon name="eye" size={14} />
                </button>
                <button type="button" title="Bring forward" onClick={() => dispatch({ type: "raise", id: l.id })} className="p-0.5 text-slate-400 hover:text-slate-100">
                  <Icon name="chevron-down" size={14} className="rotate-180" />
                </button>
                <button type="button" title="Send backward" onClick={() => dispatch({ type: "lower", id: l.id })} className="p-0.5 text-slate-400 hover:text-slate-100">
                  <Icon name="chevron-down" size={14} />
                </button>
                <button type="button" title="Delete" onClick={() => dispatch({ type: "remove", id: l.id })} className="p-0.5 text-slate-400 hover:text-rose-300">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex min-w-0 flex-col gap-3">
        <h1 className="sr-only">Studio</h1>
        <StageFrame stage={stage} renderLayer={renderLayer} onAction={dispatch} />
      </main>

      <aside data-chrome aria-label="Keys" className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">Keys</h2>
      </aside>
    </div>
  );
}
