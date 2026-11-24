"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FAMILIES, MODE_LIST, TONICS, degreeLabel, makeKeyContext } from "@/features/theory/theory";
import { playSequence } from "@/features/sound";
import { createCloud, getModelLibrary, type CloudModel } from "@/features/nam";
import { playerFor, setAmpModel, type RiffSound } from "./sound";
import RiffTake from "./RiffTake";
import { deleteTake } from "./takes";
import { Note } from "@tonaljs/tonal";
import { MAX_FRET, STRING_NAMES, SHAPES, asciiTab, columnsOf, shapeAt, degreeNear, inScale, midiOf, placeNear, placesOf, riffTimeline, scaleStep, type RiffNote } from "./riff";
import { PlayAlongTimeline } from "@/features/exercises/play-along/PlayAlong";
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

/** A dotted length is one and a half times a plain one. */
const isDotted = (beats: number) => LENGTHS.some((l) => l.beats * 1.5 === beats);
/** Add a dot to a length, or take it off a dotted one. */
const toggleDot = (beats: number) => (isDotted(beats) ? beats / 1.5 : beats * 1.5);

interface Saved { id: string; name: string; tonic: number; mode: number; notes: RiffNote[]; bpm: number; pos: number; /** the sound it plays with, and the NAM model (an id in this browser's library, 0 none) */ sound?: RiffSound; model?: number }
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
  // a copy, so the first riff is saved with its id: its take is kept under it
  return { ...EMPTY_LIB };
};

const scaleName = (r: Saved) => `${TONICS.find((t) => t.pc === r.tonic)?.name ?? "?"} ${MODE_LIST[r.mode]?.name ?? "?"}`;
const cell = (n: RiffNote) => ({ string: 6 - n.string!, fret: n.fret, note: Note.fromMidiSharps(midiOf(n)!), beats: n.beats });
/** One entry per time step: a rest, a note, or `frets` for notes played together, each with how long it rings; the step's `beats` is the time to the next step. Strings are guitar numbers, 6 the low E. */
const riffJson = (r: Saved) => JSON.stringify(columnsOf(r.notes).map((c) => {
  const ns = c.idx.map((i) => r.notes[i]).filter((n) => n.string !== null);
  if (!ns.length) return { rest: c.beats };
  return ns.length === 1 ? cell(ns[0]) : { frets: ns.map(cell), beats: c.beats };
}));
/** One riff as Markdown: name, key and tempo, the tab, the JSON. */
const riffMarkdown = (r: Saved) => `## ${r.name}\n\n${scaleName(r)} · ${r.bpm} bpm · position ${r.pos}\n\n\`\`\`\n${asciiTab(r.notes)}\n\`\`\`\n\n\`\`\`json\n${riffJson(r)}\n\`\`\`\n`;

const SHORTCUTS: [string, string][] = [
  ["click neck", "add a note to the step being built or the selected step"],
  ["click tab", "select a note: neck clicks then add to its step"],
  ["[ ]", "previous / next shape; click a root to place it"],
  ["space", "next step: notes until then sound together"],
  ["1–7", "add that scale degree, nearest the last note"],
  ["← →", "select previous / next note"],
  ["↑ ↓", "selected note one scale step up / down"],
  ["⇧↑ ⇧↓", "an octave up / down"],
  ["⌥↑ ⌥↓", "same pitch on the next string up / down"],
  ["s e q h w", "length 1/16 · 1/8 · 1/4 · 1/2 · whole: the selected or current step, and new notes"],
  ["⇧ s e q h w", "length of the selected note only"],
  [".", "add a dot (×1.5) or take it off: the selected or current step, and new notes"],
  ["⇧ .", "dot the selected note only"],
  ["r", "add a rest"],
  ["d", "duplicate selected"],
  ["⌫", "delete selected"],
  ["Esc", "deselect (clicks append)"],
  ["⌘Z", "undo"],
];

