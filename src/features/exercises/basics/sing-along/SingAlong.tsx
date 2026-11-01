"use client";

import { useEffect, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import type { Clef } from "@/features/theory/piano/staff";
import type { Ladder } from "@/features/theory/singing";
import type { PlacedNote } from "@/features/theory/singingMelodies";
import type { MelodyChord } from "@/features/theory/melodyChords";
import LoopStrip from "./LoopStrip";
import { passAt } from "./passes";
import PianoRoll from "./PianoRoll";
import StreamStaff from "./StreamStaff";
import { useSingAlong } from "./useSingAlong";
import type { Motion } from "./view";

type Look = "staff" | "roll";

/** full screen draws the view bigger for the screen's height, never under 1.2 times */
const scaleFor = (h: number) => Math.max(1.2, Math.min(2.4, h / 380));

function IconButton({ on, tone = "sky", title, onClick, children }: { on?: boolean; tone?: "sky" | "emerald" | "amber"; title: string; onClick: () => void; children: ReactNode }) {
  const lit = { sky: "border-sky-400/70 bg-sky-500/20 text-sky-100", emerald: "border-emerald-400/70 bg-emerald-500/25 text-emerald-100", amber: "border-amber-400/60 bg-amber-500/15 text-amber-200" }[tone];
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} aria-pressed={on}
      className={`grid h-8 w-8 place-items-center rounded-lg border transition ${on ? lit : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
      {children}
    </button>
  );
}

/**
 * A tune to sing along: mute, play, stop and the mic as icons (any of them switches the mic on), a loop over a part of
 * the tune set on a strip of the whole tune (on by default, over all of it; the strip shows only while looping), and the tune drawn on an endless staff or
 * as a piano roll that keeps the line the voice took. Full screen is a page modal (Esc closes it), drawn big, the notes
 * sliding under a bar that stays put so the voice dot holds its place. Key it by the tune: a new one starts over.
 */
export default function SingAlong({ notes, chords, ladder, clef, beatMs, tapped, onNote, info }: {
  notes: PlacedNote[];
  chords: MelodyChord[];
  ladder: Ladder;
  clef: Clef;
  beatMs: number;
  tapped: number | null;
  onNote: (i: number) => void;
  /** words about the tune, after the buttons */
  info: ReactNode;
}) {
  const total = notes[notes.length - 1].at + notes[notes.length - 1].beats;
  const { focus, ...sa } = useSingAlong({ notes, chords, beatMs, total });
  const [look, setLook] = useState<Look>("staff");
  const [motion, setMotion] = useState<Motion>("notes");
  const [full, setFull] = useState(false);
  const [scale, setScale] = useState(2);
  useEffect(() => {
    if (!full) return;
    const fit = () => setScale(scaleFor(window.innerHeight));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setFull(false);
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);
  // full screen keeps the dot still: the notes move, never the bar
  const moves: Motion = full ? "notes" : motion;
  const size = full ? scale : 1;
  const pass = sa.playing ? passAt(sa.frame.passes, sa.frame.s) : undefined;
  const at = pass ? pass.from + sa.frame.s - pass.start : null;
  const seg = (on: boolean) => `px-2.5 py-1 text-[11px] transition ${on ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`;

  return (
    <div ref={focus} role={full ? "dialog" : undefined} aria-modal={full || undefined} aria-label={full ? "Sing along" : undefined}
      className={full ? "fixed inset-0 z-[70] flex flex-col gap-4 overflow-hidden bg-slate-950 p-4 sm:p-6" : "flex flex-col gap-2"}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        <IconButton on={sa.muted} tone="amber" title={sa.muted ? "Unmute the piano" : "Mute the piano (the bar keeps going)"} onClick={sa.toggleMute}>
          <Icon name={sa.muted ? "volume-x" : "volume-2"} size={15} />
        </IconButton>
        <IconButton on={sa.playing} title={sa.playing ? "Play from the start" : "Play"} onClick={() => void sa.play()}>
          <Icon name="play" size={15} />
        </IconButton>
        <IconButton title="Stop" onClick={sa.stop}>
          <Icon name="square" size={14} />
        </IconButton>
        <IconButton on={sa.mic} tone="emerald" title={sa.mic ? "Stop the mic" : "Switch the mic on and sing"} onClick={sa.toggleMic}>
          <Icon name="mic" size={15} />
        </IconButton>
        <span className="mx-1 h-5 w-px bg-slate-800" />
        <IconButton on={sa.loop} title={sa.loop ? "Stop looping a part" : "Loop a part"} onClick={() => sa.setLoop(!sa.loop)}>
          <Icon name="repeat" size={15} />
        </IconButton>
        <div className="flex overflow-hidden rounded-lg border border-slate-700">
          <button type="button" className={seg(look === "staff")} aria-pressed={look === "staff"} onClick={() => setLook("staff")}>Staff</button>
          <button type="button" className={seg(look === "roll")} aria-pressed={look === "roll"} onClick={() => setLook("roll")}>Piano roll</button>
        </div>
        {process.env.NODE_ENV !== "production" && !full && (
          <label className="flex items-center gap-1 text-[11px] text-fuchsia-300/80" title="Dev only: compare the bar moving over still notes">
            <input type="checkbox" checked={motion === "bar"} onChange={(e) => setMotion(e.target.checked ? "bar" : "notes")} />
            bar moves
          </label>
        )}
        <span className="ml-1">{info}{sa.status === "denied" ? " · microphone blocked in the browser" : ""}</span>
        <span className="ml-auto" />
        <IconButton on={full} title={full ? "Close full screen (Esc)" : "Full screen"} onClick={() => setFull((v) => !v)}>
          <Icon name={full ? "minimize" : "maximize"} size={15} />
        </IconButton>
      </div>
      {sa.loop && <LoopStrip key={total} notes={notes} total={total} region={sa.region} loop={sa.loop} at={at} onRegion={sa.setRegion} />}
      <div className={full ? "flex min-h-0 flex-1 flex-col justify-center" : "contents"}>
        {look === "staff" ? (
          <StreamStaff frame={sa.frame} notes={notes} chords={chords} ladder={ladder} clef={clef} beatMs={beatMs} tapped={tapped} onNote={onNote} motion={moves} scale={size} />
        ) : (
          <PianoRoll frame={sa.frame} notes={notes} chords={chords} ladder={ladder} beatMs={beatMs} tapped={tapped} onNote={onNote} motion={moves} scale={size} />
        )}
      </div>
    </div>
  );
}
