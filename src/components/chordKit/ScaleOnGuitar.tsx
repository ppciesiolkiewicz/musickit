"use client";

import { useMemo, useState } from "react";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import type { KeyContext } from "@/features/theory/theory";
import { pentatonicOf, positionLine, positionsFor, rootStrings, scaleCells, type Pentatonic, type PositionKind, type ScaleCell, type ScalePosition } from "@/lib/chordKit/scalePositions";
import { PositionBox, ScaleNeck, cellKey } from "./ScaleNeck";
import { STRING_NAMES } from "./Fretboard";
import type { NotePlayer } from "./useNotePlayer";
import TuneButton from "./TuneButton";
import { generateMelody, melodyTiming } from "@/lib/chordKit/melody";
import { Checkbox, Chip, ChipRow, Info } from "@/components/ui";
import { DegreeLegend } from "@/components/theory/DegreeLegend";

const DEGREE_ORD = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];
const playBtn = "rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25";

/** A pentatonic page shows just its five notes, in its own positions, with the rest of the mode it is cut from as rings. */
export interface PentatonicOnly {
  pent: Pentatonic;
  positions: ScalePosition[];
  /** the positions are the major pentatonic's boxes, named by root strings; otherwise one starts on each note, numbered up the neck */
  boxes: boolean;
  /** "E Hirajōshi" */
  title: string;
  /** its notes, low to high, and notes from outside `ctx` placed on the neck (the blues ♯4) */
  names: string[];
  extra?: ScaleCell[];
}

/**
 * A mode on the guitar: the whole neck, then the five positions to learn it in (the pentatonic boxes, or the full scale in those boxes).
 * Tap a note to hear it, play a position up and down, or pick a position to light it up on the neck.
 * With `only`, a pentatonic cut from `ctx` and nothing else.
 */
