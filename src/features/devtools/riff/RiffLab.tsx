"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FAMILIES, MODE_LIST, TONICS, degreeLabel, makeKeyContext } from "@/features/theory/theory";
import { playTimed } from "@/lib/chordKit/playback";
import { silence } from "@/features/sound";
import { Note } from "@tonaljs/tonal";
import { MAX_FRET, STRING_NAMES, asciiTab, degreeNear, inScale, midiOf, placeNear, placesOf, scaleStep, type RiffNote } from "./riff";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";

const STORE = "musickit.dev.riffs";
const OLD_STORE = "musickit.dev.riff";
const LENGTHS: { key: string; beats: number; label: string }[] = [
  { key: "s", beats: 0.25, label: "1/16" },
  { key: "e", beats: 0.5, label: "1/8" },
  { key: "q", beats: 1, label: "1/4" },
  { key: "h", beats: 2, label: "1/2" },
  { key: "w", beats: 4, label: "1" },
];

interface Saved { id: string; name: string; tonic: number; mode: number; notes: RiffNote[]; bpm: number; pos: number }
interface Library { riffs: Saved[]; cur: string }
const newId = () => Math.random().toString(36).slice(2, 10);
const blank = (name: string): Saved => ({ id: newId(), name, tonic: 9, mode: MODE_LIST.findIndex((m) => m.name === "Minor"), notes: [], bpm: 90, pos: 5 });
const FIRST = blank("Riff 1");
const EMPTY_LIB: Library = { riffs: [FIRST], cur: FIRST.id };

/** The saved riffs; the single riff the first version kept is moved in once. */
const load = (): Library => {
  try {
    const lib = JSON.parse(localStorage.getItem(STORE) ?? "null") as Library | null;
    if (lib?.riffs?.length) return lib;
    const old = JSON.parse(localStorage.getItem(OLD_STORE) ?? "null");
    if (old?.notes) { const r = { ...blank("Riff 1"), ...old, id: newId(), name: "Riff 1" }; return { riffs: [r], cur: r.id }; }
  } catch { /* private window or bad JSON */ }
  return EMPTY_LIB;
};

const scaleName = (r: Saved) => `${TONICS.find((t) => t.pc === r.tonic)?.name ?? "?"} ${MODE_LIST[r.mode]?.name ?? "?"}`;
const riffJson = (r: Saved) => JSON.stringify(r.notes.map((n) => (n.string === null ? { rest: n.beats } : { string: 6 - n.string, fret: n.fret, beats: n.beats, note: Note.fromMidiSharps(midiOf(n)!) })));
/** One riff as Markdown: name, key and tempo, the tab, the JSON. */
const riffMarkdown = (r: Saved) => `## ${r.name}\n\n${scaleName(r)} · ${r.bpm} bpm · position ${r.pos}\n\n\`\`\`\n${asciiTab(r.notes)}\n\`\`\`\n\n\`\`\`json\n${riffJson(r)}\n\`\`\`\n`;

const SHORTCUTS: [string, string][] = [
  ["click neck", "add note (or replace the selected one)"],
  ["1–7", "add that scale degree, nearest the last note"],
  ["← →", "select previous / next note"],
  ["↑ ↓", "selected note one scale step up / down"],
  ["⇧↑ ⇧↓", "an octave up / down"],
  ["⌥↑ ⌥↓", "same pitch on the next string up / down"],
  ["s e q h w", "length 1/16 · 1/8 · 1/4 · 1/2 · whole"],
  [".", "dotted (×1.5)"],
  ["r", "add a rest"],
  ["d", "duplicate selected"],
  ["⌫", "delete selected"],
  ["Esc", "deselect (clicks append)"],
  ["space", "play / stop"],
  ["⌘Z", "undo"],
];

