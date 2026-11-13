"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Tool } from "@/features/plan/ui/ExerciseTool";
import { parseTool } from "@/features/plan/model/tools";
import Controls from "./Controls";
import { matchesQuery, storyGroups, type Props, type StoryGroup } from "./stories";
import { UI_GROUPS, type UiGroup } from "./uiStories";

type Tab = "controls" | "json" | "parsed";
type Group = StoryGroup | UiGroup;
const WIDTHS = { full: "", tablet: "48rem", phone: "390px" } as const;

/** `#scale-neck/3`: the group and story in the address, so a story can be linked and survives a reload. */
const readHash = (): { group: string; story: number } | null => {
  const m = /^#(.+?)(?:~(\d+))?$/.exec(decodeURIComponent(window.location.hash));
  return m ? { group: m[1], story: Number(m[2] ?? 0) } : null;
};

/** What the sidebar keeps open between visits: groups and closed sections. A per-browser convenience only. */
const NAV_KEY = "musickit.dev.storiesNav";
const readNav = (): { expanded: string[]; closed: string[] } | null => {
  try {
    const v = JSON.parse(localStorage.getItem(NAV_KEY) ?? "null") as { expanded?: unknown; closed?: unknown } | null;
    const list = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : []);
    return v ? { expanded: list(v.expanded), closed: list(v.closed) } : null;
  } catch {
    return null;
  }
};

const Chevron = ({ open }: { open: boolean }) => <Icon name="chevron-right" size={12} className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />;

/** A heading over a part of the sidebar (the AI's tools, then the other components) that folds it away. */
const SectionTitle = ({ children, count, open, onToggle }: { children: string; count: number; open: boolean; onToggle: () => void }) => (
  <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-1.5 border-b border-slate-700 pb-1 text-left text-xs font-semibold text-slate-200 hover:text-white">
    <Chevron open={open} />
    <span className="flex-1">{children}</span>
    <span className="text-[10px] font-normal text-slate-500">{count}</span>
  </button>
);

/** A kind's heading inside the AI tools (basics, guided, …) that folds its tools away. */
const KindTitle = ({ children, count, open, onToggle }: { children: string; count: number; open: boolean; onToggle: () => void }) => (
  <button type="button" onClick={onToggle} aria-expanded={open} className="mb-1 flex w-full items-center gap-1 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-300">
    <Chevron open={open} />
    <span className="flex-1">{children}</span>
    <span className="font-normal normal-case tracking-normal">{count}</span>
  </button>
);

