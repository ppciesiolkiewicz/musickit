"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChordDiagram from "./ChordDiagram";
import NeckDiagram from "./NeckDiagram";
import { Chip, ChipRow, Info } from "./ui";
import { DIFF_CLASS, HUES } from "./palette";
import {
  PROG_LIST, NECK_HUES, NOTE_FROM_E, chordInstances, firstShapeFor, intervalText, nearestMoves, progressionSteps, resolveProgression,
  type ProgChord, type ResolvedProgression,
} from "@/lib/chordKit/progressions";
import { RICH_SHAPES, STRING_NAMES, STRING_ORDER, STRING_SHORT, rootFretFor } from "@/lib/chordKit/shapeTools";
import { strumShape, silence } from "@/lib/chordKit/playback";

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

/** Progressions in modes, as an accordion. Open one to see the form, shapes to use and neck positions. */
export default function ProgressionsTab() {
  const resolved = useMemo(() => PROG_LIST.map(resolveProgression), []);
  const [sel, setSel] = useState(0);
  const groups: { heading: string; sub: string; idx: number[] }[] = [];
  resolved.forEach((D, i) => {
    const last = groups[groups.length - 1];
    if (last && last.heading === D.modeName) last.idx.push(i);
    else groups.push({ heading: D.modeName, sub: D.sub, idx: [i] });
  });

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.heading + g.idx[0]} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-slate-200">{g.heading} <span className="font-normal text-slate-500">· {g.sub}</span></h3>
          {g.idx.map((i) => {
            const D = resolved[i];
            const on = sel === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setSel(on ? -1 : i)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${on ? "border-sky-500/60 bg-slate-900" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"}`}
                >
                  <div className="flex items-center gap-2 text-sm text-slate-100">
                    <span>{D.prog.title}</span>
                    <span className={`ml-auto transition-transform ${on ? "rotate-90" : ""}`} aria-hidden>▸</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-slate-400">
                    {D.sections.map((sc, si) => (
                      <span key={si} className="inline-flex flex-wrap items-center gap-x-1">
                        {si > 0 && <span className="px-1 text-slate-600">|</span>}
                        {sc.chords.map((c, ci) => (
                          <span key={ci}>{ci > 0 && <span className="px-0.5 text-slate-600">→</span>}{c.name}{c.x > 1 && <small className="text-slate-500">×{c.x}</small>}</span>
                        ))}
                      </span>
                    ))}
                  </div>
                </button>
                {on && <Detail D={D} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Detail({ D }: { D: ResolvedProgression }) {
  const [off, setOff] = useState<string[]>(() => D.uniq.filter((u) => !D.loopKeys.has(u.key)).map((u) => u.key));
  const [focus, setFocus] = useState<number | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(80);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); silence(); }, []);

  const on = D.uniq.filter((u) => !off.includes(u.key));
  const toggle = (k: string) => setOff((o) => (o.includes(k) ? o.filter((x) => x !== k) : D.uniq.length - o.length > 1 ? [...o, k] : o));

  const playChord = (c: ProgChord) => {
    const sh = firstShapeFor(c);
    if (!sh) return;
    strumShape(sh, rootFretFor(sh, c.rootPc), { gapMs: 40, holdMs: 900 });
    setPlayingKey(c.key);
  };

  const playForm = () => {
    if (playing) {
      if (timer.current) clearTimeout(timer.current);
      silence();
      setPlaying(false);
      setPlayingKey(null);
      return;
    }
    // play only the sections that loop, repeating each chord x times
    const seq = D.sections.filter((s) => s.loop).flatMap((s) => s.chords.flatMap((c) => Array.from({ length: c.x }, () => c)));
    const beat = (60 / bpm) * 2 * 1000; // one chord = two beats
    setPlaying(true);
    let i = 0;
    const step = () => {
      if (i >= seq.length) {
        setPlaying(false);
        setPlayingKey(null);
        return;
      }
      playChord(seq[i++]);
      timer.current = setTimeout(step, beat);
    };
    step();
  };

  const stepsAll = progressionSteps(D).filter(([a, b]) => on.includes(D.uniq[a]) && on.includes(D.uniq[b]));

  return (
    <div className="mt-2 flex flex-col gap-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div>
        <h2 className="text-base font-medium text-slate-100">{D.modeName}: {D.prog.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{D.prog.blurb}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={playForm} className={`rounded-full border px-4 py-1.5 text-xs font-medium ${playing ? "border-rose-400 bg-rose-500/20 text-rose-100" : "border-emerald-500 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"}`}>
          {playing ? "■ Stop" : "▶ Play the main form"}
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Tempo<Info label="About tempo">Each chord lasts two beats at this speed. Only the main sections play; side trips are skipped. Chords marked ×2 repeat.</Info>
          <input type="range" min={50} max={140} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="accent-sky-400" />
          <span className="w-14 tabular-nums">{bpm} bpm</span>
        </label>
      </div>

      <ChipRow label="Show on neck" info="Choose which chords are drawn in the neck diagrams below. Side-trip chords start off so the pictures stay readable. At least one chord must stay on.">
        {D.uniq.map((u, i) => (
          <Chip key={u.key} on={!off.includes(u.key)} onClick={() => toggle(u.key)}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: HUES[NECK_HUES[i % 4]].hub }} />
            {u.roman} {u.name}
          </Chip>
        ))}
      </ChipRow>
      {D.hasSections && off.length > 0 && <p className="-mt-3 text-xs text-slate-500">Side-trip chords start switched off so the neck diagrams stay clear. Tap them to add them.</p>}

      {D.hasSections && (
        <div>
          <h3 className="mb-1 text-sm font-medium text-slate-200">The form</h3>
          <p className="mb-3 text-xs text-slate-400">Sections in the order you play them. Tap a chord to hear it. Sections marked side trip are optional detours: play them as long as you like, then come back to the main tune.</p>
          <div className="flex flex-col gap-3">
            {D.sections.map((sc, si) => (
              <div key={si} className={`rounded-xl border p-3 ${sc.loop ? "border-slate-800" : "border-dashed border-violet-500/40"}`}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs">{String.fromCharCode(65 + si)}</span>
                  <b className="text-slate-100">{sc.name}</b>
                  {!sc.loop && <span className="rounded-full border border-violet-500/40 px-2 text-[11px] text-violet-300">side trip</span>}
                </div>
                {sc.note && <p className="mt-1 text-xs text-slate-400">{sc.note}</p>}
                <div className="mt-2 flex flex-wrap items-start gap-2">
                  {sc.chords.map((c, ci) => {
                    const sh = firstShapeFor(c);
                    const r = sh ? rootFretFor(sh, c.rootPc) : 0;
                    return (
                      <div key={ci} className="flex items-center gap-2">
                        {ci > 0 && <span className="text-slate-600">→</span>}
                        <div className="w-24 text-center">
                          <div className="text-sm font-medium text-slate-100">{c.name}{c.x > 1 && <span className="ml-1 text-xs text-slate-500">×{c.x}</span>}</div>
                          <div className="text-[11px] text-slate-500">{c.roman}{sh?.v ? ` · ${sh.v}` : ""}</div>
                          {sh ? <ChordDiagram shape={sh} rootFret={r} onPlay={() => playChord(c)} active={playingKey === c.key} /> : <div className="py-6 text-xs text-slate-600">no shape</div>}
                          {sh && <div className="text-[11px] text-slate-500">{STRING_SHORT[sh.rs]} string · fret {r}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-1 text-sm font-medium text-slate-200">Shapes to use</h3>
        <p className="mb-3 text-xs text-slate-400">Every movable shape for each chord, easiest first, already placed at the right fret. The starred one is the voicing this progression asks for.</p>
        <div className="flex flex-col gap-4">
          {on.map((u) => {
            const ci = D.uniq.indexOf(u);
            const list = RICH_SHAPES.filter((x) => x.suf === u.suf && (u.tri ? x.ext === "triad" : x.ext !== "triad")).sort(
              (a, b) => Number(b.v === u.v && !!u.v) - Number(a.v === u.v && !!u.v) || DIFF_ORDER[a.diff] - DIFF_ORDER[b.diff] || STRING_ORDER.indexOf(a.rs) - STRING_ORDER.indexOf(b.rs),
            );
            return (
              <div key={u.key}>
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: HUES[NECK_HUES[ci % 4]].hub }} />
                  <b className="text-slate-100">{u.name}</b>
                  <span className="text-xs text-slate-500">{u.roman} · {list.length} shape{list.length === 1 ? "" : "s"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {list.length ? list.map((sh) => {
                    const r = rootFretFor(sh, u.rootPc);
                    const pick = !!u.v && sh.v === u.v;
                    return (
                      <div key={sh.id} className={`rounded-lg border p-2 ${pick ? "border-sky-500/70" : "border-slate-800"}`}>
                        <div className="mb-1 flex items-center gap-1.5 text-[11px]">
                          <span className={`rounded-full border px-1.5 ${DIFF_CLASS[sh.diff]}`}>{sh.diff}</span>
                          {sh.v && <span className="text-slate-400">{sh.v}{pick ? " ★" : ""}</span>}
                        </div>
                        <ChordDiagram shape={sh} rootFret={r} onPlay={() => strumShape(sh, r)} />
                        <div className="text-[11px] text-slate-500">{STRING_SHORT[sh.rs]} string root · fret {r}</div>
                      </div>
                    );
                  }) : <p className="col-span-full text-xs text-slate-500">No movable shape for this chord yet.</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <NeckViews D={D} on={on} stepsAll={stepsAll} focus={focus} setFocus={setFocus} />
    </div>
  );
}

function NeckViews({ D, on, stepsAll, focus, setFocus }: { D: ResolvedProgression; on: ProgChord[]; stepsAll: [number, number][]; focus: number | null; setFocus: (n: number | null) => void }) {
  const cards = STRING_ORDER.map((rs) => {
    const inst = on.map((u) => chordInstances(u, D.uniq.indexOf(u), rs));
    if (!inst.length || inst.some((x) => !x)) return null;
    const lists = inst as NonNullable<(typeof inst)[number]>[];
    const pos = on.map((u) => D.uniq.indexOf(u));
    const moves = nearestMoves(stepsAll, lists, (uniqIdx) => pos.indexOf(uniqIdx));
    return { rs, lists, moves };
  }).filter((x): x is NonNullable<typeof x> => !!x);

  const nameOf = (pcs: number[], rootPitch: number) =>
    pcs.slice().sort((a, b) => ((a - (rootPitch % 12) + 12) % 12) - ((b - (rootPitch % 12) + 12) % 12)).map((pc) => NOTE_FROM_E[pc]).join(" · ");

  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-slate-200">On the neck</h3>
      <p className="mb-3 text-xs text-slate-400">The whole neck, frets 0 to 17. Every position of each chord is drawn, and the lanes underneath show the shortest move between chords. Tap a chord to focus it.</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {on.map((u) => {
          const ci = D.uniq.indexOf(u);
          return <Chip key={u.key} on={focus === ci} onClick={() => setFocus(focus === ci ? null : ci)}>{u.name}</Chip>;
        })}
      </div>
      {cards.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No single string group has a shape for every selected chord. Deselect a chord to see more positions.</p>}
      <div className="flex flex-col gap-4">
        {cards.map(({ rs, lists, moves }) => (
          <div key={rs} className="rounded-xl border border-slate-800 p-3">
            <h4 className="mb-2 text-sm font-medium text-slate-200">Root on the {STRING_NAMES[rs]}</h4>
            <NeckDiagram title={`${D.prog.title}, root on the ${STRING_NAMES[rs]}`} specs={lists.flat()} moves={moves} scalePcs={D.scalePcs} focus={focus} />
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {lists.map((l) => (
                <li key={l[0].chord.key}><b className="text-slate-200">{l[0].chord.name}</b> ({nameOf(l[0].pcs, l[0].rootPitch)}): root at fret {l.map((s) => s.rootFret).join(" and ")}</li>
              ))}
              {moves.map((m, i) => (
                <li key={i}><b className="text-slate-200">{m.from.chord.name} → {m.to.chord.name}</b> (frets {m.from.rootFret} → {m.to.rootFret}): root {intervalText(m.rootDiff)}; shared notes: {m.shared.length ? m.shared.map((pc) => NOTE_FROM_E[pc]).join(" · ") : "none, every note moves"}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
