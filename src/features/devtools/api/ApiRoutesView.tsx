"use client";

import { useMemo, useState } from "react";
import { routeGroup, type ApiRoute } from "../model/apiRoutes";

const METHOD_TONE: Record<string, string> = {
  GET: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  POST: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  PUT: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  PATCH: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  DELETE: "border-rose-500/40 bg-rose-500/15 text-rose-200",
};

/** Every API route: its URL, file, who may call it, and each method with its doc comment. */
export default function ApiRoutesView({ routes, root }: { routes: ApiRoute[]; root: string }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return routes;
    return routes.filter((r) => [r.path, r.file, ...r.methods.flatMap((m) => [m.method, m.doc])].join(" ").toLowerCase().includes(needle));
  }, [routes, q]);
  const groups = useMemo(() => {
    const out = new Map<string, ApiRoute[]>();
    for (const r of shown) out.set(routeGroup(r.path), [...(out.get(routeGroup(r.path)) ?? []), r]);
    return [...out];
  }, [shown]);
  const methods = routes.reduce((n, r) => n + r.methods.length, 0);
  const undocumented = routes.reduce((n, r) => n + r.methods.filter((m) => !m.doc).length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by path, method or doc"
          aria-label="Filter routes"
          className="min-h-9 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
        />
        <span>
          {routes.length} routes, {methods} methods{undocumented > 0 && <>, <span className="text-amber-300">{undocumented} without a doc</span></>}
        </span>
      </div>

      {groups.length === 0 && <p className="text-sm text-slate-400">No route matches “{q}”.</p>}

      {groups.map(([group, rs]) => (
        <section key={group}>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">/api/{group}</h2>
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
            {rs.map((r) => (
              <li key={r.file} className="space-y-2 p-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <code className="font-mono text-sm text-slate-100">{r.path}</code>
                  {r.guard && <span className="rounded border border-slate-700 px-1.5 text-[11px] text-slate-400">{r.guard}</span>}
                  <a href={`vscode://file/${root}/${r.file}`} className="font-mono text-xs text-slate-500 hover:text-sky-300 hover:underline">
                    {r.file.replace(/^src\/app\//, "")}
                  </a>
                </div>
                <ul className="space-y-1.5">
                  {r.methods.map((m) => (
                    <li key={m.method} className="flex gap-3 text-sm">
                      <span className={`h-fit w-16 shrink-0 rounded border px-1.5 text-center font-mono text-[11px] font-semibold ${METHOD_TONE[m.method] ?? "border-slate-600 text-slate-300"}`}>{m.method}</span>
                      <span className={m.doc ? "text-slate-300" : "italic text-amber-300/80"}>{m.doc || "No doc comment."}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
