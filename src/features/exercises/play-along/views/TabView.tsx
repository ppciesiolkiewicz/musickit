"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DotLabel } from "@/components/chordKit/DotLabel";
import { noteLabel } from "@/features/theory/labels";
import { useLabelRoot, useLabelSystem } from "@/features/theory/useLabelSystem";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { gripName } from "@/lib/chordKit/gripName";
import { strum } from "@/lib/chordKit/playback";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { tabOf } from "../../cues/tab";
import { BEATS_PER_BAR } from "../../timeline/timeline";
import { isNow, noteOf, rowsOf, shade, useWidth, zoomFor, type ViewProps } from "./common";
import { BeatBands } from "./BeatBands";
import { GRIP_MIN, GripBox } from "./GripBox";
import { NoteSign, hasNoteSign } from "./NoteSign";

const NAMES = ["e", "B", "G", "D", "A", "E"];
const LEFT = 24, ROW = 18, PAD = 14;
/** room under the low E for the note-length signs */
const SIGNS = 30;
/** about how tall a chord box is on the screen, px: less room than this above a column puts it under */
const GRIP_HEIGHT = 200;

/**
 * Six-line tab (high e on top), one column per strum or note, spaced by beat, with a playhead and each column's length as a
 * note sign under it; wrapped into rows of whole bars that fill the width. A chord's name sits over every column of three
 * notes or more (the cue's chord, else read from the notes), and over a single note where its chord starts. Pointing at
 * a chord's name shows its chord box, and tapping it strums the chord; pointing at a fret number swaps it for the note,
 * labelled as the label settings say (name, interval, degree or solfège, from the chord or the key), and tapping plays it.
 */