export default function ScaleOnGuitar({ ctx, player, only }: { ctx: KeyContext; player: NotePlayer; only?: PentatonicOnly }) {
  const [system] = useLabelSystem();
  const [kind, setKind] = useState<PositionKind>("pentatonic");
  const [rings, setRings] = useState(true);
  const [focus, setFocus] = useState<number | null>(null);
  /** positions shown as their v2 (`alt`), by kind and number */
  const [v2, setV2] = useState<Set<string>>(new Set());
  const { active, play, playTimed, tap } = player;

  const cells = useMemo(() => [...scaleCells(ctx), ...(only?.extra ?? [])], [ctx, only]);
  const pent = useMemo(() => only?.pent ?? pentatonicOf(ctx.steps), [ctx, only]);
  const positions = useMemo(() => only?.positions ?? positionsFor(ctx, kind), [ctx, kind, only]);
  const pentDegrees = new Set(pent.degrees);
  const big = kind === "pentatonic" ? (c: ScaleCell) => pentDegrees.has(c.degree) : () => true;
  const vKey = (p: ScalePosition) => `${only ? "only" : kind}-${p.number}`;
  const shown = (p: ScalePosition) => (p.alt && v2.has(vKey(p)) ? p.alt : p);
  const toggleV2 = (p: ScalePosition, on: boolean) => setV2((prev) => {
    const next = new Set(prev);
    if (on) next.add(vKey(p));
    else next.delete(vKey(p));
    return next;
  });
  const focusedBox = positions.find((p) => p.number === focus);
  const focused = focusedBox ? shown(focusedBox) : null;
  const keyName = only?.title ?? `${ctx.names[0]} ${ctx.modeName}`;
  const byStart = only ? !only.boxes : kind === "3nps";
  /** Switch shapes but keep the picked position: the same number, or the last one when the new kind has fewer. */
  const pickKind = (k: PositionKind) => {
    setKind(k);
    setFocus((f) => (f === null ? null : Math.min(f, positionsFor(ctx, k).length)));
  };

  const onNote = (c: ScaleCell) => tap(cellKey(c), c.midi);
  const playPosition = (p: ScalePosition) => {
    setFocus(p.number);
    const up = positionLine(p);
    const line = [...up, ...up.slice(0, -1).reverse()];
    play(line.map((c) => ({ key: cellKey(c), midi: c.midi })), 220);
  };
  /** A short tune using only the position's notes, so it can be played in that box. */
  const playTune = (p: ScalePosition, tuneId: string) => {
    setFocus(p.number);
    playTimed(melodyTiming(generateMelody(positionLine(p), ctx.steps)).map((n) => ({ key: cellKey(n.note), midi: n.note.midi, ms: n.ms, velocity: n.velocity })), tuneId);
  };

  return (
    <section id="guitar" className="bleed scroll-mt-48 rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
      <h2 className="mb-2 text-sm font-medium text-slate-100">
        {keyName} on the guitar
        <Info label="How do I read the neck?">
          {only
            ? <>Every dot is a note of {keyName}, coloured by its scale degree; the root has a white ring. Tap any note to hear it. The rings are the two notes {ctx.names[0]} {ctx.modeName} adds, the seven-note mode this scale is cut from. Pick a position below to light it up on the neck.</>
            : <>Every dot is a note of {keyName}, coloured by its scale degree; the root has a white ring. Tap any note to hear it. In pentatonic mode the five notes of the {pent.name.toLowerCase()} are the big dots and the other two notes of the mode are small rings, so you can see what the mode adds to the pentatonic. Pick a position below to light it up on the neck. A position marked v1 / v2 has notes that fit on two strings: v1 plays each at the spot closest to the box, v2 on the other string.</>}
        </Info>
      </h2>

      <ScaleNeck cells={cells} big={big} rings={rings} focus={focused} active={active} labelSystem={system} onNote={onNote} title={`${keyName} on the guitar neck`} />
      <div className="mt-2">
        <DegreeLegend />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {only ? (
          <ChipRow label="Shapes" info={only.boxes
            ? "Five positions cover the neck: the five boxes of the major and minor pentatonic, which share these notes. Each is named by the strings its root is on (counting from the low E): 1 has it on E, D and high e; 2 on D and B; 3 on A and B; 4 on A and G; 5 on G, E and high e. They are the same boxes as on the mode pages."
            : "Five positions cover the neck, two notes on every string: one pattern starting on each note of the scale on the low E string, numbered up the neck. This scale is not the major or minor pentatonic in another place, so it does not fit their boxes; two notes a string keeps every pattern within a hand's reach."}>
            <span className="text-xs text-slate-300">{only.boxes ? "The five pentatonic boxes" : "Two notes per string"}</span>
          </ChipRow>
        ) : (
        <ChipRow label="Shapes" info="Five positions cover the neck, and each is named by the strings its root is on (counting from the low E): 1 has it on E, D and high e; 2 on D and B; 3 on A and B; 4 on A and G; 5 on G, E and high e. Each box keeps its classic shape: it sits at the root's fret on the low E string. Near the nut a note that would fall below it moves to the next string down (so in E, position 1 is the open position); otherwise a box that would go below the nut or past the 17th fret is shown an octave away, so the numbers can jump along the neck. Every mode uses the same five boxes as the major pentatonic (when it has a major 3rd) or the minor pentatonic (minor 3rd), so the shapes look familiar: each string keeps the frets that box uses, and the mode's notes are placed there. Pentatonic shows the mode's five-note scale. Full scale adds the other two notes into the same five boxes (the CAGED scale shapes), so there are still five positions, not seven: one map of the neck for both, with the pentatonic you know as the frame. 3 notes per string is the other common system: seven patterns, one starting on each note of the scale on the low E string, with exactly three notes on every string. They stretch wider but keep one fingering rhythm across the strings, which suits fast runs and legato. They are numbered up the neck.">
          <Chip on={kind === "pentatonic"} onClick={() => pickKind("pentatonic")}>{pent.name} boxes</Chip>
          <Chip on={kind === "scale"} onClick={() => pickKind("scale")}>Full scale</Chip>
          <Chip on={kind === "3nps"} onClick={() => pickKind("3nps")}>3 notes per string</Chip>
        </ChipRow>
        )}
        <ChipRow label="Extra notes" info="Shown on the neck and in every box. Off, the neck and boxes show only the notes you play; with a position picked, the neck shows just that box.">
          <Checkbox checked={rings} onChange={setRings}>
            {only ? `The other 2 notes of ${ctx.names[0]} ${ctx.modeName}, and notes outside the box` : kind === "pentatonic" ? `The other ${7 - pent.degrees.length} notes of ${ctx.modeName}, and notes outside the box` : "Notes outside the box"}
          </Checkbox>
        </ChipRow>
      </div>

      <div className="mt-4 min-h-8">
        {focused ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-slate-300">Position <b className="text-slate-100">{focused.number}</b>{focusedBox?.alt && <> {focused === focusedBox ? "v1" : "v2"}</>}</span>
            <button type="button" onClick={() => setFocus(null)} className="ml-1 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-sky-400">
              ✕ Clear position
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Pick a position below to outline it on the neck.</p>
        )}
      </div>

      <div className={`mt-2 grid gap-3 sm:grid-cols-2 ${!only && kind === "3nps" ? "lg:grid-cols-4 2xl:grid-cols-7" : "lg:grid-cols-3 xl:grid-cols-5"}`}>
        {positions.map((p) => {
          const on = focus === p.number;
          const box = shown(p);
          return (
            <div key={p.number} className={`flex min-w-0 flex-col gap-1.5 rounded-xl border p-2 transition ${on ? "border-sky-500/70 bg-sky-500/5" : "border-slate-800 bg-slate-950/50"}`}>
              <div className="flex flex-col items-start gap-2">
                <button type="button" onClick={() => setFocus(on ? null : p.number)} aria-pressed={on} className="text-left text-sm font-medium text-slate-100 hover:text-sky-300" title="Light it up on the neck">
                  Position {p.number}
                  <span className="block text-xs font-normal text-slate-300">
                    {byStart ? <>starts on {ctx.names[p.startDegree]} <span className="text-slate-500">({DEGREE_ORD[p.startDegree]})</span></> : <>root on {rootStrings(p).map((s) => STRING_NAMES[s]).join(", ")}</>}
                  </span>
                  <span className="block text-xs font-normal text-slate-500">frets {box.from}–{box.to}</span>
                </button>
                {p.alt && (
                  <div className="flex gap-1" role="group" aria-label={`Position ${p.number} variant`}>
                    {([false, true] as const).map((alt) => (
                      <button
                        key={String(alt)}
                        type="button"
                        onClick={() => toggleV2(p, alt)}
                        aria-pressed={box === (alt ? p.alt : p)}
                        title={alt ? "v2: the notes that fit on two strings played on the other one" : "v1: every note at the spot closest to the box"}
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${box === (alt ? p.alt : p) ? "border-sky-400 bg-sky-500/15 text-sky-100" : "border-slate-700 text-slate-400 hover:border-sky-400"}`}
                      >
                        {alt ? "v2" : "v1"}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => playPosition(box)} className={`cursor-sound ${playBtn}`}>▶ Play</button>
                  <TuneButton onPlay={(id) => playTune(box, id)} title="A short tune using only this position's notes, new every time" className={playBtn} />
                </div>
              </div>
              <PositionBox position={box} cells={cells} rings={rings} active={active} labelSystem={system} onNote={onNote} />
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-slate-300" />{only ? `in ${keyName}: played` : kind === "pentatonic" ? `in the ${pent.name.toLowerCase()}: played` : "in the position: played"}</span>
        {rings && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-slate-400" />{only ? `other notes of ${ctx.modeName}: not played` : kind === "pentatonic" ? `other notes of ${ctx.modeName}: not played` : "scale notes outside the position: not played"}</span>}
        <span>Play runs up the position from its lowest note and back down; Sample melody plays a short tune using only its notes. Tap a position&apos;s name to see it on the neck.</span>
      </p>
    </section>
  );
}
