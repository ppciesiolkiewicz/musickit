"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import usePhone from "@/components/usePhone";
import { WidgetBoard } from "@/features/widgets";
import { CreatorKeyProvider } from "./KeyProvider";
import KeyBar from "./KeyBar";
import { DEFAULT_OPEN, PLUGINS, sanitiseOpen, sanitiseViews, type View } from "./plugins/registry";

const OPEN_KEY = "musickit.creator.plugins";
const VIEWS_KEY = "musickit.creator.views";
/** room a panel asks for when switched to its full view (the whole theory page) */
const FULL_SIZE = { w: 960, h: 680 };

/** The cheatsheet builder: pick a key (or none), switch theory panels on and off, show each compact or in full, and arrange them on the board. */
export default function CreatorApp() {
  return (
    <CreatorKeyProvider>
      <Creator />
    </CreatorKeyProvider>
  );
}

function Creator() {
  const [open, setOpen] = useState<string[]>(DEFAULT_OPEN);
  const [views, setViews] = useState<Record<string, View>>({});
  const [loaded, setLoaded] = useState(false);
  const [reset, setReset] = useState(0);
  const phone = usePhone();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OPEN_KEY);
      if (raw) setOpen(sanitiseOpen(JSON.parse(raw)));
      setViews(sanitiseViews(JSON.parse(window.localStorage.getItem(VIEWS_KEY) ?? "null")));
    } catch {
      /* use the defaults */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(open));
      window.localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
    } catch {
      /* ignore */
    }
  }, [open, views, loaded]);

  const toggle = (id: string) => setOpen((o) => sanitiseOpen(o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const flip = (id: string) => setViews((v) => ({ ...v, [id]: v[id] === "full" ? "compact" : "full" }));
  const widgets = PLUGINS.filter((p) => open.includes(p.id)).map((p) => {
    const full = !!p.Full && views[p.id] === "full";
    const Panel = full && p.Full ? p.Full : p.Component;
    return {
      id: p.id,
      title: p.title,
      node: <Panel />,
      onClose: () => toggle(p.id),
      minSize: full ? FULL_SIZE : undefined,
      actions: p.Full && (
        <button type="button" aria-pressed={full} onClick={() => flip(p.id)} title={full ? "Show the compact view" : "Show the full page"} className={`rounded border px-1.5 py-px text-[10px] uppercase tracking-wider transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${full ? "border-sky-500/60 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-100"}`}>
          {full ? "Compact" : "Full"}
        </button>
      ),
    };
  });

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
      {widgets.length && phone ? (
        // a phone has no room to arrange panels: they stack, each as wide as the screen and as tall as its content
        <div className="flex flex-col gap-3">
          {widgets.map((w) => (
            <section key={w.id} aria-label={w.title} className="min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <header className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200">
                <span className="font-medium">{w.title}</span>
                {w.actions}
                <button type="button" onClick={w.onClose} aria-label={`Close ${w.title}`} className="ml-auto rounded-md border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-slate-500">✕</button>
              </header>
              <div className="min-w-0 p-2">{w.node}</div>
            </section>
          ))}
        </div>
      ) : widgets.length ? (
        <WidgetBoard widgets={widgets} storageKey="musickit.creator.board" resetSignal={reset} />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">No plugins open. Switch some on above.</p>
      )}
    </div>
  );
}
