"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FAMILIES, MODE_LIST, TONICS, degreeLabel, makeKeyContext } from "@/features/theory/theory";
import { playSequence } from "@/features/sound";
import { createCloud, getModelLibrary, type CloudModel } from "@/features/nam";
import { playerFor, setAmpModel, type RiffSound } from "./sound";
import { Tool } from "@/features/plan/ui/ExerciseTool";
import { drawToolOverlay } from "@/features/plan/ui/ToolOverlay";
import type { PlanTool } from "@/features/plan/model/tools";
import { OverlayDrawProvider } from "@/features/contentVideos/ui/OverlayVideo";
import RecordVideo from "@/features/contentVideos/ui/RecordVideo";
import type { RecordKit } from "@/features/contentVideos/ui/kit";
import { listContentVideos } from "@/features/contentVideos/client/api";
import type { ContentVideoInfo } from "@/features/contentVideos/server/access";
import { useToolNotes } from "@/features/exercises/play-along/useToolNotes";
import { fingerFor } from "@/features/exercises/cues/cueNotes";
import { RIFF_VIEWS, RiffView, WINDOW_BARS, barGrid, type WindowBars } from "./NoteOverlay";
import { Note } from "@tonaljs/tonal";
import { NoteSign, isDotted } from "@/features/exercises/play-along/views/NoteSign";
import { MAX_FRET, STRING_NAMES, SHAPES, asciiTab, columnsOf, shapeAt, degreeNear, inScale, midiOf, placeNear, placesOf, riffTimeline, riffTimes, scaleStep, type RiffNote } from "./riff";
import { PlayAlongTimeline } from "@/features/exercises/play-along/PlayAlong";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { GENRES } from "@/features/library/seed/genres";
import { riffTool, type RiffBlock } from "./blocks";
import { gearOf, groupByGear, type KindFilter } from "./ampCatalog";

/** What this browser remembers of the riff maker: the riff that was open and the sound. The riffs are in seed block files, and a riff saved here in the database (`/api/dev/riffs`). */
const PREFS = "musickit.dev.riffPrefs";
interface Prefs { cur?: string; sound?: RiffSound; model?: number }
const readPrefs = (): Prefs => { try { return (JSON.parse(localStorage.getItem(PREFS) ?? "null") as Prefs | null) ?? {}; } catch { return {}; } };
const LENGTHS: { key: string; beats: number; label: string }[] = [
  { key: "s", beats: 0.25, label: "1/16" },
  { key: "e", beats: 0.5, label: "1/8" },
  { key: "q", beats: 1, label: "1/4" },
  { key: "h", beats: 2, label: "1/2" },
  { key: "w", beats: 4, label: "1" },
];

const noteIcon = (beats: number) => <svg width={16} height={22} viewBox="-1 0 16 22" className="inline-block align-middle" aria-hidden><NoteSign beats={beats} /></svg>;
/** Add a dot to a length, or take it off a dotted one. */
const toggleDot = (beats: number) => (isDotted(beats) ? beats / 1.5 : beats * 1.5);

/** A block's riff as the editor holds it: `id` is the block's, `name` its title, `mode` an index of MODE_LIST, `pos` the fret the hand sits at. Changes stay in this page until saved. */
interface Saved { id: string; name: string; tonic: number; mode: number; notes: RiffNote[]; bpm: number; pos: number; amp: string | null }
interface Library { riffs: Saved[]; cur: string }
const AEOLIAN = MODE_LIST.findIndex((m) => m.name === "Aeolian");
/** What is drawn until the blocks are read, and when none holds a riff. */
const NONE: Saved = { id: "", name: "", tonic: 9, mode: AEOLIAN, notes: [], bpm: 90, pos: 5, amp: null };
const EMPTY_LIB: Library = { riffs: [NONE], cur: "" };

/** A block's riff as the editor holds it. A scale the list doesn't have opens as Aeolian; the hand sits at the riff's lowest fret. */
const fromBook = (r: RiffBlock): Saved => {
  const mode = MODE_LIST.findIndex((m) => m.name === r.scale);
  const frets = r.notes.flatMap((n) => (n.fret === null ? [] : [n.fret]));
  return { id: r.id, name: r.title, tonic: r.tonic, mode: mode < 0 ? AEOLIAN : mode, notes: r.notes, bpm: r.bpm, pos: Math.min(MAX_FRET - 4, frets.length ? Math.min(...frets) : 5), amp: r.amp };
};
/** What a riff's file holds of it, to tell whether the editor has changes the file doesn't. */
const fileFields = (r: { tonic: number; scale: string; bpm: number; notes: RiffNote[]; amp: string | null }) =>
  JSON.stringify([r.tonic, r.scale, r.bpm, r.notes.map((n) => [n.string, n.fret, n.beats, !!n.with]), r.amp]);