/** Every learning component in many set-ups, Storybook-style: pick a story, change its props with controls or JSON. */
export default function ComponentStories() {
  const groups = useMemo<Group[]>(() => [...storyGroups(), ...UI_GROUPS], []);
  const [gi, setGi] = useState(0);
  const [si, setSi] = useState(0);
  const [props, setProps] = useState<Props>(groups[0].stories[0].props);
  const [text, setText] = useState(JSON.stringify(groups[0].stories[0].props, null, 2));
  const [tab, setTab] = useState<Tab>("controls");
  const [width, setWidth] = useState<keyof typeof WIDTHS>("full");
  const [filter, setFilter] = useState("");
  // which groups show their stories: apart from the active one, so opening or closing a group never loads a story
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([groups[0].id]));
  const toggle = (id: string) => setExpanded((e) => { const n = new Set(e); if (!n.delete(id)) n.add(id); return n; });
  // closed sections of the sidebar: "ai", "components", "kind:<kind>"
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const toggleSection = (key: string) => setClosed((c) => { const n = new Set(c); if (!n.delete(key)) n.add(key); return n; });
  const [navLoaded, setNavLoaded] = useState(false);
  useEffect(() => {
    // read after mount (the server has no storage); the active story's group stays open
    const saved = readNav();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the browser's saved sidebar once
      setExpanded((e) => new Set([...e, ...saved.expanded]));
      setClosed(new Set(saved.closed));
    }
    setNavLoaded(true);
  }, []);
  useEffect(() => {
    if (!navLoaded) return;
    try {
      localStorage.setItem(NAV_KEY, JSON.stringify({ expanded: [...expanded], closed: [...closed] }));
    } catch { /* storage off: the sidebar just starts afresh */ }
  }, [expanded, closed, navLoaded]);

  const group = groups[gi];
  const story = group.stories[si] ?? group.stories[0];

  const show = (g: number, s: number, push = true) => {
    const p = groups[g].stories[s]?.props ?? {};
    setGi(g);
    setSi(s);
    setExpanded((e) => e.has(groups[g].id) ? e : new Set(e).add(groups[g].id));
    // the section holding the shown story opens too
    const gr = groups[g];
    const keys = "render" in gr ? ["components"] : ["ai", `kind:${gr.doc?.kind ?? "stub"}`];
    setClosed((c) => (keys.some((k) => c.has(k)) ? new Set([...c].filter((k) => !keys.includes(k))) : c));
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

  const ui = "render" in group ? group : null;
  const tool = "render" in group ? null : parseTool({ type: group.tool, ...props });
  // a component has no parsed form: the tab falls back when moving to one from a tool
  const shownTab = ui && tab === "parsed" ? "controls" : tab;
  const dirty = JSON.stringify(props) !== JSON.stringify(story.props);
  const q = filter.trim().toLowerCase();
  const kinds = [...new Set(groups.flatMap((g) => ("render" in g ? [] : [g.doc?.kind ?? "stub"])))];

  // a group is found by its id, title and keywords, a story by those and its own name, every word of the filter somewhere
  const groupText = (g: Group) => [g.id, "render" in g ? g.title : "", ...g.keywords].join(" ");
  const storyHits = (g: Group) => {
    const all = g.stories.map((s, k) => [s, k] as const);
    if (!q || matchesQuery(groupText(g), q)) return all;
    return all.filter(([s]) => matchesQuery(`${groupText(g)} ${s.name}`, q));
  };
  const matches = (g: Group) => storyHits(g).length > 0;
  const toolsOf = (kind: string) => groups.filter((g) => !("render" in g) && (g.doc?.kind ?? "stub") === kind && matches(g));
  const uiShown = groups.filter((g) => "render" in g && matches(g));
  const aiCount = kinds.reduce((n, k) => n + toolsOf(k).length, 0);
  // a filter opens every section with a hit
  const isOpen = (key: string) => !!q || !closed.has(key);
  const expandAll = () => {
    setExpanded(new Set(groups.map((g) => g.id)));
    setClosed(new Set());
  };
  const collapseAll = () => {
    setExpanded(new Set());
    setClosed(new Set(["ai", "components", ...kinds.map((k) => `kind:${k}`)]));
  };

  const row = (g: Group, n: number) => {
    const hits = q ? storyHits(g) : null;
    if (hits && !hits.length) return null;
    const open = expanded.has(g.id) || (q && hits);
    return (
      <div key={g.id}>
        <button type="button" onClick={() => toggle(g.id)} aria-expanded={!!open} className={`flex w-full items-baseline justify-between rounded px-2 py-1 text-left font-mono text-xs ${n === gi ? "bg-emerald-500/15 text-emerald-100" : "text-slate-300 hover:text-slate-100"}`}>
          <span className="flex min-w-0 items-center gap-1"><Chevron open={!!open} /><span className="truncate">{g.shape ? <>play-along · <b>{g.shape}</b></> : g.id}</span></span>
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
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
      <nav className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto pr-3 [scrollbar-gutter:stable]" aria-label="Components">
        <div className="flex flex-col gap-1.5">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter components or stories" className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200" />
          <div className="flex gap-1 text-[11px]">
            <button type="button" onClick={expandAll} className="rounded border border-slate-700 px-2 py-0.5 text-slate-400 hover:border-slate-500 hover:text-slate-200">Expand all</button>
            <button type="button" onClick={collapseAll} className="rounded border border-slate-700 px-2 py-0.5 text-slate-400 hover:border-slate-500 hover:text-slate-200">Collapse all</button>
          </div>
        </div>
        {aiCount > 0 && <SectionTitle count={aiCount} open={isOpen("ai")} onToggle={() => toggleSection("ai")}>AI Autoplan Tools</SectionTitle>}
        {aiCount > 0 && isOpen("ai") && kinds.map((kind) => {
          const shown = toolsOf(kind);
          if (!shown.length) return null;
          const key = `kind:${kind}`;
          return (
            <div key={kind} className="flex flex-col gap-0.5">
              <KindTitle count={shown.length} open={isOpen(key)} onToggle={() => toggleSection(key)}>{kind}</KindTitle>
              {isOpen(key) && groups.map((g, n) => ("render" in g || (g.doc?.kind ?? "stub") !== kind ? null : row(g, n)))}
            </div>
          );
        })}
        {uiShown.length > 0 && <SectionTitle count={uiShown.length} open={isOpen("components")} onToggle={() => toggleSection("components")}>Components</SectionTitle>}
        {uiShown.length > 0 && isOpen("components") && (
          <div className="flex flex-col gap-0.5">
            {groups.map((g, n) => ("render" in g ? row(g, n) : null))}
          </div>
        )}
        {q && !aiCount && !uiShown.length && <p className="px-2 text-xs text-slate-500">Nothing matches.</p>}
      </nav>

      <div className="flex min-w-0 flex-col gap-3">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-mono text-lg text-slate-100">{"render" in group ? group.title : group.shape ?`guitar-play-along · ${group.shape}` : group.tool}</h2>
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
            {ui ? <div key={`${ui.id}:${JSON.stringify(props)}`}>{ui.render(props)}</div> : tool ? <Tool key={JSON.stringify(tool)} tool={tool} /> : <p className="text-sm text-rose-300">The tool doesn&apos;t parse: a required prop missing, or a value the parser rejects.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40">
          <div className="flex gap-1 border-b border-slate-800 px-2 pt-1 text-xs" role="tablist">
            {(ui ? ["controls", "json"] : ["controls", "json", "parsed"] as Tab[]).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={t === shownTab} onClick={() => setTab(t as Tab)} className={`rounded-t px-3 py-1.5 capitalize ${t === shownTab ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}>{t}</button>
            ))}
            {dirty && <span className="ml-auto self-center text-[11px] text-amber-300">edited</span>}
          </div>
          <div className="p-3">
            {shownTab === "controls" && (
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
            {shownTab === "json" && (
              <JsonTab text={text} setText={setText} setProps={setProps} />
            )}
            {shownTab === "parsed" && <pre className="overflow-x-auto text-[11px] text-slate-400">{tool ? JSON.stringify(tool, null, 2) : "null"}</pre>}
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