export default function TabView({ cues, pos, length, keyPc }: ViewProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [system] = useLabelSystem();
  const [from] = useLabelRoot();
  // the chord name pointed at, and where its box sits on the screen: drawn on the page body, so no card clips it
  // over the name, or under it when there is no room above in the window
  const [grip, setGrip] = useState<{ i: number; left: number; top: number; under: boolean } | null>(null);
  const point = (i: number, el: Element) => {
    const at = el.getBoundingClientRect();
    const under = at.top < GRIP_HEIGHT;
    setGrip({ i, left: at.left + at.width / 2, top: under ? at.bottom : at.top, under });
  };
  // the box is placed once, so it goes when the page moves under it; a tap anywhere but a chord name closes it
  useEffect(() => {
    if (!grip) return;
    const hide = () => setGrip(null);
    const away = (e: PointerEvent) => !(e.target instanceof Element && e.target.closest("[data-grip]")) && hide();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("pointerdown", away);
    };
  }, [grip]);
  const shown = cues.filter((c) => c.frets.length);
  const cols = tabOf(shown);
  const midiOf = (i: number) => [...shown[i].frets].sort((a, b) => a.string - b.string).map((f) => OPEN_MIDI[f.string] + f.fret);
  // each column's chord: the cue's, else read from a column held as a chord; a name over every chord column, and over a
  // single note where its chord starts or a row starts. Room for it on top only when there are names.
  const named = shown.map((c, i) => c.chord || (cols[i].cells.length >= GRIP_MIN ? gripName(midiOf(i))?.name : undefined));
  const changes = named.flatMap((nm, i) => {
    if (!nm) return [];
    const before = named.slice(0, i).findLast(Boolean);
    return [{ i, at: shown[i].at, chord: nm, first: before !== nm }];
  });
  // what a note counts from: the key when the label setting says scale root, else its column's chord root, the chord
  // before it, the one after, or C
  const rootPcOf = (i: number) => {
    if (from === "scale" && keyPc !== undefined) return keyPc;
    const nm = named[i] ?? named.slice(0, i).findLast(Boolean) ?? named.slice(i + 1).find(Boolean);
    return (nm ? parseChordQuery(nm)?.rootPc : undefined) ?? 0;
  };
  const play = (i: number) => strum(midiOf(i), { gapMs: 30, holdMs: 1600 });
  const TOP = changes.length ? 32 : 14;
  const zoom = zoomFor(width);
  const W = width / zoom;
  const { rows, unit } = rowsOf(length, W - 6, LEFT + PAD, 26, 80);
  const signs = shown.some((c) => hasNoteSign(c.beats));
  const H = TOP + 5 * ROW + 12 + (signs ? SIGNS : 0);
  const bar = Math.min(10, unit / 3);

  return (
    <div ref={ref} className="flex w-full flex-col gap-3">
      {rows.map(([start, end]) => {
        const x = (at: number) => LEFT + PAD + (at - start) * unit;
        const right = x(end) - bar;
        return (
          <svg key={start} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Tab" className="font-mono">
            <BeatBands start={start} end={end} x={x} inset={bar} y={TOP - 8} height={H - TOP + 4} />
            {NAMES.map((nm, i) => (
              <g key={i}>
                <text x={4} y={TOP + i * ROW} dominantBaseline="central" fontSize={11} fill="var(--color-slate-500)">{nm}</text>
                <line x1={LEFT} x2={right} y1={TOP + i * ROW} y2={TOP + i * ROW} stroke="var(--color-slate-700)" strokeWidth={i === 5 ? 2.5 : 1} />
              </g>
            ))}
            {Array.from({ length: (end - start) / BEATS_PER_BAR + 1 }, (_, b) => {
              const bx = b === 0 ? LEFT : x(start + b * BEATS_PER_BAR) - bar;
              return <line key={b} x1={bx} x2={bx} y1={TOP} y2={TOP + 5 * ROW} stroke="var(--color-slate-600)" />;
            })}
            {changes.map((c, k) => {
              if (c.at < start || c.at >= end) return null;
              // a box only for a column held as a chord; a name over a single note still plays it
              const box = cols[c.i].cells.length >= GRIP_MIN;
              // a chord column always has its name over it; a single note only where the chord changes or a row starts
              if (!box && !c.first && changes[k - 1]?.at >= start) return null;
              const next = changes.slice(k + 1).find((n) => n.first || cols[n.i].cells.length >= GRIP_MIN)?.at ?? length;
              const now = box ? isNow(shown[c.i], pos) : pos >= c.at && pos < next;
              return (
                <text
                  key={`ch${c.at}`}
                  x={box ? x(c.at) : x(c.at) - 4}
                  textAnchor={box ? "middle" : undefined}
                  y={12}
                  fontSize={12}
                  fontWeight={700}
                  fill={now ? "var(--color-sky-300)" : "var(--color-slate-200)"}
                  className="cursor-pointer font-sans hover:fill-sky-200"
                  data-grip
                  onPointerEnter={(e) => e.pointerType === "mouse" && box && point(c.i, e.currentTarget)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && setGrip(null)}
                  onClick={(e) => {
                    play(c.i);
                    if (box) point(c.i, e.currentTarget);
                  }}
                >
                  <title>{`Play ${c.chord}`}</title>
                  {c.chord}
                </text>
              );
            })}
            {cols.map((col, i) => {
              if (col.at < start || col.at >= end) return null;
              const now = isNow(shown[i], pos);
              const root = rootPcOf(i);
              return col.cells.map((f) => {
                const y = TOP + (5 - f.string) * ROW;
                const midi = OPEN_MIDI[f.string] + f.fret;
                const label = noteLabel(system, noteOf(midi, root));
                // the chip widens to fit the label on hover, drawn over its neighbours
                const wide = Math.max(16, label.length * 7 + 6);
                return (
                  <g key={`${i}-${f.string}`} className="group cursor-pointer" onClick={() => strum([midi], { holdMs: 1200 })}>
                    <rect x={x(col.at) - 8} y={y - 7} width={16} height={14} rx={3} fill="var(--color-slate-950)" className="group-hover:hidden" />
                    <rect x={x(col.at) - wide / 2} y={y - 7} width={wide} height={14} rx={3} fill="var(--color-slate-700)" className="hidden group-hover:inline" />
                    <DotLabel label={String(f.fret)} hover={label} size={(t) => (t.length > 2 ? 10 : 12)} x={x(col.at)} y={y} textAnchor="middle" dominantBaseline="central" fontWeight={600} fill={shade(shown[i], now)} />
                  </g>
                );
              });
            })}
            {signs && shown.map((c, i) => c.at >= start && c.at < end && hasNoteSign(c.beats) && (
              <NoteSign key={`len${i}`} beats={c.beats} x={x(c.at) - 5} y={TOP + 5 * ROW + 14} color={isNow(c, pos) ? "var(--color-sky-300)" : "var(--color-slate-400)"} />
            ))}
            {pos >= start && pos < end && <line x1={x(pos) - bar} x2={x(pos) - bar} y1={TOP - 6} y2={TOP + 5 * ROW + 6} stroke="var(--color-sky-400)" strokeWidth={2} />}
          </svg>
        );
      })}
      {grip && shown[grip.i] && createPortal(
        <div className={`pointer-events-none fixed z-50 -translate-x-1/2 ${grip.under ? "pt-1" : "-translate-y-full pb-1"}`} style={{ left: grip.left, top: grip.top }}>
          <GripBox frets={shown[grip.i].frets} chord={named[grip.i]} />
        </div>,
        document.body,
      )}
    </div>
  );
}
