"use client";

import { useState } from "react";
import { fretAt, gridOf, parsePlaced, placeByHand, type NeckRead } from "@/features/neckFx";
import type { TakeNote } from "@/features/neckFx/model/cvFx";
import type { TakeLog } from "../model/takeKey";

const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const noteName = (midi: number) => `${NOTE_NAMES[((Math.round(midi) % 12) + 12) % 12]}${Math.floor(Math.round(midi) / 12) - 1}`;
/** "A3 · A string, fret 12", or the note alone when it has no place */
const placed = (n: TakeNote) => (n.string !== undefined && n.fret !== undefined ? `${noteName(n.midi)} · ${STRING_NAMES[n.string]} string, fret ${n.fret}` : noteName(n.midi));

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
function byHand(n: TakeNote, neck: NeckRead[], markers: string): string | null {
  const read = neck.reduce<NeckRead | null>((b, r) => (Math.abs(r.t - n.start) < Math.abs((b?.t ?? Infinity) - n.start) ? r : b), null);
  if (!read || Math.abs(read.t - n.start) > 0.2 || !read.at) return null;
  const grid = gridOf(read.at.map((m) => ({ id: m.id, c: m })), parsePlaced(markers));
  if (!grid) return null;
  const hands = read.hands.map((tips) => tips.slice(1).map((p) => fretAt(grid, p)).filter((f) => f > -0.5 && f < 22));
  const tips = hands.sort((a, b) => b.length - a.length)[0];
  if (!tips?.length) return null;
  const place = placeByHand(n.midi, tips);
  return place ? `${STRING_NAMES[place.string]} string, fret ${place.fret}` : null;
}

type Row = { t: number; kind: "note" | "neck"; text: string };

/**
 * The take by time: the tool's notes at their times in the take, each with where the hand was seen, and what Read the neck
 * saw while the take played (markers, hands, fingertips). Copy log puts the whole log on the clipboard as JSON.
 */
export default function DetectLog({ log, notes, markers, onSeek }: { log: TakeLog; notes: TakeNote[]; /** "id@fret, …" */ markers: string; onSeek: (t: number) => void }) {
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
        <button type="button" onClick={() => void copy()} className={btn}>Copy log</button>
        {copied && <span className="text-xs text-slate-400">{copied}</span>}
      </div>
      <ol className="max-h-64 overflow-y-auto rounded bg-slate-950 p-2 font-mono text-xs">
        {rows.map((r, i) => (
          <li key={i}>
            <button type="button" onClick={() => onSeek(r.t)} className="flex w-full gap-3 rounded px-1 text-left hover:bg-slate-800">
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
