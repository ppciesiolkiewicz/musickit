"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { WidgetBoard } from "@/features/widgets";
import { CreatorKeyProvider } from "./KeyProvider";
import KeyBar from "./KeyBar";
import { DEFAULT_OPEN, PLUGINS, sanitiseOpen } from "./plugins/registry";

const OPEN_KEY = "musickit.creator.plugins";

/** The creator: pick a key (or none), switch theory plugins on and off, and arrange them on the board. */
export default function CreatorApp() {
  return (
    <CreatorKeyProvider>
      <Creator />
    </CreatorKeyProvider>
  );
}

function Creator() {
  const [open, setOpen] = useState<string[]>(DEFAULT_OPEN);
  const [loaded, setLoaded] = useState(false);
  const [reset, setReset] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OPEN_KEY);
      if (raw) setOpen(sanitiseOpen(JSON.parse(raw)));
    } catch {
      /* use the defaults */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(open));
    } catch {
      /* ignore */
    }
  }, [open, loaded]);

  const toggle = (id: string) => setOpen((o) => sanitiseOpen(o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const widgets = PLUGINS.filter((p) => open.includes(p.id)).map((p) => ({
    id: p.id,
    title: p.title,
    node: <p.Component />,
    onClose: () => toggle(p.id),
  }));

  return (
    <div className="flex flex-col gap-3">
      <KeyBar />
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Plugins">
        <Icon name="puzzle" className="text-slate-500" />
        {PLUGINS.map((p) => {
          const on = open.includes(p.id);
          return (
            <button key={p.id} type="button" aria-pressed={on} onClick={() => toggle(p.id)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}>
              <Icon name={p.icon} size={14} />{p.title}
            </button>
          );
        })}
        <button type="button" className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500" onClick={() => setReset((n) => n + 1)} title="Arrange the plugins neatly" aria-label="Arrange the plugins neatly"><Icon name="rotate-ccw" /></button>
      </div>
      {widgets.length ? (
        <WidgetBoard widgets={widgets} storageKey="musickit.creator.board" height={760} resizableHeight resetSignal={reset} />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">No plugins open. Switch some on above.</p>
      )}
    </div>
  );
}
