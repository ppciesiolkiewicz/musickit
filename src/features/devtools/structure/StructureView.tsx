"use client";

import { useMemo, useState } from "react";
import { LAYERS, renderTree, routes, usersOf, type FileNode, type PackageNode, type Structure, type TreeNode } from "../model/structure";

type Tab = "packages" | "tree" | "file";

const BTN = "inline-flex min-h-8 cursor-pointer items-center rounded-lg border px-3 py-1 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const H = "mb-2 text-xs font-medium uppercase tracking-wider text-slate-400";
const short = (p: string) => p.replace(/^src\//, "");

const LAYER_NOTE: Record<string, string> = {
  app: "Routes. Thin pages that mount a feature.",
  features: "One folder per product area: its model, UI and server code.",
  components: "Shared UI. ui/ is the design system (atoms, molecules, organisms).",
  lib: "Pure logic with no UI: music maths, the looper engine, the database.",
};

/** A file path that opens the file tab. */
function FileLink({ path, open, note }: { path: string; open: (p: string) => void; note?: string }) {
  return (
    <button type="button" onClick={() => open(path)} className="block w-full cursor-pointer truncate text-left font-mono text-xs text-sky-300 hover:text-sky-100 hover:underline">
      {short(path)}{note && <span className="ml-2 text-slate-500">{note}</span>}
    </button>
  );
}

function Chip({ p, state, onClick }: { p: PackageNode; state: "sel" | "dep" | "user" | "both" | "dim" | "plain"; onClick: () => void }) {
  const tone = {
    sel: "border-violet-400 bg-violet-500/25 text-violet-100",
    dep: "border-sky-400/70 bg-sky-500/15 text-sky-100",
    user: "border-amber-400/70 bg-amber-500/15 text-amber-100",
    both: "border-rose-400/70 bg-rose-500/15 text-rose-100",
    dim: "border-slate-800 text-slate-600",
    plain: "border-slate-700 text-slate-300 hover:border-slate-400",
  }[state];
  return (
    <button type="button" onClick={onClick} className={`${BTN} ${tone} w-full justify-between gap-2`} title={`${p.files} files, ${p.lines} lines`}>
      <span className="truncate">{p.id.replace(/^(features|components|lib)\//, "")}</span>
      <span className="text-[10px] opacity-60">{p.files}</span>
    </button>
  );
}

function PackagesTab({ s, open }: { s: Structure; open: (p: string) => void }) {
  const [sel, setSel] = useState<string>("features/plan");
  const pkg = s.packages.find((p) => p.id === sel);
  const stateOf = (p: PackageNode) => {
    if (!pkg) return "plain" as const;
    if (p.id === sel) return "sel" as const;
    const dep = p.id in pkg.dependsOn, user = p.id in pkg.usedBy;
    return dep && user ? "both" as const : dep ? "dep" as const : user ? "user" as const : "dim" as const;
  };
  const upward = s.upward.filter((u) => pkg && (s.files.find((f) => f.path === u.from)?.pkg === sel));
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Four layers, top to bottom. Imports should point down or across. Pick a package: <span className="text-sky-300">blue</span> it imports,{" "}
        <span className="text-amber-300">amber</span> imports it, <span className="text-rose-300">rose</span> both ways.
      </p>
      <div className="grid gap-3 lg:grid-cols-4">
        {LAYERS.map((layer) => (
          <section key={layer} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <h3 className="font-semibold text-slate-100">{layer}</h3>
            <p className="mb-3 text-xs text-slate-500">{LAYER_NOTE[layer]}</p>
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1 xl:grid-cols-2">
              {s.packages.filter((p) => p.layer === layer).map((p) => <Chip key={p.id} p={p} state={stateOf(p)} onClick={() => setSel(p.id)} />)}
            </div>
          </section>
        ))}
      </div>
      {pkg && (
        <section className="rounded-xl border border-violet-500/30 bg-slate-900/60 p-4">
          <h3 className="text-lg font-semibold text-violet-100">{pkg.id}</h3>
          <p className="text-sm text-slate-400">{pkg.files} files · {pkg.lines} lines · {pkg.components} components · layer {pkg.layer}</p>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <div>
              <h4 className={H}>Folders and files</h4>
              {Object.keys(pkg.folders).sort().map((folder) => (
                <details key={folder} className="mb-1" open={Object.keys(pkg.folders).length < 4}>
                  <summary className="cursor-pointer text-sm text-slate-200">{folder || "(top)"}/ <span className="text-slate-500">{pkg.folders[folder]}</span></summary>
                  <div className="ml-3 mt-1 space-y-0.5">
                    {s.files.filter((f) => f.pkg === pkg.id && f.folder === folder).map((f) => (
                      <FileLink key={f.path} path={f.path} open={open} note={`${f.kind}${f.client ? " · client" : ""}`} />
                    ))}
                  </div>
                </details>
              ))}
            </div>
            <PkgList title="Imports from" counts={pkg.dependsOn} pick={setSel} />
            <PkgList title="Imported by" counts={pkg.usedBy} pick={setSel} />
          </div>
          {upward.length > 0 && (
            <div className="mt-4">
              <h4 className={`${H} text-rose-300`}>Imports up a layer ({upward.length})</h4>
              {upward.map((u) => <FileLink key={u.from + u.to} path={u.from} open={open} note={`→ ${short(u.to)}`} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function PkgList({ title, counts, pick }: { title: string; counts: Record<string, number>; pick: (id: string) => void }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <h4 className={H}>{title}</h4>
      {rows.length === 0 && <p className="text-sm text-slate-500">None</p>}
      {rows.map(([id, n]) => (
        <button key={id} type="button" onClick={() => pick(id)} className="flex w-full cursor-pointer justify-between text-left text-sm text-slate-300 hover:text-white">
          <span>{id}</span><span className="text-slate-500">{n}</span>
        </button>
      ))}
    </div>
  );
}

function TreeRow({ n, byPath, open, depth }: { n: TreeNode; byPath: Map<string, FileNode>; open: (p: string) => void; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const f = byPath.get(n.file);
  const tone = f?.layer === "features" ? "text-violet-300" : f?.layer === "components" ? "text-emerald-300" : f?.layer === "lib" ? "text-sky-300" : "text-slate-200";
  return (
    <li>
      <div className="flex items-baseline gap-1.5">
        <button type="button" disabled={!n.children.length} onClick={() => setExpanded(!expanded)} className="w-4 shrink-0 cursor-pointer text-slate-500 disabled:cursor-default" aria-label={expanded ? "Collapse" : "Expand"}>
          {n.children.length ? (expanded ? "▾" : "▸") : "·"}
        </button>
        {n.tags.length > 0 && <span className="font-mono text-xs text-slate-100">&lt;{n.tags.join("> <")}&gt;</span>}
        <button type="button" onClick={() => open(n.file)} className={`cursor-pointer truncate font-mono text-xs hover:underline ${tone}`}>{short(n.file)}</button>
        {f?.client && <span className="text-[10px] text-amber-400/80">client</span>}
        {n.cut === "cycle" && <span className="text-[10px] text-slate-500">↺ above</span>}
      </div>
      {expanded && n.children.length > 0 && (
        <ul className="ml-2 border-l border-slate-800 pl-3">
          {n.children.map((c) => <TreeRow key={c.file} n={c} byPath={byPath} open={open} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}

function TreeTab({ s, root, setRoot, open }: { s: Structure; root: string; setRoot: (p: string) => void; open: (p: string) => void }) {
  const all = useMemo(() => routes(s), [s]);
  const tree = useMemo(() => renderTree(s, root, 30), [s, root]);
  const byPath = useMemo(() => new Map(s.files.map((f) => [f.path, f])), [s]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        What a page renders, file by file. Colour shows the layer: <span className="text-violet-300">feature</span>,{" "}
        <span className="text-emerald-300">shared component</span>, <span className="text-sky-300">lib</span>. Click a file to see everything about it.
      </p>
      <label className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
        Page
        <select value={root} onChange={(e) => setRoot(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm">
          {!all.some((r) => r.file === root) && <option value={root}>{short(root)}</option>}
          {all.map((r) => <option key={r.file} value={r.file}>{r.url}</option>)}
        </select>
      </label>
      <ul className="rounded-xl border border-slate-800 bg-slate-900/50 p-3"><TreeRow key={root} n={tree} byPath={byPath} open={open} depth={0} /></ul>
    </div>
  );
}

function FileTab({ s, path, open, showTree }: { s: Structure; path: string; open: (p: string) => void; showTree: (p: string) => void }) {
  const [q, setQ] = useState("");
  const f = s.files.find((x) => x.path === path);
  const u = useMemo(() => usersOf(s, path), [s, path]);
  const hits = q.length > 1 ? s.files.filter((x) => x.path.toLowerCase().includes(q.toLowerCase()) || x.components.some((c) => c.toLowerCase().includes(q.toLowerCase()))).slice(0, 12) : [];
  const renders = f?.renders.filter((r) => r.file !== f.path) ?? [];
  return (
    <div className="space-y-4">
      <div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a file or component" className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100" />
        {hits.length > 0 && <div className="mt-1 max-w-md rounded-lg border border-slate-800 bg-slate-900 p-2">{hits.map((h) => <FileLink key={h.path} path={h.path} open={(p) => { setQ(""); open(p); }} note={h.components.join(", ")} />)}</div>}
      </div>
      {f && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="font-mono text-sm text-slate-100">{short(f.path)}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {f.pkg} · {f.kind}{f.client ? " · client" : " · server or shared"} · {f.lines} lines
            {f.components.length > 0 && <> · defines {f.components.join(", ")}</>}
          </p>
          {renders.length > 0 && <button type="button" onClick={() => showTree(f.path)} className={`${BTN} mt-3 border-slate-700 text-slate-300 hover:bg-slate-800`}>Show its render tree</button>}
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <Group title="Renders">{renders.map((r) => <FileLink key={r.tag} path={r.file} open={open} note={`<${r.tag}>${r.count > 1 ? ` ×${r.count}` : ""}`} />)}</Group>
            <Group title="Rendered by">{u.renderedBy.map((p) => <FileLink key={p} path={p} open={open} />)}</Group>
            <Group title="Imports">{f.imports.map((p) => <FileLink key={p} path={p} open={open} />)}</Group>
            <Group title="Imported by">{u.importedBy.map((p) => <FileLink key={p} path={p} open={open} />)}</Group>
            <Group title="Extends">{f.extends.map((e) => e.file
              ? <FileLink key={e.name + e.base} path={e.file} open={open} note={`${e.name} extends ${e.base}`} />
              : <p key={e.name + e.base} className="font-mono text-xs text-slate-400">{e.name} extends {e.base}</p>)}</Group>
            <Group title="Extended by">{u.extendedBy.map((e) => <FileLink key={e.file + e.name} path={e.file} open={open} note={`${e.name} extends ${e.base}`} />)}</Group>
          </div>
        </section>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode[] }) {
  return (
    <div>
      <h4 className={H}>{title} <span className="text-slate-600">{children.length}</span></h4>
      {children.length ? <div className="max-h-64 space-y-0.5 overflow-y-auto">{children}</div> : <p className="text-sm text-slate-500">None</p>}
    </div>
  );
}

/** /dev/structure: packages by layer, a page's render tree, and one file's links. */
export default function StructureView({ structure: s }: { structure: Structure }) {
  const [tab, setTab] = useState<Tab>("packages");
  const [file, setFile] = useState("src/app/plan/page.tsx");
  const [root, setRoot] = useState("src/app/plan/page.tsx");
  const open = (p: string) => { setFile(p); setTab("file"); window.scrollTo({ top: 0 }); };
  const showTree = (p: string) => { setRoot(p); setTab("tree"); };
  const TABS: [Tab, string][] = [["packages", "Packages"], ["tree", "Render tree"], ["file", "File"]];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(([t, label]) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`${BTN} ${tab === t ? "border-violet-400 bg-violet-500/20 text-violet-100" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}>{label}</button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{s.files.length} files · {s.packages.length} packages · {s.upward.length} imports up a layer · also <code>npm run structure</code></span>
      </div>
      {tab === "packages" && <PackagesTab s={s} open={open} />}
      {tab === "tree" && <TreeTab s={s} root={root} setRoot={setRoot} open={open} />}
      {tab === "file" && <FileTab s={s} path={file} open={open} showTree={showTree} />}
    </div>
  );
}
