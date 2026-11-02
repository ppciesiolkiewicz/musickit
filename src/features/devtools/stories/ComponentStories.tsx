"use client";

import { useEffect, useMemo, useState } from "react";
import { Tool } from "@/features/plan/ui/ExerciseTool";
import { parseTool } from "@/features/plan/model/tools";
import Controls from "./Controls";
import { storyGroups, type Props } from "./stories";

type Tab = "controls" | "json" | "parsed";
const WIDTHS = { full: "", tablet: "48rem", phone: "390px" } as const;

/** `#scale-neck/3`: the group and story in the address, so a story can be linked and survives a reload. */
const readHash = (): { group: string; story: number } | null => {
  const m = /^#(.+?)(?:~(\d+))?$/.exec(decodeURIComponent(window.location.hash));
  return m ? { group: m[1], story: Number(m[2] ?? 0) } : null;
};

/** Every learning component in many set-ups, Storybook-style: pick a story, change its props with controls or JSON. */
export default function ComponentStories() {
  const groups = useMemo(() => storyGroups(), []);
  const [gi, setGi] = useState(0);
  const [si, setSi] = useState(0);
  const [props, setProps] = useState<Props>(groups[0].stories[0].props);
  const [text, setText] = useState(JSON.stringify(groups[0].stories[0].props, null, 2));
  const [tab, setTab] = useState<Tab>("controls");
  const [width, setWidth] = useState<keyof typeof WIDTHS>("full");
  const [filter, setFilter] = useState("");

  const group = groups[gi];
  const story = group.stories[si] ?? group.stories[0];

  const show = (g: number, s: number, push = true) => {
    const p = groups[g].stories[s]?.props ?? {};
    setGi(g);
    setSi(s);
    setProps(p);
    setText(JSON.stringify(p, null, 2));
    if (push) history.replaceState(null, "", `#${groups[g].id}~${s}`);
  };
  const edit = (p: Props) => { setProps(p); setText(JSON.stringify(p, null, 2)); };

  useEffect(() => {
    const follow = () => {
      const h = readHash();
      const g = h ? groups.findIndex((x) => x.id === h.group) : -1;
      if (g >= 0) show(g, Math.min(h!.story, groups[g].stories.length - 1), false);
    };
    // the hash is only readable after mount, and a pasted link may change it later
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tool = parseTool({ type: group.tool, ...props });
  const dirty = JSON.stringify(props) !== JSON.stringify(story.props);
  const q = filter.trim().toLowerCase();
  const kinds = [...new Set(groups.map((g) => g.doc?.kind ?? "stub"))];

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
      <nav className="flex flex-col gap-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1" aria-label="Components">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter components or stories" className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200" />
        {kinds.map((kind) => (
          <div key={kind} className="flex flex-col gap-0.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{kind}</p>
            {groups.map((g, n) => {
              if ((g.doc?.kind ?? "stub") !== kind) return null;
              const hits = q ? g.stories.map((s, k) => [s, k] as const).filter(([s]) => g.id.includes(q) || s.name.toLowerCase().includes(q)) : null;
              if (hits && !hits.length) return null;
              const open = n === gi || (q && hits);
              return (
                <div key={g.id}>
                  <button type="button" onClick={() => show(n, 0)} className={`flex w-full items-baseline justify-between rounded px-2 py-1 text-left font-mono text-xs ${n === gi ? "bg-emerald-500/15 text-emerald-100" : "text-slate-300 hover:text-slate-100"}`}>
                    <span>{g.shape ? <>play-along · <b>{g.shape}</b></> : g.id}</span>
                    <span className="text-[10px] text-slate-500">{g.stories.length}</span>
                  </button>
                  {open && (
                    <ul className="mb-1 ml-2 border-l border-slate-800 pl-2">
                      {(hits ?? g.stories.map((s, k) => [s, k] as const)).map(([s, k]) => (
                        <li key={k}>
                          <button type="button" onClick={() => show(n, k)} className={`w-full rounded px-1.5 py-0.5 text-left text-xs ${n === gi && k === si ? "text-emerald-200" : "text-slate-500 hover:text-slate-200"}`}>
                            {s.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex min-w-0 flex-col gap-3">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-mono text-lg text-slate-100">{group.shape ? `guitar-play-along · ${group.shape}` : group.tool}</h2>
          <span className="text-sm text-slate-400">{story.name}</span>
          <span className="text-[11px] text-slate-600">{story.from === "hand" ? "hand-written" : `from ${story.from}`}</span>
          <div className="ml-auto flex items-center gap-1 text-xs">
            {(Object.keys(WIDTHS) as (keyof typeof WIDTHS)[]).map((w) => (
              <button key={w} type="button" onClick={() => setWidth(w)} className={`rounded px-2 py-0.5 ${w === width ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}>{w}</button>
            ))}
            <button type="button" onClick={() => show(gi, si)} disabled={!dirty} className="ml-2 rounded border border-slate-700 px-2 py-0.5 text-slate-300 enabled:hover:border-slate-400 disabled:opacity-40">Reset</button>
          </div>
        </header>
        {(group.shapeDoc ?? group.doc)?.description && <p className="max-w-3xl text-xs whitespace-pre-line text-slate-500">{(group.shapeDoc ?? group.doc)!.description.split("\n\nExample:")[0]}</p>}

        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <div style={{ maxWidth: WIDTHS[width] || undefined }} className={width === "full" ? "" : "mx-auto rounded-lg outline-1 outline-dashed outline-slate-700"}>
            {tool ? <Tool key={JSON.stringify(tool)} tool={tool} /> : <p className="text-sm text-rose-300">The tool doesn&apos;t parse: a required prop missing, or a value the parser rejects.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40">
          <div className="flex gap-1 border-b border-slate-800 px-2 pt-1 text-xs" role="tablist">
            {(["controls", "json", "parsed"] as Tab[]).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={t === tab} onClick={() => setTab(t)} className={`rounded-t px-3 py-1.5 capitalize ${t === tab ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}>{t}</button>
            ))}
            {dirty && <span className="ml-auto self-center text-[11px] text-amber-300">edited</span>}
          </div>
          <div className="p-3">
            {tab === "controls" && (
              <div className="flex flex-col gap-4">
                <Controls docs={(group.doc?.props ?? []).filter((d) => !(group.shape && d.name === "shape"))} value={group.shape ? omit(props, "shape") : props} onChange={(p) => edit(group.shape ? { ...p, shape: props.shape } : p)} />
                {group.shapeDoc && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">shape: {group.shape}</p>
                    <Controls docs={group.shapeDoc.props} value={(props.shape as Props) ?? {}} onChange={(s) => edit({ ...props, shape: s })} />
                  </div>
                )}
              </div>
            )}
            {tab === "json" && (
              <JsonTab text={text} setText={setText} setProps={setProps} />
            )}
            {tab === "parsed" && <pre className="overflow-x-auto text-[11px] text-slate-400">{tool ? JSON.stringify(tool, null, 2) : "null"}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}

const omit = (p: Props, k: string): Props => {
  const { [k]: _drop, ...rest } = p;
  void _drop;
  return rest;
};

/** The props as the AI writes them, applied whenever the text parses. */
function JsonTab({ text, setText, setProps }: { text: string; setText: (t: string) => void; setProps: (p: Props) => void }) {
  let ok = true;
  try { JSON.parse(text); } catch { ok = false; }
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      <span>Props, as the AI writes them {!ok && <span className="text-rose-300">· not valid JSON</span>}</span>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const v = JSON.parse(e.target.value);
            if (v && typeof v === "object" && !Array.isArray(v)) setProps(v);
          } catch { /* applied once it parses */ }
        }}
        spellCheck={false}
        rows={14}
        className="rounded-lg border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-200"
      />
    </label>
  );
}
