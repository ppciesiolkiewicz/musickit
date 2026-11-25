"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { contentVideoFileUrl, deleteContentVideo, editContentVideo, listContentVideos, retickContentVideo } from "../client/api";
import { coverage, coveredCount, stepGroups, toolName, type SeedUse } from "../model/coverage";
import type { ContentVideoInfo } from "../server/access";
import type { Lost } from "../server/repo";

/**
 * The Tools videos page (/admin/content/videos), laid out like Component stories: every tool a video can be for on the
 * left with how many of its levels have a video, the picked one on the right. Its levels, each with the video that covers
 * it or Missing, how many seed exercises use the tool there and a Record link; under them every video made for the tool,
 * with Play, Change levels, Edit and Delete. No player loads until Play is pressed.
 */

const btn = "rounded-md border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:border-slate-400 hover:text-slate-100 disabled:opacity-40";
const input = "rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200";

/** `#picking-drill`: the picked tool in the address, so it can be linked and survives a reload. */
const readHash = (): string => decodeURIComponent(window.location.hash.slice(1));

/** A step's name for a person: its ladder step's name, No level, or the tool. */
function stepNames(tool: string): Map<string | null, string> {
  return new Map(stepGroups(tool).flatMap((g) => g.steps.map((s) => [s.step, s.step === null ? "the whole tool" : s.name] as const)));
}

const recordHref = (tool: string, steps: (string | null)[]): string => {
  const ticked = steps.filter((s): s is string => s !== null);
  return `/admin/content/videos/record?tool=${encodeURIComponent(tool)}${ticked.length ? `&steps=${encodeURIComponent(ticked.join(","))}` : ""}`;
};

/** "Beginner and Intermediate", "every level". */
function levelsLine(tool: string, steps: string[] | null): string {
  const names = stepNames(tool);
  if (steps === null) return "the whole tool";
  const all = stepGroups(tool).flatMap((g) => g.steps.map((s) => s.step));
  if (all.every((s) => s !== null && steps.includes(s))) return "every level and No level";
  const list = steps.map((s) => names.get(s) ?? s);
  return list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}

/** What the last re-tick took off other videos, in one line. */
function lostLine(tool: string, lost: Lost[]): string {
  if (!lost.length) return "";
  return lost.map((l) => `“${l.title}” lost ${l.steps.length ? levelsLine(tool, l.steps) : "the tool"}${l.emptied ? " and now shows nowhere" : ""}.`).join(" ");
}

