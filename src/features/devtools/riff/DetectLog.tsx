"use client";

import { useState } from "react";
import { placed } from "./NoteOverlay";
import type { NeckRead, TakeLog } from "./takes";
import { fretAt, gridOf, parsePlaced, placeByHand } from "@/features/neckFx";
import { STRING_NAMES, type Timed } from "./riff";

const btn = "rounded bg-slate-800 px-3 py-1 text-sm";
const at = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
const neckText = (r: NeckRead) => `markers ${r.markers.length ? r.markers.join(", ") : "none"} · hands ${r.hands.length}`;

/**
 * Keep a frame of Read the neck when it differs from the last one kept (other markers or hand count), or a fifth of a second
 * after it, so a played take gives a steady trail without a row per video frame. Rows come back sorted by time.
 */
export function addNeckRead(log: NeckRead[], r: NeckRead): NeckRead[] {
  const before = log.findLast((x) => x.t <= r.t);
  if (before && r.t - before.t < 0.2 && neckText(before) === neckText(r)) return log;
  if (log.some((x) => Math.abs(x.t - r.t) < 1e-3)) return log; // this frame is in already (played twice)
  return [...log, r].sort((a, b) => a.t - b.t);
}

/**
 * Where the hand says note `n` was played: the neck read nearest its start (within a fifth of a second), its grid from the
 * placed markers, and the fretting hand's fingertips (not the thumb) as frets. The hand counted is the one with most
 * fingertips on the neck. Null with no read, under two placed markers seen, or no hand on the neck.
 */
export function byHand(n: Timed, neck: NeckRead[], markers: string): string | null {
  const read = neck.reduce<NeckRead | null>((b, r) => (Math.abs(r.t - n.start) < Math.abs((b?.t ?? Infinity) - n.start) ? r : b), null);
  if (!read || Math.abs(read.t - n.start) > 0.2 || !read.at) return null;
  const grid = gridOf(read.at.map((m) => ({ id: m.id, c: m })), parsePlaced(markers));
  if (!grid) return null;
  const hands = read.hands.map((tips) => tips.slice(1).map((p) => fretAt(grid, p)).filter((f) => f > -0.5 && f < 22));
  const tips = hands.sort((a, b) => b.length - a.length)[0];
  if (!tips?.length) return null;
  const at = placeByHand(n.midi, tips);
  return at ? `${STRING_NAMES[at.string]} string, fret ${at.fret}` : null;
}

type Row = { t: number; kind: "note" | "neck"; text: string };

/**
 * The take by time: the riff's notes on the take's beat grid, each with where the hand was seen, and what Read the neck saw
 * while the take played (markers, hands, fingertips). Copy log puts the whole log on the clipboard as JSON.
 */
export default function DetectLog({ log, notes, markers, onSeek }: { log: TakeLog; notes: Timed[]; /** "id@fret, …" */ markers: string; onSeek: (t: number) => void }) {
  const [copied, setCopied] = useState("");
  const rows: Row[] = [
    ...notes.map((n) => ({ t: n.start, kind: "note" as const, text: `${placed(n)} · by hand: ${byHand(n, log.neck ?? [], markers) ?? "not seen"}` })),
    ...(log.neck ?? []).map((r) => ({ t: r.t, kind: "neck" as const, text: neckText(r) })),
  ].sort((a, b) => a.t - b.t);
  if (!rows.length) return <p className="text-slate-400">Nothing logged for this take yet. Play the take with Read the neck on for the markers and hands.</p>;

  const copy = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify({ notes, ...log }, null, 1)); setCopied("Copied."); }
    catch (e) { setCopied(`Not copied: ${e instanceof Error ? e.message : String(e)}.`); }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-300">Detection log</h3>
        <span className="text-xs text-slate-500">{notes.length} notes · {log.neck?.length ?? 0} neck reads</span>
        <button onClick={() => void copy()} className={btn}>Copy log</button>
        {copied && <span className="text-xs text-slate-400">{copied}</span>}
      </div>
      <ol className="max-h-64 overflow-y-auto rounded bg-slate-950 p-2 font-mono text-xs">
        {rows.map((r, i) => (
          <li key={i}>
            <button onClick={() => onSeek(r.t)} className="flex w-full gap-3 rounded px-1 text-left hover:bg-slate-800">
              <span className="text-slate-500">{at(r.t)}</span>
              <span className={r.kind === "note" ? "text-sky-300" : "text-amber-300"}>{r.kind}</span>
              <span className="text-slate-300">{r.text}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