export default function RiffLab() {
  const [lib, setLib] = useState<Library>(EMPTY_LIB);
  const state = lib.riffs.find((r) => r.id === lib.cur) ?? lib.riffs[0];
  const setState = useCallback((fn: (s: Saved) => Saved) => setLib((l) => ({ ...l, riffs: l.riffs.map((r) => (r.id === l.cur ? fn(r) : r)) })), []);
  const [sel, setSel] = useState<number | null>(null);
  const [len, setLen] = useState(0.5);
  const [copied, setCopied] = useState("");
  const history = useRef<RiffNote[][]>([]);
  const loaded = useRef(false);

  // read the saved riff after hydration, so the server render and the first client render match
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setLib(load()); loaded.current = true; }, []);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(STORE, JSON.stringify(lib)); } catch { /* private window */ } }, [lib]);

  const mode = MODE_LIST[state.mode] ?? MODE_LIST[0];
  const ctx = useMemo(() => makeKeyContext(state.tonic, FAMILIES.indexOf(mode.family), mode.k), [state.tonic, mode]);
  const { notes } = state;

  const setNotes = useCallback((fn: (n: RiffNote[]) => RiffNote[]) => {
    setState((s) => { history.current.push(s.notes); return { ...s, notes: fn(s.notes) }; });
  }, []);

  const lastMidi = useCallback((before: number) => {
    for (let i = before - 1; i >= 0; i--) { const m = midiOf(notes[i]); if (m !== null) return m; }
    return OPEN_MIDI[3] + state.pos; // the G string at the hand position
  }, [notes, state.pos]);

  const put = useCallback((n: RiffNote) => {
    if (sel !== null) setNotes((ns) => ns.map((x, i) => (i === sel ? { ...n, beats: x.beats } : x)));
    else setNotes((ns) => [...ns, n]);
  }, [sel, setNotes]);

  const moveSel = useCallback((midiFn: (m: number) => number, keepString = false) => {
    if (sel === null) return;
    const n = notes[sel];
    const m = midiOf(n);
    if (m === null) return;
    const to = midiFn(m);
    const same = keepString && n.string !== null ? to - OPEN_MIDI[n.string] : -1;
    const place = same >= 0 && same <= MAX_FRET ? { string: n.string!, fret: same } : placeNear(to, n.fret ?? state.pos);
    if (place) setNotes((ns) => ns.map((x, i) => (i === sel ? { ...x, ...place } : x)));
  }, [sel, notes, setNotes, state.pos]);

  const play = useCallback(() => {
    const beatMs = 60000 / state.bpm;
    playTimed(notes.map((n) => ({ midi: midiOf(n) ?? 0, ms: n.beats * beatMs, velocity: midiOf(n) === null ? 0 : undefined })), "riff-lab");
  }, [notes, state.bpm]);

  const hear = (midi: number) => playTimed([{ midi, ms: 400 }]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const k = e.key;
      if ((e.metaKey || e.ctrlKey) && k === "z") {
        const prev = history.current.pop();
        if (prev) setState((s) => ({ ...s, notes: prev }));
        e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey) return;
      const sn = sel === null ? null : notes[sel];
      if (k === "ArrowLeft") setSel((s) => (notes.length ? Math.max(0, (s ?? notes.length) - 1) : null));
      else if (k === "ArrowRight") setSel((s) => (s === null ? null : s + 1 >= notes.length ? null : s + 1));
      else if (k === "ArrowUp" || k === "ArrowDown") {
        const dir = k === "ArrowUp" ? 1 : -1;
        if (e.altKey && sn?.string != null) {
          const m = midiOf(sn)!;
          const opt = placesOf(m).find((p) => p.string === sn.string! + dir);
          if (opt) setNotes((ns) => ns.map((x, i) => (i === sel ? { ...x, ...opt } : x)));
        } else if (e.shiftKey) moveSel((m) => m + 12 * dir, true);
        else moveSel((m) => scaleStep(ctx, m, dir as 1 | -1));
      } else if (/^[1-7]$/.test(k)) {
        const ref = sel !== null ? midiOf(notes[sel]) ?? lastMidi(sel) : lastMidi(notes.length);
        const m = degreeNear(ctx, Number(k) - 1, ref);
        const p = placeNear(m, sn?.fret ?? notes.findLast((n) => n.fret !== null)?.fret ?? state.pos);
        if (p) { setNotes((ns) => [...ns, { ...p, beats: len }]); setSel(null); hear(m); }
      } else if (LENGTHS.some((l) => l.key === k)) {
        const b = LENGTHS.find((l) => l.key === k)!.beats;
        setLen(b);
        if (sel !== null) setNotes((ns) => ns.map((x, i) => (i === sel ? { ...x, beats: b } : x)));
      } else if (k === ".") {
        if (sel !== null) setNotes((ns) => ns.map((x, i) => (i === sel ? { ...x, beats: x.beats * 1.5 } : x)));
        else setLen((l) => l * 1.5);
      } else if (k === "r") setNotes((ns) => [...ns, { string: null, fret: null, beats: len }]);
      else if (k === "d" && sn) { setNotes((ns) => [...ns.slice(0, sel! + 1), { ...sn }, ...ns.slice(sel! + 1)]); setSel(sel! + 1); }
      else if ((k === "Backspace" || k === "Delete") && (sel !== null || notes.length)) {
        const i = sel ?? notes.length - 1;
        setNotes((ns) => ns.filter((_, j) => j !== i));
        setSel(sel === null ? null : notes.length > 1 ? Math.min(sel, notes.length - 2) : null);
      } else if (k === "Escape") setSel(null);
      else if (k === " ") play();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, notes, ctx, len, lastMidi, moveSel, play, setNotes, state.pos]);

  // replay the selected note when it changes pitch
  const selMidi = sel === null ? null : midiOf(notes[sel] ?? { string: null, fret: null, beats: 0 });
  const lastHeard = useRef<number | null>(null);
  useEffect(() => { if (selMidi !== null && selMidi !== lastHeard.current) hear(selMidi); lastHeard.current = selMidi; }, [selMidi]);

  const total = notes.reduce((a, n) => a + n.beats, 0);
  const json = riffJson(state);
  const pick = (id: string) => { history.current = []; setSel(null); setLib((l) => ({ ...l, cur: id })); };
  const add = () => { const r = { ...blank(`Riff ${lib.riffs.length + 1}`), tonic: state.tonic, mode: state.mode, bpm: state.bpm, pos: state.pos }; history.current = []; setSel(null); setLib((l) => ({ riffs: [...l.riffs, r], cur: r.id })); };
  const remove = (id: string) => setLib((l) => { const riffs = l.riffs.filter((r) => r.id !== id); if (!riffs.length) return EMPTY_LIB; return { riffs, cur: l.cur === id ? riffs[0].id : l.cur }; });
  const copy = (what: string, text: string) => { navigator.clipboard.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(""), 1200); }, () => setCopied("Copy failed")); };

  const sn = sel === null ? null : notes[sel];
  const alts = sn && midiOf(sn) !== null ? placesOf(midiOf(sn)!) : [];
  const CELL = 34;

  return (
    <div className="flex flex-col gap-5 text-slate-200 lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-2 lg:w-56">
        <div className="flex gap-2">
          <button onClick={add} className="rounded bg-slate-800 px-3 py-1 text-sm">New riff</button>
          <button onClick={() => copy("All riffs", lib.riffs.map(riffMarkdown).join("\n"))} className="rounded bg-slate-800 px-3 py-1 text-sm">Copy all</button>
        </div>
        <ul className="flex flex-col gap-1">
          {lib.riffs.map((r) => (
            <li key={r.id} className={`group flex items-center gap-1 rounded px-2 py-1 text-sm ${r.id === state.id ? "bg-sky-900/50" : "hover:bg-slate-800"}`}>
              <button onClick={() => pick(r.id)} className="flex-1 text-left">
                <span className="block">{r.name}</span>
                <span className="block text-xs text-slate-500">{scaleName(r)} · {r.notes.length} notes</span>
              </button>
              <button onClick={() => copy(r.name, riffMarkdown(r))} title="Copy this riff" className="text-xs text-slate-500 hover:text-slate-200">copy</button>
              <button onClick={() => remove(r.id)} title="Delete this riff" className="text-xs text-slate-500 hover:text-rose-400">✕</button>
            </li>
          ))}
        </ul>
      </aside>
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <input aria-label="Riff name" value={state.name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} className="rounded bg-transparent text-lg font-semibold outline-none focus:bg-slate-900" />
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col text-xs text-slate-400">Key
          <select className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100" value={state.tonic} onChange={(e) => setState((s) => ({ ...s, tonic: Number(e.target.value) }))}>
            {TONICS.map((t) => <option key={t.pc} value={t.pc}>{t.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs text-slate-400">Scale
          <select className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100" value={state.mode} onChange={(e) => setState((s) => ({ ...s, mode: Number(e.target.value) }))}>
            {MODE_LIST.map((m, i) => <option key={i} value={i}>{m.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs text-slate-400">Position (fret)
          <input type="number" min={0} max={MAX_FRET - 4} className="w-20 rounded bg-slate-800 px-2 py-1 text-sm" value={state.pos} onChange={(e) => setState((s) => ({ ...s, pos: Number(e.target.value) }))} />
        </label>
        <label className="flex flex-col text-xs text-slate-400">BPM
          <input type="number" min={30} max={240} className="w-20 rounded bg-slate-800 px-2 py-1 text-sm" value={state.bpm} onChange={(e) => setState((s) => ({ ...s, bpm: Number(e.target.value) }))} />
        </label>
        <div className="flex gap-1">
          {LENGTHS.map((l) => (
            <button key={l.key} onClick={() => setLen(l.beats)} className={`rounded px-2 py-1 text-sm ${len === l.beats ? "bg-sky-600 text-white" : "bg-slate-800"}`}>{l.label}</button>
          ))}
        </div>
        <button onClick={play} className="rounded bg-emerald-700 px-3 py-1 text-sm">Play</button>
        <button onClick={() => silence()} className="rounded bg-slate-700 px-3 py-1 text-sm">Stop</button>
        <button onClick={() => { setNotes(() => []); setSel(null); }} className="rounded bg-rose-900 px-3 py-1 text-sm">Clear</button>
        <span className="text-sm text-slate-400">{ctx.names.join(" ")} · {notes.length} notes · {total} beats</span>
      </div>

      {/* neck */}
      <div className="overflow-x-auto">
        <svg width={(MAX_FRET + 1) * CELL + 30} height={6 * 26 + 24} className="font-mono">
          {[3, 5, 7, 9, 12, 15, 17].map((f) => <text key={f} x={30 + f * CELL + CELL / 2} y={6 * 26 + 18} textAnchor="middle" fontSize={10} fill="var(--color-slate-500)">{f}</text>)}
          <rect x={30 + state.pos * CELL} y={0} width={5 * CELL} height={6 * 26} fill="var(--color-sky-500)" opacity={0.08} />
          {[5, 4, 3, 2, 1, 0].map((s, row) => (
            <g key={s}>
              <text x={4} y={row * 26 + 13} dominantBaseline="central" fontSize={11} fill="var(--color-slate-500)">{STRING_NAMES[s]}</text>
              <line x1={30} x2={30 + (MAX_FRET + 1) * CELL} y1={row * 26 + 13} y2={row * 26 + 13} stroke="var(--color-slate-700)" />
              {Array.from({ length: MAX_FRET + 1 }, (_, f) => {
                const midi = OPEN_MIDI[s] + f;
                const sc = inScale(ctx, midi);
                const root = (midi - ctx.tonic.pc + 120) % 12 === 0;
                const isSel = sn?.string === s && sn.fret === f;
                const isAlt = alts.some((a) => a.string === s && a.fret === f);
                return (
                  <g key={f} className="cursor-pointer" onClick={() => { put({ string: s, fret: f, beats: len }); hear(midi); }}>
                    <rect x={30 + f * CELL} y={row * 26} width={CELL} height={26} fill="transparent" />
                    {sc && <circle cx={30 + f * CELL + CELL / 2} cy={row * 26 + 13} r={10} fill={isSel ? "var(--color-sky-500)" : root ? "var(--color-amber-700)" : "var(--color-slate-700)"} stroke={isAlt ? "var(--color-sky-400)" : "none"} strokeWidth={2} />}
                    {!sc && isSel && <circle cx={30 + f * CELL + CELL / 2} cy={row * 26 + 13} r={10} fill="var(--color-rose-600)" />}
                    {(sc || isSel) && <text x={30 + f * CELL + CELL / 2} y={row * 26 + 13} textAnchor="middle" dominantBaseline="central" fontSize={9} fill="white">{degreeLabel(midi % 12, ctx)}</text>}
                  </g>
                );
              })}
            </g>
          ))}
          {Array.from({ length: MAX_FRET + 2 }, (_, f) => <line key={f} x1={30 + f * CELL} x2={30 + f * CELL} y1={0} y2={6 * 26} stroke={f === 1 ? "var(--color-slate-400)" : "var(--color-slate-800)"} />)}
        </svg>
      </div>

      {/* tab */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3">
        <svg width={Math.max(300, 40 + total * 48 + 40)} height={6 * 18 + 40} className="font-mono">
          {[5, 4, 3, 2, 1, 0].map((s, row) => (
            <g key={s}>
              <text x={4} y={14 + row * 18} dominantBaseline="central" fontSize={11} fill="var(--color-slate-500)">{STRING_NAMES[s]}</text>
              <line x1={20} x2={40 + total * 48 + 20} y1={14 + row * 18} y2={14 + row * 18} stroke="var(--color-slate-700)" />
            </g>
          ))}
          {Array.from({ length: Math.floor(total / 4) + 1 }, (_, b) => <line key={b} x1={30 + b * 4 * 48} x2={30 + b * 4 * 48} y1={14} y2={14 + 5 * 18} stroke="var(--color-slate-500)" />)}
          {(() => {
            const starts = notes.map((_, i) => notes.slice(0, i).reduce((a, n) => a + n.beats, 0));
            return notes.map((n, i) => {
              const x = 40 + starts[i] * 48 + 6;
              const isSel = i === sel;
              const y = n.string === null ? 14 + 2.5 * 18 : 14 + (5 - n.string) * 18;
              return (
                <g key={i} className="cursor-pointer" onClick={() => setSel(isSel ? null : i)}>
                  <rect x={x - 10} y={0} width={20} height={6 * 18 + 30} fill={isSel ? "var(--color-sky-500)" : "transparent"} opacity={0.15} />
                  <rect x={x - 9} y={y - 8} width={18} height={16} rx={3} fill="var(--color-slate-950)" />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} fill={isSel ? "var(--color-sky-300)" : n.string === null ? "var(--color-slate-500)" : "var(--color-slate-100)"}>{n.fret ?? "𝄽"}</text>
                  <text x={x} y={6 * 18 + 24} textAnchor="middle" fontSize={9} fill="var(--color-slate-500)">{midiOf(n) === null ? "" : `${Note.pitchClass(Note.fromMidiSharps(midiOf(n)!))}·${degreeLabel(midiOf(n)! % 12, ctx)}`}</text>
                </g>
              );
            });
          })()}
        </svg>
      </div>

      {/* note switcher */}
      {sn && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-800/50 bg-slate-900 p-3 text-sm">
          <span className="text-slate-400">Note {sel! + 1}:</span>
          {midiOf(sn) !== null && <span className="font-semibold">{Note.fromMidiSharps(midiOf(sn)!)} ({degreeLabel(midiOf(sn)! % 12, ctx)})</span>}
          <span className="text-slate-500">at</span>
          {alts.map((a) => (
            <button key={a.string} onClick={() => setNotes((ns) => ns.map((x, i) => (i === sel ? { ...x, ...a } : x)))}
              className={`rounded px-2 py-0.5 ${a.string === sn.string ? "bg-sky-600 text-white" : "bg-slate-800 hover:bg-slate-700"}`}>
              {STRING_NAMES[a.string]}{a.string === 5 ? "" : ""} fret {a.fret}
            </button>
          ))}
          <span className="ml-2 text-slate-500">swap to</span>
          {ctx.names.map((nm, d) => (
            <button key={d} onClick={() => { const m = degreeNear(ctx, d, midiOf(sn) ?? lastMidi(sel!)); const p = placeNear(m, sn.fret ?? state.pos); if (p) setNotes((ns) => ns.map((x, i) => (i === sel ? { ...x, ...p } : x))); }}
              className="rounded bg-slate-800 px-2 py-0.5 hover:bg-slate-700">{nm}</button>
          ))}
          <span className="ml-2 text-slate-500">length</span>
          {LENGTHS.map((l) => (
            <button key={l.key} onClick={() => setNotes((ns) => ns.map((x, i) => (i === sel ? { ...x, beats: l.beats } : x)))}
              className={`rounded px-2 py-0.5 ${sn.beats === l.beats ? "bg-sky-600 text-white" : "bg-slate-800"}`}>{l.label}</button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={() => copy("JSON", json)} className="rounded bg-slate-800 px-3 py-1 text-sm">Copy JSON</button>
            <button onClick={() => copy("Tab", asciiTab(notes))} className="rounded bg-slate-800 px-3 py-1 text-sm">Copy tab</button>
            {copied && <span className="text-sm text-emerald-400">{copied === "Copy failed" ? copied : `${copied} copied`}</span>}
          </div>
          <pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">{asciiTab(notes)}</pre>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-slate-950 p-3 text-xs text-slate-500">{json}</pre>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 self-start rounded-lg border border-slate-800 p-3 text-xs">
          {SHORTCUTS.map(([k, v]) => <div key={k} className="contents"><dt className="font-mono text-sky-300">{k}</dt><dd className="text-slate-400">{v}</dd></div>)}
        </dl>
      </div>
    </div>
    </div>
  );
}
