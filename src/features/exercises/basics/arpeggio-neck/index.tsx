"use client";

import { noteState, type Others, type Visibility } from "../../cues/visibility";
import { pickBox, type Placement } from "../../cues/placement";
import { boxesOf } from "../../cues/cues";
import { useCallback, useMemo } from "react";
import { PositionBox, cellKey } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { Hint } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import type { ScaleCell, ScalePosition } from "@/lib/chordKit/scalePositions";
import type { Degree } from "../../timeline/types";
import { arpeggioPartNotes } from "../arpeggio";
import { ArpeggioOnGuitar } from "@/components/chordKit/ArpeggiosExplorer";
import { arpTypeOf } from "@/lib/chordKit/arpeggios";
import { keyChoiceFor, keyContext } from "@/features/creator";

const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
/** semitones above the root to the 0-based degree whose colour the dot takes */
const SEMI_DEGREE = [0, 1, 1, 2, 2, 3, 4, 4, 4, 5, 6, 6];

/**
 * A chord's arpeggio in one box, or two neighbouring boxes drawn as one with the shared notes ringed (the seam); only the
 * `part` asked for; tap a note to hear it, ▶ to run it up and down.
 */
export function View(props: { chord: string; boxes?: number[]; placement?: Placement; part?: Degree[]; enable?: number[]; highlight?: number[]; mute?: number[]; hide?: number[]; others?: Others; show?: ("neck" | "positions")[]; roots?: number[] }) {
  const type = props.show?.length ? arpTypeOf(props.chord) : null;
  return type ? <PageViews chord={props.chord} type={type} show={props.show!} roots={props.roots} /> : <Boxes {...props} />;
}

/**
 * The arpeggios page's views of the chord (the whole neck and/or its positions, `roots` the root strings), drawn in a key
 * on the chord's own root: major for a major 3rd, minor for a minor one, the chord on degree 1.
 */
function PageViews({ chord, type, show, roots }: { chord: string; type: string; show: ("neck" | "positions")[]; roots?: number[] }) {
  useCoverage({});
  const q = parseChordQuery(chord);
  const root = q?.rootPc ?? null, minor = !!q?.semis.includes(3);
  const ctx = useMemo(() => (root === null ? null : keyContext(keyChoiceFor(root, minor ? "natural-minor-aeolian" : "major-ionian"))), [root, minor]);
  if (!ctx) return null;
  return (
    <div data-tour="arpeggio-neck-box">
      <ArpeggioOnGuitar ctx={ctx} degree={0} type={type} neck={show.includes("neck")} positions={show.includes("positions")} roots={roots} />
    </div>
  );
}

function Boxes({ chord, boxes: asked, placement, part, enable, highlight, mute, hide, others }: { chord: string; boxes?: number[]; placement?: Placement; part?: Degree[]; enable?: number[]; highlight?: number[]; mute?: number[]; hide?: number[]; others?: Others }) {
  useCoverage({ hints: 1 });
  const [system] = useLabelSystem();
  const { active, running, play, tap, stop } = useNotePlayer();
  const rootPc = parseChordQuery(chord)?.rootPc ?? 0;
  // `boxes` as asked; else the box a placement picks (maybe an octave down); else box 1
  const { boxes, shift } = useMemo(() => {
    if (asked?.length || !placement || placement.by === "chords") return { boxes: asked, shift: 0 };
    const picked = pickBox(boxesOf(chord).map((b, i) => ({ number: i + 1, from: b.from, to: b.to, roots: [{ string: b.rootString, fret: b.rootFret }] })), placement);
    return picked ? { boxes: [picked.number], shift: picked.shift } : { boxes: undefined, shift: 0 };
  }, [asked, placement, chord]);
  // the marks are semitones above the chord root; the states work on pitch classes
  const vis = useMemo((): Visibility => {
    const pcs = (semis?: number[]) => semis?.map((semi) => (rootPc + semi) % 12);
    return { enable: pcs(enable), highlight: pcs(highlight), mute: pcs(mute), hide: pcs(hide), others };
  }, [rootPc, enable, highlight, mute, hide, others]);
  const state = useCallback((p: number) => noteState(vis, p), [vis]);
  const litNames = (vis.highlight ?? []).filter((p) => state(p) === "highlighted").map((p) => SHARP[p]);
  const { position, seam } = useMemo(() => {
    const all = arpeggioPartNotes(chord, { part, boxes });
    const kept = all.filter((n) => state(n.midi % 12) !== "hidden").map((n) => (shift ? { ...n, fret: n.fret + shift, midi: n.midi + shift } : n));
    const notes: ScaleCell[] = kept.map((n) => ({ string: n.string, fret: n.fret, midi: n.midi, pc: n.midi % 12, degree: SEMI_DEGREE[n.semis], name: SHARP[n.midi % 12], semi: n.semis, degreeText: SEMI_TEXT[n.semis] }));
    const frets = notes.map((n) => n.fret);
    const position: ScalePosition | null = notes.length ? { number: boxes?.[0] ?? 1, startDegree: 0, notes, from: Math.min(...frets), to: Math.max(...frets) } : null;
    return { position, seam: new Set(kept.filter((n) => n.seam).map(cellKey)) };
  }, [chord, part, boxes, shift, state]);
  if (!position) return <p className="text-xs text-slate-500">No arpeggio for {chord}.</p>;
  const run = () => {
    const up = position.notes.map((n) => ({ key: cellKey(n), midi: n.midi }));
    play([...up, ...up.slice(0, -1).reverse()]);
  };
  const shown = boxes?.length ? boxes : [1];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span>{chord} arpeggio · box{shown.length > 1 ? "es" : ""} {shown.join(" & ")}{part?.length ? ` · ${part.join(" ")}` : ""}{litNames.length ? ` · ${litNames.join(" ")} lit` : ""}{seam.size ? " · dashed rings: the notes both boxes share" : ""}</span>
        <Hint title="Play" description="Runs the arpeggio up and back down.">
          <button type="button" data-tour="arpeggio-neck-play" onClick={running ? stop : run} className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500">{running ? "■ Stop" : "▶ Play"}</button>
        </Hint>
      </div>
      <div data-tour="arpeggio-neck-box">
        <PositionBox position={position} cells={[]} rings={false} active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} states={state} seam={seam} horizontal />
      </div>
    </div>
  );
}
