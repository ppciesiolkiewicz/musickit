"use client";

import type { Shape } from "@/lib/chordKit/shapes";
import { toneColourIndex, toneLabel } from "@/features/theory/labels";
import type { KeyContext } from "@/features/theory/theory";
import { useChordLabels } from "@/features/theory/useLabelSystem";
import { InfoTip } from "@/components/ui";
import Icon from "@/components/Icon";
import { diagramLowFret, intervalLabel, OPEN_NOTE, OPEN_PITCH, ROOT_INDEX } from "@/lib/chordKit/shapeTools";
import { boxRowFactor } from "./Fretboard";
import { useHeardNote } from "./heardNote";
import { swatchForIndex } from "./palette";

/** the ring on a note the microphone hears, the same blue as a playing note on the neck */
const HEARD = "#38bdf8";

interface Props {
  shape: Shape;
  /** fret where the root note sits */
  rootFret: number;
  /** called when the diagram is clicked (e.g. to strum it) */
  onPlay?: () => void;
  active?: boolean;
  /** the key the chord is played in, so degrees and intervals count from its tonic */
  ctx?: KeyContext;
  /** how to spell the root ("A♭"), when the caller knows it */
  rootName?: string;
}

/**
 * The one chord box: six strings, frets, and one dot per sounding string labelled with its interval.
 * Clicking it or its play button strums it; the chord-tones / in-the-key switch under it is shared by every chord box.
 */
export default function ChordDiagram({ shape, rootFret, onPlay, active, ctx, rootName }: Props) {
  const [mode, setMode] = useChordLabels();
  // the note the microphone hears, ringed on every string that plays it
  const heard = useHeardNote();
  // chord boxes always show intervals; without a key there is only the chord root to count from
  const system = "interval";
  const from = mode === "key" && ctx ? "scale" : "chord";
  const ss = 18, fsz = 24, left = 36, top = 26;
  const ri = ROOT_INDEX[shape.rs];
  const rootPc = (OPEN_NOTE[ri] + rootFret) % 12;
  const abs = shape.f.map((v) => (v === null ? null : rootFret + v));
  // open strings (fret 0) sit above the nut, so only fretted notes set the size of the box
  const fretted = abs.filter((v): v is number => v !== null && v > 0);
  // any open string pins the box to the nut, so open chords never read as a shape up the neck
  const lo = diagramLowFret(abs);
  const hi = fretted.length ? Math.max(...fretted) : 1;
  const rows = Math.max(4, hi - lo + 1);
  const w = left + 5 * ss + 18;
  // frets get closer together down the diagram, like the real neck, starting tall wherever the box sits
  const rowH = (i: number) => (fsz * boxRowFactor(i)) / 1.2;
  const edge = (i: number) => Array.from({ length: i }, (_, k) => rowH(k)).reduce((a, b) => a + b, 0);
  const h = top + edge(rows) + 10;
  const grid = "var(--color-slate-500)";

  const svg = (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Chord diagram">
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line key={`f${i}`} x1={left} x2={left + 5 * ss} y1={top + edge(i)} y2={top + edge(i)} stroke={grid} strokeWidth={i === 0 && lo === 1 ? 3 : 1} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={`s${i}`} x1={left + i * ss} x2={left + i * ss} y1={top} y2={top + edge(rows)} stroke={grid} strokeWidth={1 + (5 - i) * 0.12} />
      ))}
      {lo > 1 && (
        <text x={left - 10} y={top + rowH(0) / 2} textAnchor="end" dominantBaseline="central" fontSize={11} fill="var(--color-slate-400)">
          {lo}fr
        </text>
      )}
      {abs.map((a, i) => {
        const x = left + i * ss;
        if (a === null)
          return (
            <text key={i} x={x} y={top - 10} textAnchor="middle" dominantBaseline="central" fontSize={12} fill={grid}>
              ×
            </text>
          );
        const semi = (((OPEN_PITCH[i] + (shape.f[i] as number) - OPEN_PITCH[ri]) % 12) + 12) % 12;
        const role = intervalLabel(shape, semi);
        const tone = { rootPc, rootName, semi, role, ctx };
        const label = toneLabel(system, tone, from);
        const sw = swatchForIndex(toneColourIndex(tone, from));
        const y = a === 0 ? top - 12 : top + edge(a - lo) + rowH(a - lo) / 2;
        const lit = heard === (OPEN_NOTE[i] + a) % 12;
        // open strings: a small ring above the nut, like the usual "o", so they never crowd each other
        if (a === 0)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={7} fill="var(--color-slate-950)" stroke={lit ? HEARD : sw.fill} strokeWidth={lit ? 3 : 1.6} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={sw.fill} fontSize={label.length > 2 ? 6 : 7.5} fontWeight={700}>
                {label}
              </text>
            </g>
          );
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={lit ? 10.5 : 9} fill={sw.fill} stroke={lit ? HEARD : sw.line} strokeWidth={lit ? 3 : 1.2} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={sw.text} fontSize={label.length > 2 ? 8 : 10} fontWeight={600}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );

  const seg = (on: boolean) => `px-1.5 py-0.5 transition ${on ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"}`;
  return (
    <div className="flex flex-col items-center gap-1">
      {onPlay ? (
        <button
          type="button"
          onClick={onPlay}
          title="Click to hear it"
          className={`cursor-sound block w-full rounded-lg p-2 transition hover:bg-slate-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${active ? "bg-slate-800/80 ring-1 ring-sky-400" : ""}`}
        >
          {svg}
        </button>
      ) : svg}
      {(onPlay || ctx) && (
        <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1.5">
          {onPlay && (
            <button
              type="button"
              onClick={onPlay}
              aria-label="Play this chord"
              className={`cursor-sound inline-flex h-6 shrink-0 items-center gap-1 rounded-full border pl-2 pr-2.5 text-[11px] font-medium transition ${active ? "border-emerald-400 bg-emerald-500/30 text-emerald-50" : "border-emerald-500/70 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/25"}`}
            >
              <Icon name="play" size={10} fill />
              Play
            </button>
          )}
          {ctx && (
            <>
              <span role="group" aria-label="Count intervals from" className="flex h-6 overflow-hidden rounded-md border border-slate-700 text-[10px]">
                <button type="button" aria-pressed={mode === "chord"} onClick={() => setMode("chord")} className={seg(mode === "chord")}>Chord</button>
                <button type="button" aria-pressed={mode === "key"} onClick={() => setMode("key")} className={seg(mode === "key")}>Key</button>
              </span>
              <InfoTip label="What do Chord and Key mean?">
                <p><b>Chord</b> counts each note from the chord&apos;s own root: R, b3, p5, b7. It shows what the chord is made of.</p>
                <p><b>Key</b> counts from the key&apos;s first note instead, so you see where the chord sits in the scale: the V chord in C reads p5, 7, 2, p4.</p>
                <p>One switch for every chord box in the app.</p>
              </InfoTip>
            </>
          )}
        </div>
      )}
    </div>
  );
}