export default function RiffLab() {
  const [lib, setLib] = useState<Library>(EMPTY_LIB);
  const state = lib.riffs.find((r) => r.id === lib.cur) ?? lib.riffs[0];
  const setState = useCallback((fn: (s: Saved) => Saved) => setLib((l) => ({ ...l, riffs: l.riffs.map((r) => (r.id === l.cur ? fn(r) : r)) })), []);
  // each riff keeps its own sound and amp model
  const sound: RiffSound = state.sound ?? "piano";
  const model = state.model ?? 0;
  const setSound = useCallback((v: RiffSound) => setState((s) => ({ ...s, sound: v })), [setState]);
  const setModel = useCallback((v: number) => setState((s) => ({ ...s, model: v })), [setState]);
  const [sel, setSel] = useState<number | null>(null);
  const [len, setLen] = useState(0.5);
  const [copied, setCopied] = useState("");
  const [shapeIdx, setShapeIdx] = useState(0);
  const [notice, setNotice] = useState("");
  const [models, setModels] = useState<{ id: number; name: string }[]>([]);
  const [ampState, setAmpState] = useState("");
  const player = useCallback(() => playerFor(sound), [sound]);

  // the NAM models added in this browser (the looper's amp picker adds them too)
  useEffect(() => {
    const lib = getModelLibrary();
    const read = () => setModels(lib.list().map((m) => ({ id: m.id, name: m.name })));
    void lib.init().then(read);
    return lib.subscribe(read);
  }, []);
  useEffect(() => { if (sound === "amp") setAmpModel(model, setAmpState); }, [sound, model]);
  const [cloud, setCloud] = useState<CloudModel[]>([]);
  const [cloudError, setCloudError] = useState("");
  // the shared amp library on the server, read once the amp is chosen; a model is copied into this browser when picked
  useEffect(() => {
    if (sound !== "amp" || cloud.length || cloudError) return;
    void createCloud(getModelLibrary()).list().then((r) => ("models" in r ? setCloud(r.models) : setCloudError(r.error)));
  }, [sound, cloud.length, cloudError]);
  const [disk, setDisk] = useState<{ file: string; name: string }[]>([]);
  // the .nam files on this machine's disk (/api/dev/nam), read once the amp is chosen: what there is to pick where the amp library isn't set up
  useEffect(() => {
    if (sound !== "amp") return;
    let off = false;
    fetch("/api/dev/nam", { cache: "no-store", signal: AbortSignal.timeout(10000) })
      .then(async (res) => { if (!res.ok) throw new Error(`Models on this computer: ${res.status}`); return (await res.json()) as { models: { file: string; name: string }[] }; })
      .then((r) => { if (!off) setDisk(r.models); })
      .catch((e) => { if (!off) setNotice(e instanceof Error ? e.message : String(e)); });
    return () => { off = true; };
  }, [sound]);
  const pickDisk = async (file: string) => {
    const m = disk.find((d) => d.file === file);
    if (!m) return;
    const have = getModelLibrary().list().find((r) => r.name === m.name);
    if (have) { setModel(have.id); return; }
    setAmpState("loading");
    try {
      const res = await fetch(`/api/dev/nam?file=${encodeURIComponent(file)}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `Something went wrong (${res.status}).`);
      setModel((await getModelLibrary().addFile(new File([await res.text()], `${m.name}.nam`), { name: m.name })).id);
    } catch (e) { setAmpState(`Error: ${e instanceof Error ? e.message : String(e)}`); }
  };
  const pickModel = async (v: string) => {
    if (v.startsWith("disk:")) { await pickDisk(v.slice(5)); return; }
    if (!v.startsWith("cloud:")) { setModel(Number(v)); return; }
    const m = cloud.find((c) => c.path === v.slice(6));
    if (!m) return;
    setAmpState("downloading");
    const r = await createCloud(getModelLibrary()).use(m);
    if ("id" in r) setModel(r.id); else setAmpState(`Error: ${r.error}`);
  };
  const addModels = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      try { const r = await getModelLibrary().addFile(f); setModel(r.id); } catch (e) { setNotice(e instanceof Error ? e.message : String(e)); }
    }
  };
  const shape = SHAPES[shapeIdx];
  /** a step is being built, so the next note joins it until Space */
  const [open, setOpen] = useState(false);
  const history = useRef<RiffNote[][]>([]);

  // read the saved riff after hydration, so the server render and the first client render match
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setLib(load()); }, []);
  // EMPTY_LIB is only what is drawn until the saved riffs are read: saving it would wipe them
  useEffect(() => { if (lib !== EMPTY_LIB) try { localStorage.setItem(STORE, JSON.stringify(lib)); } catch { /* private window */ } }, [lib]);

  const mode = MODE_LIST[state.mode] ?? MODE_LIST[0];
  const ctx = useMemo(() => makeKeyContext(state.tonic, FAMILIES.indexOf(mode.family), mode.k), [state.tonic, mode]);
  const { notes } = state;

  const setNotes = useCallback((fn: (n: RiffNote[]) => RiffNote[]) => {
    setState((s) => { history.current.push(s.notes); return { ...s, notes: fn(s.notes) }; });
  }, [setState]);

  const lastMidi = useCallback((before: number) => {
    for (let i = before - 1; i >= 0; i--) { const m = midiOf(notes[i]); if (m !== null) return m; }
    return OPEN_MIDI[3] + state.pos; // the G string at the hand position
  }, [notes, state.pos]);

  /** Add a note: on its own step, or stacked on the last step (a note already on that string there is replaced). */
  /** Add a note: on a new step, or stacked on the selected note's step (else the last step); a note already on that string there is replaced. */
  const append = useCallback((n: RiffNote, stack: boolean) => {
    setNotes((ns) => {
      if (!stack || !ns.length || n.string === null) return [...ns, n];
      const cols = columnsOf(ns);
      const col = (sel !== null ? cols.find((c) => c.idx.includes(sel)) : undefined) ?? cols.at(-1)!;
      const clash = col.idx.find((i) => ns[i].string === n.string || ns[i].string === null);
      if (clash !== undefined) return ns.map((x, i) => (i === clash ? { ...x, string: n.string, fret: n.fret } : x));
      const end = col.idx.at(-1)! + 1;
      return [...ns.slice(0, end), { ...n, with: true }, ...ns.slice(end)];
    });
  }, [setNotes, sel]);

  /** A click on the neck: adds to the selected step, or to the step being built, or starts one. */
  const put = useCallback((n: RiffNote, shift = false) => {
    append(n, shift || open || sel !== null);
    if (sel === null) setOpen(true);
  }, [append, open, sel]);

  /** Place the chosen shape with its root at string/fret: a new step, or in place of the selected step. */
  const placeShape = useCallback((string: number, fret: number): boolean => {
    const cells = shapeAt(ctx, shape, string, fret);
    if (!cells) return false;
    const beats = len;
    setNotes((ns) => {
      const step = cells.map((c, k) => ({ ...c, beats, with: k > 0 }));
      if (sel === null) return [...ns, ...step];
      const col = columnsOf(ns).find((c) => c.idx.includes(sel))!;
      const first = col.idx[0], last = col.idx.at(-1)!;
      return [...ns.slice(0, first), ...step, ...ns.slice(last + 1)];
    });
    setOpen(sel === null);
    playSequence(cells.map((c, k) => ({ note: OPEN_MIDI[c.string] + c.fret, at: k * 25, hold: 900 })), player());
    return true;
  }, [ctx, shape, len, sel, setNotes, player]);

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


  /** New notes' length; the selected note's step, or else the step being built, takes it too. */
  const chooseLength = useCallback((fn: (b: number) => number) => {
    setLen(fn);
    const col = sel !== null ? columnsOf(notes).find((c) => c.idx.includes(sel)) : open ? columnsOf(notes).at(-1) : undefined;
    if (!col) return;
    const step = new Set(col.idx);
    setNotes((ns) => ns.map((x, j) => (step.has(j) ? { ...x, beats: fn(x.beats) } : x)));
  }, [open, notes, setNotes, sel]);

  /** Set how long note `i` rings. */
  const lengthAt = useCallback((i: number, fn: (b: number) => number) => {
    setNotes((ns) => ns.map((x, j) => (j === i ? { ...x, beats: fn(x.beats) } : x)));
  }, [setNotes]);

  const hear = useCallback((midi: number) => playSequence([{ note: midi, at: 0, hold: 500 }], player()), [player]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, video")) return;
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
        if (p) { append({ ...p, beats: len }, open || sel !== null); if (sel === null) setOpen(true); hear(m); }
      } else if (LENGTHS.some((l) => l.key === k)) {
        const b = LENGTHS.find((l) => l.key === k)!.beats;
        if (sel !== null && e.shiftKey) lengthAt(sel, () => b); else chooseLength(() => b);
      } else if (k === "." || k === ">") {
        if (sel !== null && e.shiftKey) lengthAt(sel, toggleDot); else chooseLength(toggleDot);
      } else if (k === "r") { setNotes((ns) => [...ns, { string: null, fret: null, beats: len }]); setOpen(false); }
      else if (k === "[" || k === "]") setShapeIdx((i) => (i + (k === "]" ? 1 : SHAPES.length - 1)) % SHAPES.length);
      else if (k === "d" && sn) {
        // duplicate the whole step the selected note sits in, right after it
        const col = columnsOf(notes).find((c) => c.idx.includes(sel!))!;
        const end = col.idx.at(-1)! + 1;
        setNotes((ns) => [...ns.slice(0, end), ...col.idx.map((i) => ({ ...ns[i] })), ...ns.slice(end)]);
        setSel(end + col.idx.indexOf(sel!));
      }
      else if ((k === "Backspace" || k === "Delete") && (sel !== null || notes.length)) {
        const i = sel ?? notes.length - 1;
        // the next note of a step takes over as its first when the first goes
        setNotes((ns) => ns.filter((_, j) => j !== i).map((x, j) => (j === i && x.with && !ns[i].with ? { ...x, with: false } : x)));
        setSel(sel === null ? null : notes.length > 1 ? Math.min(sel, notes.length - 2) : null);
      } else if (k === "Escape") { setSel(null); setOpen(false); }
      else if (k === " ") { setOpen(false); setSel(null); }
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, notes, ctx, len, lastMidi, moveSel, setNotes, setState, state.pos, append, open, lengthAt, hear, chooseLength]);

  // replay the selected note when it changes pitch
  const selMidi = sel === null ? null : midiOf(notes[sel] ?? { string: null, fret: null, beats: 0 });
  const lastHeard = useRef<number | null>(null);
  useEffect(() => { if (selMidi !== null && selMidi !== lastHeard.current) hear(selMidi); lastHeard.current = selMidi; }, [selMidi, hear]);

  const cols = columnsOf(notes);
  const total = cols.reduce((a, c) => a + c.beats, 0);
  const startOf = new Map(cols.flatMap((c) => c.idx.map((i) => [i, c.start] as const)));
  const selCol = sel === null ? null : cols.find((c) => c.idx.includes(sel)) ?? null;
  /** notes drawn faintly on the neck: the rest of the selected step, or the step being built */
  const stepNotes = (selCol ?? (open ? cols.at(-1) : null))?.idx.map((i) => notes[i]) ?? [];
  const json = riffJson(state);
  const timeline = useMemo(() => riffTimeline(notes, state.tonic, state.bpm), [notes, state.tonic, state.bpm]);
  const pick = (id: string) => { history.current = []; setSel(null); setLib((l) => ({ ...l, cur: id })); };
  const add = () => { const r = { ...blank(`Riff ${lib.riffs.length + 1}`), tonic: state.tonic, mode: state.mode, bpm: state.bpm, pos: state.pos, sound: state.sound, model: state.model }; history.current = []; setSel(null); setLib((l) => ({ riffs: [...l.riffs, r], cur: r.id })); };
  const remove = (id: string) => { void deleteTake(id).catch(() => { /* the take stays in the browser, unused */ }); setLib((l) => { const riffs = l.riffs.filter((r) => r.id !== id); if (!riffs.length) return EMPTY_LIB; return { riffs, cur: l.cur === id ? riffs[0].id : l.cur }; }); };
  const copy = (what: string, text: string) => { navigator.clipboard.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(""), 1200); }, () => setCopied("Copy failed")); };

  const sn = sel === null ? null : notes[sel];
  const alts = sn && midiOf(sn) !== null ? placesOf(midiOf(sn)!) : [];
  const CELL = 50;
  const ROW = 38;

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
            <button key={l.key} onClick={() => chooseLength(() => l.beats)} className={`rounded px-2 py-1 text-sm ${len === l.beats || len === l.beats * 1.5 ? "bg-sky-600 text-white" : "bg-slate-800"}`}>{l.label}</button>
          ))}
          <button onClick={() => chooseLength(toggleDot)} title="Dotted: one and a half times the length (.)" aria-pressed={isDotted(len)} className={`rounded px-2 py-1 text-sm ${isDotted(len) ? "bg-sky-600 text-white" : "bg-slate-800"}`}>Dot</button>
        </div>
        <label className="flex flex-col text-xs text-slate-400">Shape
          <select className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100" value={shapeIdx} onChange={(e) => setShapeIdx(Number(e.target.value))}>
            {SHAPES.map((sh, i) => <option key={sh.id} value={i}>{sh.label}</option>)}
          </select>
        </label>
        <button onClick={() => setOpen(false)} disabled={!open} title="Space" className="rounded bg-slate-800 px-3 py-1 text-sm disabled:opacity-40">Next step</button>
        <label className="flex flex-col text-xs text-slate-400">Sound
          <select className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100" value={sound} onChange={(e) => setSound(e.target.value as RiffSound)}>
            <option value="piano">Piano</option>
            <option value="guitar">Clean guitar</option>
            <option value="amp">Guitar into amp (NAM)</option>
          </select>
        </label>
        {sound === "amp" && (
          <label className="flex flex-col text-xs text-slate-400">Amp model {ampState && ampState !== "ready" && <span className={ampState.startsWith("Error") ? "text-rose-400" : ""}>({ampState})</span>}
            <span className="flex gap-1">
              <select className="max-w-48 rounded bg-slate-800 px-2 py-1 text-sm text-slate-100" value={model} onChange={(e) => void pickModel(e.target.value)}>
                <option value={0}>No model (clean)</option>
                {models.length > 0 && <optgroup label="In this browser">{models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>}
                {cloud.length > 0 && (
                  <optgroup label="Amp library">
                    {cloud.filter((c) => !getModelLibrary().list().some((m) => m.cloudPath === c.path)).map((c) => <option key={c.path} value={`cloud:${c.path}`}>{c.group ? `${c.group} / ${c.variant}` : c.variant}</option>)}
                  </optgroup>
                )}
                {disk.some((d) => !models.some((m) => m.name === d.name)) && (
                  <optgroup label="On this computer">
                    {disk.filter((d) => !models.some((m) => m.name === d.name)).map((d) => <option key={d.file} value={`disk:${d.file}`}>{d.name}</option>)}
                  </optgroup>
                )}
              </select>
              {cloudError && disk.length === 0 && <span title={cloudError} className="self-center text-rose-400">Amp library: {cloudError}</span>}
              <label className="cursor-pointer rounded bg-slate-800 px-2 py-1 text-sm text-slate-100">Add .nam<input type="file" accept=".nam" multiple hidden onChange={(e) => void addModels(e.target.files)} /></label>
            </span>
          </label>
        )}
        <button onClick={() => { setNotes(() => []); setSel(null); }} className="rounded bg-rose-900 px-3 py-1 text-sm">Clear</button>
        <span className="text-sm text-slate-400">{ctx.names.join(" ")} · {cols.length} steps · {total} beats</span>
      </div>

      {notice && <p role="alert" className="text-sm text-amber-300">{notice}</p>}
      {/* neck */}
      <div className="overflow-x-auto">
        <svg width={(MAX_FRET + 1) * CELL + 30} height={6 * ROW + 30} className="font-mono">
          {[3, 5, 7, 9, 12, 15, 17].map((f) => <text key={f} x={30 + f * CELL + CELL / 2} y={6 * ROW + 22} textAnchor="middle" fontSize={12} fill="var(--color-slate-500)">{f}</text>)}
          <rect x={30 + state.pos * CELL} y={0} width={5 * CELL} height={6 * ROW} fill="var(--color-sky-500)" opacity={0.08} />
          {[5, 4, 3, 2, 1, 0].map((s, row) => (
            <g key={s}>
              <text x={4} y={row * ROW + ROW / 2} dominantBaseline="central" fontSize={13} fill="var(--color-slate-500)">{STRING_NAMES[s]}</text>
              <line x1={30} x2={30 + (MAX_FRET + 1) * CELL} y1={row * ROW + ROW / 2} y2={row * ROW + ROW / 2} stroke="var(--color-slate-700)" />
              {Array.from({ length: MAX_FRET + 1 }, (_, f) => {
                const midi = OPEN_MIDI[s] + f;
                const sc = inScale(ctx, midi);
                const root = (midi - ctx.tonic.pc + 120) % 12 === 0;
                const isSel = sn?.string === s && sn.fret === f;
                const isAlt = alts.some((a) => a.string === s && a.fret === f);
                const inStep = !isSel && stepNotes.some((n) => n.string === s && n.fret === f);
                return (
                  <g key={f} className="cursor-pointer" onClick={(e) => {
                    if (isSel) { setSel(null); return; }
                    if (shape.id !== "note" && !e.shiftKey) {
                      if (!placeShape(s, f)) { setNotice(`${shape.label} doesn't fit with its root on the ${STRING_NAMES[s]} string, fret ${f}.`); setTimeout(() => setNotice(""), 2500); }
                      return;
                    }
                    put({ string: s, fret: f, beats: len }, e.shiftKey); hear(midi);
                  }}>
                    <rect x={30 + f * CELL} y={row * ROW} width={CELL} height={ROW} fill="transparent" />
                    {sc && <circle cx={30 + f * CELL + CELL / 2} cy={row * ROW + ROW / 2} r={14} fill={isSel ? "var(--color-sky-500)" : root ? "var(--color-amber-700)" : "var(--color-slate-700)"} stroke={isAlt ? "var(--color-sky-400)" : "none"} strokeWidth={2} />}
                    {inStep && <circle cx={30 + f * CELL + CELL / 2} cy={row * ROW + ROW / 2} r={17} fill="none" stroke="var(--color-amber-400)" strokeWidth={2} />}
                    {!sc && (isSel || inStep) && <circle cx={30 + f * CELL + CELL / 2} cy={row * ROW + ROW / 2} r={14} fill="var(--color-rose-600)" />}
                    {(sc || isSel || inStep) && <text x={30 + f * CELL + CELL / 2} y={row * ROW + ROW / 2} textAnchor="middle" dominantBaseline="central" fontSize={12} fill="white">{degreeLabel(midi % 12, ctx)}</text>}
                  </g>
                );
              })}
            </g>
          ))}
          {Array.from({ length: MAX_FRET + 2 }, (_, f) => <line key={f} x1={30 + f * CELL} x2={30 + f * CELL} y1={0} y2={6 * ROW} stroke={f === 1 ? "var(--color-slate-400)" : "var(--color-slate-800)"} />)}
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
          {cols.map((c) => (
            <rect key={`col${c.idx[0]}`} x={40 + c.start * 48 - 4} y={0} width={20} height={6 * 18 + 30} fill="transparent" className="cursor-pointer"
              onClick={() => { const on = sel !== null && c.idx.includes(sel); setSel(on ? null : c.idx[0]); setOpen(false); }} />
          ))}
          {(() => {
            return notes.map((n, i) => {
              const x = 40 + (startOf.get(i) ?? 0) * 48 + 6;
              const isSel = i === sel;
              const y = n.string === null ? 14 + 2.5 * 18 : 14 + (5 - n.string) * 18;
              return (
                <g key={i} className="cursor-pointer" onClick={() => { setSel(isSel ? null : i); setOpen(false); }}>
                  {isSel && <rect x={x - 10} y={0} width={20} height={6 * 18 + 30} fill="var(--color-sky-500)" opacity={0.15} />}
                  {n.string !== null && <line x1={x + 9} x2={Math.max(x + 9, x - 6 + n.beats * 48)} y1={y} y2={y} stroke={isSel ? "var(--color-sky-400)" : "var(--color-slate-500)"} strokeWidth={3} strokeLinecap="round" opacity={0.6} />}
                  <rect x={x - 9} y={y - 8} width={18} height={16} rx={3} fill="var(--color-slate-950)" />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} fill={isSel ? "var(--color-sky-300)" : n.string === null ? "var(--color-slate-500)" : "var(--color-slate-100)"}>{n.fret ?? "𝄽"}</text>
                  {!n.with && <text x={x} y={6 * 18 + 24} textAnchor="middle" fontSize={9} fill="var(--color-slate-500)">{midiOf(n) === null ? "" : `${Note.pitchClass(Note.fromMidiSharps(midiOf(n)!))}·${degreeLabel(midiOf(n)! % 12, ctx)}`}</text>}
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
            <button key={l.key} onClick={() => lengthAt(sel!, () => l.beats)}
              className={`rounded px-2 py-0.5 ${sn.beats === l.beats || sn.beats === l.beats * 1.5 ? "bg-sky-600 text-white" : "bg-slate-800"}`}>{l.label}</button>
          ))}
          <button onClick={() => lengthAt(sel!, toggleDot)} title="Dotted: one and a half times the length (⇧ .)" aria-pressed={isDotted(sn.beats)} className={`rounded px-2 py-0.5 ${isDotted(sn.beats) ? "bg-sky-600 text-white" : "bg-slate-800"}`}>Dot</button>
        </div>
      )}

      {/* the riff in the app's guitar exercise player, as a plan would show it */}
      {timeline && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-slate-400">As an exercise</h2>
          <PlayAlongTimeline key={`${state.id}-${state.bpm}`} timeline={timeline} instrument={player} />
        </section>
      )}

      <RiffTake key={state.id} riff={state.id} name={state.name} bpm={state.bpm} pos={state.pos}
        onNotes={(heard, replace) => { setNotes((ns) => (replace ? heard : [...ns, ...heard])); setSel(null); setOpen(false); }} />

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