export default function ToolVideos({ tools, use, initial, initialError }: { tools: string[]; use: SeedUse; initial: ContentVideoInfo[]; initialError: string }) {
  const [videos, setVideos] = useState(initial);
  const [error, setError] = useState(initialError);
  const [tool, setTool] = useState(tools[0]);
  const [filter, setFilter] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const pick = () => { const h = readHash(); if (tools.includes(h)) setTool(h); };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [tools]);
  const choose = (t: string) => { setTool(t); setNote(""); history.replaceState(null, "", `#${encodeURIComponent(t)}`); };

  const reload = async () => {
    const got = await listContentVideos();
    if (got.ok) { setVideos(got.value); setError(""); } else setError(got.error);
  };

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? tools.filter((t) => t.includes(q)) : tools;
  }, [tools, filter]);
  const groups = coverage(tool, videos, use);
  const own = videos.filter((v) => v.madeFor === `tool:${tool}`);
  const byId = new Map(videos.map((v) => [v.id, v]));
  const count = coveredCount(tool, videos);

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
      <nav className="flex flex-col gap-2 pr-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto" aria-label="Tools">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter tools" className={input} />
        <ul className="flex flex-col gap-0.5">
          {shown.map((t) => {
            const c = coveredCount(t, videos);
            return (
              <li key={t}>
                <button type="button" onClick={() => choose(t)} aria-current={t === tool}
                  className={`flex w-full items-baseline justify-between gap-2 rounded px-2 py-1 text-left font-mono text-xs ${t === tool ? "bg-emerald-500/15 text-emerald-100" : "text-slate-300 hover:text-slate-100"}`}>
                  <span className="truncate">{toolName(t)}</span>
                  <span className={`shrink-0 text-[10px] ${c.covered === c.of ? "text-emerald-400" : c.covered ? "text-amber-300" : "text-slate-500"}`}>{c.covered}/{c.of}</span>
                </button>
              </li>
            );
          })}
          {!shown.length && <li className="px-2 text-xs text-slate-500">No tool matches.</li>}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-mono text-lg text-slate-100">{toolName(tool)}</h2>
          <span className="text-sm text-slate-400">{count.covered} of {count.of} {count.of === 1 ? "has" : "have"} a video</span>
        </header>
        {error && <p role="alert" className="text-sm text-rose-400">{error} <button type="button" onClick={() => void reload()} className={btn}>Try again</button></p>}
        {note && <p role="status" className="text-sm text-slate-300">{note}</p>}

        {groups.map((g) => (
          <section key={g.ladder ?? g.label} className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g.label}</h3>
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
              {g.steps.map((s) => {
                const v = s.video ? byId.get(s.video) : undefined;
                return (
                  <li key={s.step ?? "tool"} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-3 py-2 text-sm">
                    <div className="min-w-48 flex-1">
                      <div className="text-slate-200">{s.name}</div>
                      {s.holds && <div className="text-xs text-slate-500">{s.holds}</div>}
                    </div>
                    <div className="w-40 text-xs text-slate-400">
                      {s.blocks.length ? (
                        <details>
                          <summary className="cursor-pointer">Used by {s.blocks.length} seed {s.blocks.length === 1 ? "exercise" : "exercises"}</summary>
                          <ul className="mt-1 flex flex-col gap-0.5">
                            {s.blocks.map((b) => <li key={b}><Link href={`/admin/content/library/blocks?item=${encodeURIComponent(b)}`} className="break-all text-sky-400 hover:underline">{b}</Link></li>)}
                          </ul>
                        </details>
                      ) : "No seed exercise"}
                    </div>
                    <div className="flex min-w-56 flex-1 flex-wrap items-center gap-2">
                      {v ? (
                        <span className="text-slate-200">“{v.title}”{v.steps && v.steps.length > 1 && <span className="text-xs text-slate-500"> · also {levelsLine(tool, v.steps.filter((x) => x !== s.step))}</span>}</span>
                      ) : <span className="rounded bg-amber-500/15 px-1.5 text-xs text-amber-200">Missing</span>}
                      <Link href={recordHref(tool, [s.step])} className={`${btn} ml-auto`}>Record</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Videos made for this tool</h3>
          {own.length ? (
            <ul className="flex flex-col gap-2">
              {own.map((v) => <VideoRow key={v.id} tool={tool} video={v} onChanged={(line) => { setNote(line); void reload(); }} />)}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              No video has been made for this tool yet. Press Record on a level above, or{" "}
              <Link href={recordHref(tool, stepGroups(tool).flatMap((g) => g.steps.map((s) => s.step)))} className="text-sky-400 hover:underline">record one for every level</Link>.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

type Mode = "idle" | "levels" | "edit" | "delete";

/** One video made for the tool: what it covers, Play, and Change levels, Edit and Delete, each opened in place. */
function VideoRow({ tool, video, onChanged }: { tool: string; video: ContentVideoInfo; onChanged: (line: string) => void }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(video.title);
  const [note, setNote] = useState(video.note);
  const all = stepGroups(tool).flatMap((g) => g.steps);
  const laddered = all.some((s) => s.step !== null);
  const [ticked, setTicked] = useState<string[]>(video.steps ?? []);
  const [whole, setWhole] = useState(video.tool !== null);

  const open = (m: Mode) => { setMode(m); setError(""); setTitle(video.title); setNote(video.note); setTicked(video.steps ?? []); setWhole(video.tool !== null); };
  const run = async (fn: () => Promise<{ ok: true; line: string } | { ok: false; error: string }>) => {
    setBusy(true);
    setError("");
    const out = await fn();
    setBusy(false);
    if (!out.ok) { setError(out.error); return; }
    setMode("idle");
    onChanged(out.line);
  };
  const saveLevels = () => run(async () => {
    const steps = laddered ? all.flatMap((s) => (s.step !== null && ticked.includes(s.step) ? [s.step] : [])) : whole ? null : [];
    const out = await retickContentVideo(video.id, steps);
    return out.ok ? { ok: true, line: `“${video.title}” now covers ${out.value.video.tool ? levelsLine(tool, out.value.video.steps) : "nothing, so it shows nowhere"}. ${lostLine(tool, out.value.lost)}`.trim() } : out;
  });
  const saveEdit = () => run(async () => {
    const out = await editContentVideo(video.id, { title, note });
    return out.ok ? { ok: true, line: `“${out.value.title}” saved.` } : out;
  });
  const remove = () => run(async () => {
    const out = await deleteContentVideo(video.id);
    return out.ok ? { ok: true, line: `“${video.title}” deleted.` } : out;
  });

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium text-slate-100">{video.title || "Untitled"}</span>
        <span className="text-xs text-slate-400">{video.tool ? `Covers ${levelsLine(tool, video.steps)}` : "Shows nowhere"} · {Math.round(video.seconds)} s · saved {new Date(video.savedAt).toLocaleDateString()}</span>
        <div className="ml-auto flex flex-wrap gap-1">
          <button type="button" onClick={() => setPlaying((p) => !p)} className={btn}>{playing ? "Hide video" : "Play"}</button>
          <button type="button" onClick={() => open(mode === "levels" ? "idle" : "levels")} className={btn}>Change levels</button>
          <button type="button" onClick={() => open(mode === "edit" ? "idle" : "edit")} className={btn}>Edit</button>
          <button type="button" onClick={() => open(mode === "delete" ? "idle" : "delete")} className={`${btn} hover:border-rose-500 hover:text-rose-200`}>Delete</button>
        </div>
      </div>
      {video.note && <p className="text-xs text-slate-400">{video.note}</p>}
      {playing && <video src={contentVideoFileUrl(video.id)} controls autoPlay playsInline className="max-h-96 w-full max-w-2xl rounded bg-black" />}

      {mode === "levels" && (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-800 p-2">
          <p className="text-xs text-slate-400">Tick the levels this video is for. A level another video covers moves to this one.</p>
          {laddered ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {all.map((s) => s.step !== null && (
                <label key={s.step} className="flex items-center gap-1.5 text-slate-300">
                  <input type="checkbox" checked={ticked.includes(s.step)} onChange={(e) => setTicked((t) => (e.target.checked ? [...t, s.step!] : t.filter((x) => x !== s.step)))} className="accent-emerald-500" />
                  {s.name}
                </label>
              ))}
            </div>
          ) : (
            <label className="flex items-center gap-1.5 text-slate-300">
              <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} className="accent-emerald-500" /> Show with every exercise that uses this tool
            </label>
          )}
          <div className="flex gap-1">
            <button type="button" onClick={() => void saveLevels()} disabled={busy} className={btn}>{busy ? "Saving…" : "Save levels"}</button>
            <button type="button" onClick={() => setMode("idle")} disabled={busy} className={btn}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "edit" && (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-800 p-2">
          <label className="flex flex-col gap-1 text-xs text-slate-400">Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={input} /></label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">Note: what the video shows<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} className={input} /></label>
          <div className="flex gap-1">
            <button type="button" onClick={() => void saveEdit()} disabled={busy || !title.trim()} className={btn}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setMode("idle")} disabled={busy} className={btn}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "delete" && (
        <div className="flex flex-col gap-2 rounded-lg border border-rose-900/60 p-2">
          <p className="text-slate-300">Delete “{video.title}”? Its file is deleted too. This can&apos;t be undone.</p>
          {video.tool && <p className="text-xs text-amber-200">It still covers {levelsLine(tool, video.steps)}. Untick them with Change levels first.</p>}
          <div className="flex gap-1">
            <button type="button" onClick={() => void remove()} disabled={busy || video.tool !== null} className={`${btn} hover:border-rose-500 hover:text-rose-200`}>{busy ? "Deleting…" : "Delete video"}</button>
            <button type="button" onClick={() => setMode("idle")} disabled={busy} className={btn}>Keep video</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
    </li>
  );
}