/** Where the saved riff is: only in its seed file, or saved in the app (when, by whom) and whether the file has it yet. */
const savedLine = (b: RiffBlock): string => {
  if (!b.edited) return "Same as the seed file";
  const when = new Date(b.edited.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const saved = `Saved in the app on ${when}${b.edited.by ? ` by ${b.edited.by}` : ""}`;
  return b.edited.inFile ? `${saved}, and in the seed file` : `${saved}. Not in the seed file yet: run npm run db:pull-riffs`;
};
const scaleOf = (r: Saved) => MODE_LIST[r.mode]?.name ?? "Aeolian";
const changed = (r: Saved, book: RiffBlock[]) => { const b = book.find((x) => x.id === r.id); return !!b && fileFields(b) !== fileFields({ ...r, scale: scaleOf(r) }); };
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

/** The riff maker. `open`: the riff to open first (`?riff=<block id>`), over the one this browser opened last. */
export default function RiffLab({ open: asked = "" }: { open?: string }) {
  const [lib, setLib] = useState<Library>(EMPTY_LIB);
  const state = lib.riffs.find((r) => r.id === lib.cur) ?? lib.riffs[0];
  const setState = useCallback((fn: (s: Saved) => Saved) => setLib((l) => ({ ...l, riffs: l.riffs.map((r) => (r.id === l.cur ? fn(r) : r)) })), []);
  // the sound is this browser's, the same for every riff; the amp model follows the open riff's `amp` (below)
  const [prefs, setPrefs] = useState<Prefs>({});
  const sound: RiffSound = prefs.sound ?? "piano";
  const model = prefs.model ?? 0;
  const keep = useCallback((p: Prefs) => setPrefs((old) => { const next = { ...old, ...p }; try { localStorage.setItem(PREFS, JSON.stringify(next)); } catch { /* private window */ } return next; }), []);
  const setSound = useCallback((v: RiffSound) => keep({ sound: v }), [keep]);
  const setModel = useCallback((v: number) => keep({ model: v }), [keep]);
  const [sel, setSel] = useState<number | null>(null);
  const [len, setLen] = useState(0.5);
  const [copied, setCopied] = useState("");
  const [shapeIdx, setShapeIdx] = useState(0);
  const [notice, setNotice] = useState("");
  const [book, setBook] = useState<RiffBlock[]>([]);
  const [bookState, setBookState] = useState("");
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
  const [cloud, setCloud] = useState<CloudModel[]>([]);
  const [cloudError, setCloudError] = useState("");
  // the shared amp library on the server, read once the amp is chosen; a model is copied into this browser when picked
  useEffect(() => {
    if (sound !== "amp" || cloud.length || cloudError) return;
    void createCloud(getModelLibrary()).list().then((r) => ("models" in r ? setCloud(r.models) : setCloudError(r.error)));
  }, [sound, cloud.length, cloudError]);
  const [disk, setDisk] = useState<{ file: string; name: string; licence: string }[]>([]);
  /** whether this server has the folders of .nam files at all (a production server doesn't) */
  const [diskHere, setDiskHere] = useState(true);
  /** whether the site can save riffs (it has a database); the riffs answer says */
  const [canSave, setCanSave] = useState(true);
  /** the amp picker's filters: which kind of gear it lists, and the words searched for */
  const [ampKind, setAmpKind] = useState<KindFilter>("amp");
  const [ampSearch, setAmpSearch] = useState("");
  /** a model's name with its licence after it, where the disk list knows the model */
  const withLicence = (name: string, shown = name) => { const l = disk.find((d) => d.name === name)?.licence; return l ? `${shown} (${l})` : shown; };
  // the .nam files on this machine's disk (/api/dev/nam), read once the amp is chosen: what there is to pick where the amp library isn't set up
  useEffect(() => {
    if (sound !== "amp") return;
    let off = false;
    fetch("/api/dev/nam", { cache: "no-store", signal: AbortSignal.timeout(10000) })
      .then(async (res) => { if (!res.ok) throw new Error(`Models on this computer: ${res.status}`); return (await res.json()) as { models: { file: string; name: string; licence: string }[]; onThisMachine?: boolean }; })
      .then((r) => { if (!off) { setDisk(r.models); setDiskHere(r.onThisMachine !== false); } })
      .catch((e) => { if (!off) setNotice(e instanceof Error ? e.message : String(e)); });
    return () => { off = true; };
  }, [sound]);
  /** Copy a model from this computer's disk into the browser's library; its id, or null (the reason is in the amp state). */
  const loadDisk = useCallback(async (file: string): Promise<number | null> => {
    const m = disk.find((d) => d.file === file);
    if (!m) return null;
    const have = getModelLibrary().list().find((r) => r.name === m.name);
    if (have) return have.id;
    setAmpState("loading");
    try {
      const res = await fetch(`/api/dev/nam?file=${encodeURIComponent(file)}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `Something went wrong (${res.status}).`);
      return (await getModelLibrary().addFile(new File([await res.text()], `${m.name}.nam`), { name: m.name })).id;
    } catch (e) { setAmpState(`Error: ${e instanceof Error ? e.message : String(e)}`); return null; }
  }, [disk]);
  /** Hear the riff through a model picked by hand: it becomes the open riff's amp (Save writes it into the block). */
  const chooseModel = (id: number) => {
    setModel(id);
    const name = getModelLibrary().list().find((m) => m.id === id)?.name ?? null;
    if (name !== state.amp) setState((s) => ({ ...s, amp: name }));
  };
  const pickModel = async (v: string) => {
    if (v.startsWith("disk:")) { const id = await loadDisk(v.slice(5)); if (id !== null) chooseModel(id); return; }
    if (!v.startsWith("cloud:")) { chooseModel(Number(v)); return; }
    const m = cloud.find((c) => c.path === v.slice(6));
    if (!m) return;
    setAmpState("downloading");
    const r = await createCloud(getModelLibrary()).use(m);
    if ("id" in r) chooseModel(r.id); else setAmpState(`Error: ${r.error}`);
  };
  const addModels = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      try { const r = await getModelLibrary().addFile(f); chooseModel(r.id); } catch (e) { setNotice(e instanceof Error ? e.message : String(e)); }
    }
  };
  // the open riff's amp, heard once the amp is the sound: the model in this browser by that name, else the file on disk copied in
  const riffAmp = state.amp;
  const fetching = useRef("");
  useEffect(() => {
    if (sound !== "amp" || !riffAmp || models.some((m) => m.name === riffAmp)) return;
    const d = disk.find((x) => x.name === riffAmp);
    if (!d || fetching.current === d.file) return;
    fetching.current = d.file;
    void loadDisk(d.file);
  }, [sound, riffAmp, models, disk, loadDisk]);
  /** the open riff names an amp that is neither in this browser nor on this computer's disk */
  const ampMissing = sound === "amp" && !!riffAmp && disk.length > 0 && !models.some((m) => m.name === riffAmp) && !disk.some((d) => d.name === riffAmp);
  /** the model heard: the open riff's amp once it is in this browser, else the last one picked */
  const heard = (riffAmp ? models.find((m) => m.name === riffAmp)?.id : undefined) ?? model;
  useEffect(() => { if (sound === "amp") setAmpModel(heard, setAmpState); }, [sound, heard]);
  /** The blocks that hold a riff, as their files are now; null when it can't be read (the reason goes under the list). */
  const readBook = useCallback(async (): Promise<RiffBlock[] | null> => {
    try {
      const res = await fetch("/api/dev/riffs", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const body = (await res.json().catch(() => null)) as { riffs?: RiffBlock[]; problems?: string[]; saving?: boolean; error?: string } | null;
      if (!res.ok || !body?.riffs) throw new Error(body?.error ?? `The riffs couldn't be loaded (${res.status}).`);
      const riffs = body.riffs;
      setBook(riffs);
      setCanSave(body.saving !== false);
      // a riff being edited keeps its changes; the riff that was open last time opens again
      setLib((l) => {
        const list = riffs.map((b) => l.riffs.find((x) => x.id === b.id) ?? fromBook(b));
        if (!list.length) return EMPTY_LIB;
        const cur = [l.cur, asked, readPrefs().cur].find((id) => id && list.some((x) => x.id === id)) ?? list[0].id;
        return { riffs: list, cur };
      });
      setBookState(body.problems?.length ? `Left out: ${body.problems.join(" · ")}` : "");
      return body.riffs;
    } catch (e) {
      setBookState(`Error: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }, [asked]);
  // read once the page is up: every setState in readBook comes after its fetch
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPrefs(readPrefs()); void readBook(); }, [readBook]);
  const shape = SHAPES[shapeIdx];
  /** a step is being built, so the next note joins it until Space */
  const [open, setOpen] = useState(false);
  const history = useRef<RiffNote[][]>([]);

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
  const bars = Math.max(1, Math.ceil(total / 4 - 1e-6));
  const left = bars * 4 - total;
  const startOf = new Map(cols.flatMap((c) => c.idx.map((i) => [i, c.start] as const)));
  const selCol = sel === null ? null : cols.find((c) => c.idx.includes(sel)) ?? null;
  /** notes drawn faintly on the neck: the rest of the selected step, or the step being built */
  const stepNotes = (selCol ?? (open ? cols.at(-1) : null))?.idx.map((i) => notes[i]) ?? [];
  const json = riffJson(state);
  const timeline = useMemo(() => riffTimeline(notes, state.tonic, state.bpm), [notes, state.tonic, state.bpm]);
  const pick = (id: string) => { history.current = []; setSel(null); setLib((l) => ({ ...l, cur: id })); keep({ cur: id }); };
  const seedRiff = book.find((b) => b.id === state.id);
  const seedScale = scaleOf(state);
  const seedDirty = changed(state, book);
  const anyDirty = lib.riffs.some((r) => changed(r, book));
  // changes live in this page only: ask before a reload throws them away
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);
  /** Save the riff in the editor into its block in the database. */
  const saveSeed = async () => {
    if (!seedRiff) return;
    setBookState("Saving…");
    try {
      const res = await fetch("/api/dev/riffs", { method: "PUT", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(10000), body: JSON.stringify({ id: state.id, tonic: state.tonic, scale: seedScale, bpm: state.bpm, notes: state.notes, amp: state.amp }) });
      const body = (await res.json().catch(() => null)) as { riff?: RiffBlock; error?: string } | null;
      if (!res.ok || !body?.riff) throw new Error(body?.error ?? `Something went wrong (${res.status}).`);
      const saved = body.riff;
      setBook((b) => b.map((x) => (x.id === saved.id ? saved : x)));
      setBookState("Saved. Plans made from now on get this riff.");
    } catch (e) {
      setBookState(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  /** Throw away the editor's changes: the riff as last saved (or as its file has it, if never saved here). */
  const reloadSeed = async () => {
    const id = state.id;
    const from = (await readBook())?.find((b) => b.id === id);
    if (!from) return;
    setSel(null);
    history.current.push(state.notes);
    setLib((l) => ({ ...l, riffs: l.riffs.map((r) => (r.id === id ? fromBook(from) : r)) }));
  };
  const copy = (what: string, text: string) => { navigator.clipboard.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(""), 1200); }, () => setCopied("Copy failed")); };

  const sn = sel === null ? null : notes[sel];
  const alts = sn && midiOf(sn) !== null ? placesOf(midiOf(sn)!) : [];
  const CELL = 50;
  const ROW = 38;
  /** tab width of one beat: a 1/16 note gets 16px, room for its fret */
  const BEAT = 64;

  return (
    <div className="flex flex-col gap-5 text-slate-200 lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-2 lg:w-56">
        <div className="flex gap-2">
          <button onClick={() => copy("All riffs", lib.riffs.filter((r) => r.id).map(riffMarkdown).join("\n"))} className="rounded bg-slate-800 px-3 py-1 text-sm">Copy all</button>
        </div>
        {GENRES.filter((g) => book.some((b) => b.genre === g)).map((g) => (
          <div key={g} className="flex flex-col gap-1">
            <h3 className="text-xs capitalize text-slate-400">{g}</h3>
            <ul className="flex flex-col gap-1">
              {book.filter((b) => b.genre === g).map((b) => (
                <li key={b.id}>
                  <button onClick={() => pick(b.id)} title={`${b.id}.json`} className={`w-full rounded px-2 py-1 text-left text-sm ${state.id === b.id ? "bg-sky-900/50" : "hover:bg-slate-800"}`}>
                    <span className="block">{b.title}{lib.riffs.some((r) => r.id === b.id && changed(r, book)) && <span title="Changes not saved yet" className="text-amber-300"> •</span>}</span>
                    <span className={`block text-xs ${b.draft ? "text-amber-400" : "text-slate-500"}`}>{b.draft ? "switched off" : "in the library"} · {b.steps.length ? b.steps.join(", ") : "no path step"}{b.edited && !b.edited.inFile && " · edited in the app"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {bookState && <p role={bookState.startsWith("Error") ? "alert" : "status"} className={`text-xs ${bookState.startsWith("Error") ? "text-rose-400" : "text-slate-400"}`}>{bookState}</p>}
      </aside>
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <h2 className="text-lg font-semibold">{state.name || "No seed block holds a riff yet"}</h2>
      {state.id && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-400">Seed block: <a href={`/admin/content/library?item=${state.id}`} className="font-mono text-sky-300 underline">{state.id}</a>{seedRiff?.draft && " (switched off)"}</span>
          {!seedRiff ? <span className="text-amber-300">No seed block with this id holds a riff.</span> : !canSave ? (
            <span className="text-slate-500">Riffs can&apos;t be saved on this site: it has no database.</span>
          ) : (
            <>
              <button onClick={() => void saveSeed()} disabled={!seedDirty} className="rounded bg-sky-700 px-3 py-1 text-white disabled:bg-slate-800 disabled:text-slate-500">Save</button>
              <button onClick={() => void reloadSeed()} disabled={!seedDirty} className="rounded bg-slate-800 px-3 py-1 disabled:opacity-40">Reload</button>
              <span className="text-slate-500">{seedDirty ? "Changes not saved yet" : savedLine(seedRiff)}</span>
            </>
          )}
          {seedRiff?.video?.changed && <p role="status" className="basis-full text-amber-300">This riff has changed since its video &ldquo;{seedRiff.video.title}&rdquo; was recorded, so the video plays the older riff. Record the video again to match.</p>}
        </div>
      )}
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
            <button key={l.key} onClick={() => chooseLength(() => l.beats)} className={`rounded px-2 py-1 text-sm ${len === l.beats || len === l.beats * 1.5 ? "bg-sky-600 text-white" : "bg-slate-800"}`}>{noteIcon(l.beats)} {l.label}</button>
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
            {ampMissing && <span className="text-amber-400">This riff&apos;s amp is not on this computer: {riffAmp}</span>}
            <span className="flex gap-1">
              <select aria-label="Kind of model" className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100" value={ampKind} onChange={(e) => setAmpKind(e.target.value as KindFilter)}>
                <option value="amp">Amps</option>
                <option value="pedal">Pedals</option>
                <option value="all">All models</option>
              </select>
              <input type="search" aria-label="Find a model" placeholder="Find a model" className="w-32 rounded bg-slate-800 px-2 py-1 text-sm text-slate-100" value={ampSearch} onChange={(e) => setAmpSearch(e.target.value)} />
              <select className="max-w-64 rounded bg-slate-800 px-2 py-1 text-sm text-slate-100" value={heard} onChange={(e) => void pickModel(e.target.value)}>
                <option value={0}>No model (clean)</option>
                {/* the model playing now stays listed whatever the filters, so the picker always shows it */}
                {models.filter((m) => m.id === heard).map((m) => { const g = gearOf(m.name); return <option key={m.id} value={m.id} title={m.name}>{withLicence(m.name, `${g.gear} · ${g.variant}`)}</option>; })}
                {groupByGear(models.filter((m) => m.id !== heard), ampKind, ampSearch).map((g) => (
                  <optgroup key={`b:${g.kind}:${g.gear}`} label={`${g.gear}${g.kind === "pedal" ? " (pedal)" : ""}, in this browser`}>
                    {g.items.map((m) => <option key={m.id} value={m.id} title={m.name}>{withLicence(m.name, m.variant)}</option>)}
                  </optgroup>
                ))}
                {cloud.length > 0 && (
                  <optgroup label="Amp library">
                    {cloud.filter((c) => !getModelLibrary().list().some((m) => m.cloudPath === c.path)).map((c) => <option key={c.path} value={`cloud:${c.path}`}>{c.group ? `${c.group} / ${c.variant}` : c.variant}</option>)}
                  </optgroup>
                )}
                {groupByGear(disk.filter((d) => !models.some((m) => m.name === d.name)), ampKind, ampSearch).map((g) => (
                  <optgroup key={`d:${g.kind}:${g.gear}`} label={`${g.gear}${g.kind === "pedal" ? " (pedal)" : ""}, on this computer`}>
                    {g.items.map((d) => <option key={d.file} value={`disk:${d.file}`} title={d.name}>{`${d.variant} (${d.licence})`}</option>)}
                  </optgroup>
                ))}
              </select>
              {!diskHere && <span className="self-center text-xs text-slate-400">No amp models here. Pick one from the amp library or add a .nam file.</span>}
              {cloudError && disk.length === 0 && <span title={cloudError} className="self-center text-rose-400">Amp library: {cloudError}</span>}
              <label className="cursor-pointer rounded bg-slate-800 px-2 py-1 text-sm text-slate-100">Add .nam<input type="file" accept=".nam" multiple hidden onChange={(e) => void addModels(e.target.files)} /></label>
            </span>
          </label>
        )}
        <button onClick={() => { setNotes(() => []); setSel(null); }} className="rounded bg-rose-900 px-3 py-1 text-sm">Clear</button>
        <span className="text-sm text-slate-400">{ctx.names.join(" ")} · {cols.length} steps · {total} beats · {left > 1e-6 ? `bar ${bars}: ${+(4 - left).toFixed(2)} of 4 beats, ${+left.toFixed(2)} to fill` : `${bars} full bar${bars > 1 ? "s" : ""}`}</span>
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
        <svg width={Math.max(300, 40 + bars * 4 * BEAT + 40)} height={6 * 18 + 52} className="font-mono">
          {[5, 4, 3, 2, 1, 0].map((s, row) => (
            <g key={s}>
              <text x={4} y={14 + row * 18} dominantBaseline="central" fontSize={11} fill="var(--color-slate-500)">{STRING_NAMES[s]}</text>
              <line x1={20} x2={30 + bars * 4 * BEAT} y1={14 + row * 18} y2={14 + row * 18} stroke="var(--color-slate-700)" />
            </g>
          ))}
          {/* the bars the riff reaches, drawn whole: beat ticks, a dashed half-bar line, the unfilled rest of the last bar shaded */}
          {Array.from({ length: bars }, (_, b) => (
            <g key={`bar${b}`}>
              <text x={34 + b * 4 * BEAT} y={6 * 18 + 44} fontSize={9} fill="var(--color-slate-500)">bar {b + 1}</text>
              {[0, 1, 2, 3].map((q) => <rect key={`s${q}`} x={30 + (b * 4 + q) * BEAT} y={6} width={BEAT} height={5 * 18 + 16} fill={q % 2 ? "var(--color-slate-700)" : "var(--color-slate-800)"} opacity={0.35} />)}
              {[1, 2, 3].map((q) => <line key={q} x1={30 + (b * 4 + q) * BEAT} x2={30 + (b * 4 + q) * BEAT} y1={14} y2={14 + 5 * 18} stroke={q === 2 ? "var(--color-slate-500)" : "var(--color-slate-800)"} strokeDasharray={q === 2 ? "4 3" : undefined} />)}
            </g>
          ))}
          {total < bars * 4 && <rect x={30 + total * BEAT} y={6} width={(bars * 4 - total) * BEAT} height={5 * 18 + 16} fill="var(--color-amber-500)" opacity={0.06} />}
          {Array.from({ length: bars + 1 }, (_, b) => <line key={b} x1={30 + b * 4 * BEAT} x2={30 + b * 4 * BEAT} y1={14} y2={14 + 5 * 18} stroke="var(--color-slate-400)" strokeWidth={1.5} />)}
          {cols.map((c) => (
            <rect key={`col${c.idx[0]}`} x={30 + c.start * BEAT} y={0} width={Math.max(22, c.beats * BEAT)} height={6 * 18 + 30} fill="transparent" className="cursor-pointer"
              onClick={() => { const on = sel !== null && c.idx.includes(sel); setSel(on ? null : c.idx[0]); setOpen(false); }} />
          ))}
          {(() => {
            return notes.map((n, i) => {
              const at = startOf.get(i) ?? 0;
              const x = 30 + at * BEAT + 11;
              const isSel = i === sel;
              const y = n.string === null ? 14 + 2.5 * 18 : 14 + (5 - n.string) * 18;
              return (
                <g key={i} className="cursor-pointer" onClick={() => { setSel(isSel ? null : i); setOpen(false); }}>
                  {isSel && <rect x={x - 10} y={0} width={20} height={6 * 18 + 30} fill="var(--color-sky-500)" opacity={0.15} />}
                  {n.string !== null && <line x1={x + 9} x2={Math.max(x + 9, x - 6 + n.beats * BEAT)} y1={y} y2={y} stroke={isSel ? "var(--color-sky-400)" : "var(--color-slate-500)"} strokeWidth={3} strokeLinecap="round" opacity={0.6} />}
                  <rect x={x - 9} y={y - 8} width={18} height={16} rx={3} fill="var(--color-slate-950)" />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} fill={isSel ? "var(--color-sky-300)" : n.string === null ? "var(--color-slate-500)" : "var(--color-slate-100)"}>{n.fret ?? "𝄽"}</text>
                  {!n.with && <NoteSign beats={n.beats} x={x - 5} y={6 * 18 + 10} color="var(--color-slate-400)" />}
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
              className={`rounded px-2 py-0.5 ${sn.beats === l.beats || sn.beats === l.beats * 1.5 ? "bg-sky-600 text-white" : "bg-slate-800"}`}>{noteIcon(l.beats)} {l.label}</button>
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

      {seedRiff && <RiffRecorder key={state.id} riff={state} scale={seedScale} cell={seedRiff.cell} bars={bars} />}

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

/** How many bars Bar by bar shows at once: kept in this browser. */
const WINDOW_KEY = "musickit.riff.windowBars";
const readWindow = (): WindowBars => { try { const v = Number(localStorage.getItem(WINDOW_KEY)); return (WINDOW_BARS as readonly number[]).includes(v) ? (v as WindowBars) : 1; } catch { return 1; } };

/**
 * The riff recorded with the shared recorder (`contentVideos/ui/RecordVideo`), as the riff block's own video: the riff in the
 * editor (unsaved edits included) drawn over the camera as its exercise draws it, with the riff's own views (Sliding tab,
 * Bar by bar, Chord box) in the View list, its notes for the neck readers, and Save for players on This block only.
 */
function RiffRecorder({ riff, scale, cell, bars }: { riff: Saved; scale: string; cell: number; bars: number }) {
  const { id, name, tonic, bpm, notes, pos } = riff;
  const drawn: PlanTool | null = useMemo(() => riffTool({ tonic, scale, bpm, notes }), [tonic, scale, bpm, notes]);
  const [videos, setVideos] = useState<ContentVideoInfo[]>([]);
  const [videosError, setVideosError] = useState("");
  useEffect(() => {
    let gone = false;
    void listContentVideos().then((r) => { if (gone) return; if (r.ok) setVideos(r.value); else setVideosError(r.error); });
    return () => { gone = true; };
  }, []);
  const [windowBars, setWindowBars] = useState<WindowBars>(1);
  // read after hydration: the server has no browser to ask
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setWindowBars(readWindow()); }, []);
  const pickWindow = (b: WindowBars) => { setWindowBars(b); try { localStorage.setItem(WINDOW_KEY, String(b)); } catch { /* kept for this visit only */ } };
  const toolNotes = useToolNotes(drawn);
  const kit = useMemo((): RecordKit => {
    const times = riffTimes(notes, bpm);
    const grid = barGrid(bpm, 0, windowBars);
    return {
      // stopped (null), the riff stands at beat 1; in the count-in the beat is negative and the riff waits for it
      views: RIFF_VIEWS.map((v) => ({ id: v.id, label: v.label, draw: (beat: number | null) => <RiffView notes={times} t={((beat ?? 0) * 60) / bpm} mode={v.id} grid={grid} /> })),
      notes: toolNotes?.notes.map((n) => (n.finger === undefined && n.fret !== undefined ? { ...n, finger: fingerFor(n.fret, pos) } : n)),
      loopBeats: toolNotes?.loopBeats ?? null,
      key: { tonic, scale },
    };
  }, [notes, bpm, windowBars, toolNotes, pos, tonic, scale]);
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-800 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="font-semibold">Take</h2>
        <label className="flex items-center gap-1.5 text-slate-300" title="How many bars Bar by bar shows at once">Bars shown
          <select value={windowBars} onChange={(e) => pickWindow(Number(e.target.value) as WindowBars)} className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">
            {WINDOW_BARS.map((b) => <option key={b} value={b}>{b === 1.5 ? "1½" : b}</option>)}
          </select>
        </label>
      </div>
      {videosError && <p role="alert" className="text-rose-400">{videosError} The page can&apos;t say which video loses a level.</p>}
      <OverlayDrawProvider draw={drawToolOverlay}>
        <RecordVideo target={{ tool: "guitar-play-along:riff", steps: [], block: { id, cell, title: name } }} videos={videos} drawn={drawn}
          tempo={{ bpm, bars }} oldTakeKey={id} kit={kit}>
          {drawn ? <Tool tool={drawn} /> : <p className="text-sm text-slate-300">Add a note to the riff to draw it over the camera. The video records without it.</p>}
        </RecordVideo>
      </OverlayDrawProvider>
      <HowTakesWork bpm={bpm} />
    </section>
  );
}

/** The riff maker's help on recording: the steps, filming with an iPhone, and printing and placing the neck markers. */
function HowTakesWork({ bpm }: { bpm: number }) {
  return (
    <details className="text-slate-300">
      <summary className="cursor-pointer text-slate-400">How takes work</summary>
      <div className="mt-2 flex flex-col gap-2">
        <p>
          Press Start camera above to open the camera and your audio input, then press Record to play the riff. The take is kept in
          this browser with the riff until the next recording replaces it. With Click at {bpm} bpm ticked, the riff moves with the click
          over the camera and over the take, from beat 1 after the count-in. Without the click, press Play on the riff to start it.
          The sound comes from the input picked in the Input list (the same input as in the audio devices menu). The picture comes
          from the browser&apos;s camera.
        </p>
        <p>
          The View list picks what shows over the camera: Tool, the riff as its exercise draws it, or Sliding tab, Bar by bar or
          Chord box. Bars shown above sets how many bars Bar by bar shows at once. Players see Sliding tab, Bar by bar or Chord box
          only in a take saved after Export with overlay. Otherwise they see Tool.
        </p>
        <p>
          To film with an iPhone, turn on Continuity Camera on the phone (Settings → General → AirPlay &amp; Continuity), with the Mac and
          the phone on the same Apple ID. Put the phone near the Mac in landscape, locked, with the back camera on the guitar. Press
          Start camera once so the browser allows the camera, then pick the iPhone in the Camera list above: the camera switches
          to it. If the iPhone isn&apos;t in the list, quit Chrome (Cmd+Q) and open it again.
        </p>
        <p>
          Read the neck draws your fingertips and the markers it sees over the camera and over a saved take. Recording needs no
          markers. Markers are small black-and-white squares, like QR codes, that the camera can find. Print the{" "}
          <a href="/riff/neck-markers-frets-a3.pdf" target="_blank" rel="noreferrer" className="text-sky-400 underline">fret markers</a>{" "}
          (A3): they are the kind the camera reads (ARUCO_MIP_36h12), and other kinds won&apos;t be seen. With two placed markers in view it finds the frets, and the effects ticked under Effects are drawn on
          them. Covering a marker listed in Buttons turns on its filter. It doesn&apos;t run while you record.
        </p>
        <p>
          The take records the camera and the input only. To put what is drawn over it into the video, press Export with overlay: the
          take plays once from its start and is recorded with the view over it and, with Read the neck on, the neck effects, as they
          show then. Pick this tab in the share dialog and keep the tab in front until the take ends. Save file and Save for players then
          use the exported take.
        </p>
        <p>
          Save for players starts on This block only: the take becomes the video players see with this riff&apos;s exercise.
        </p>
        <p className="font-medium text-slate-200">Printing and placing markers</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Print the <a href="/riff/neck-markers-frets-a3.pdf" target="_blank" rel="noreferrer" className="text-sky-400 underline">fret markers</a> on
            A3. Each marker has its own number and its size under it, from 40 mm down to 12 mm (the black square only). Each size says how far up the neck it fits inside a fret space.
          </li>
          <li>Print on matte paper at 100% (&quot;Actual size&quot;, not &quot;Fit to page&quot;). Measure one black square with a ruler: it should match the size under it.</li>
          <li>Cut around each marker so a white edge about 3 mm wide stays on all sides. The camera needs that edge to find the square.</li>
          <li>
            Stick them on the edge of the fretboard nearest you, each one centred in its fret space, level with the dots on the fretboard.
            On a Squier Stratocaster or Telecaster (25.5&quot; scale) the fret spaces are about 36 mm wide at the nut, 27 mm at fret 5 and
            18 mm at fret 12, so the markers get smaller up the neck. A 30 mm one goes on the headstock just past the nut (fret 0), and a 40 mm one on the body, level with fret 19.
            Where each marker goes, under Read the neck, lists the layout on the test guitar, and Use the A3 layout fills Markers with it.
            For your own layout, type each marker&apos;s number and its fret into Markers, as number@fret. Fret 5 is the space between the 4th and 5th wires, where the fret 5 dot is. The headstock one is fret 0, with its size in mm after a slash (0@0/30).
          </li>
          <li>Test from where the camera will stand: press Start camera, turn on Read the neck, and play. Each marker&apos;s number should stay in the Markers label at the top left of the camera. If one keeps dropping out, print it bigger or move the camera closer.</li>
        </ol>
        <p className="font-medium text-slate-200">Colour dots (to try out)</p>
        <p>
          Round stickers and long stripes, to stick along both edges of the fretboard so the camera can find the edges and frets past the markers. The reader doesn&apos;t read them yet.
          Print the <a href="/riff/neck-dots-a4.pdf" target="_blank" rel="noreferrer" className="text-sky-400 underline">A4 dots</a> or the{" "}
          <a href="/riff/neck-dots-a3.pdf" target="_blank" rel="noreferrer" className="text-sky-400 underline">A3 dots</a> on matte sticker paper at 100%, in colour.
          Green goes on the near edge and cyan on the far edge. Magenta marks the nut and fret 12, lime frets 5 and 17, and violet frets 7 and 19. Blue is a spare. White is for a dark fretboard and black for a maple one.
          Use 3 or 4 mm on the top of the fretboard, outside the outer strings, or 5 mm on the side of the neck.
          The stripes run down the side of the sheet in green, cyan and magenta, in bands you cut into strips 2 to 5 mm wide. Cut out one of the two calibration cards at the top of the sheet and stick it beside the neck, in the camera&apos;s view.
        </p>
      </div>
    </details>
  );
}
