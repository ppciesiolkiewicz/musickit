"use client";

import Icon from "@/components/Icon";
import Photo, { type PhotoKey } from "./Photo";
import { DISPLAY } from "./Display";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Band } from "@/features/backing";
import { getAudioContext, getOutputBus, useAudioFocus, wakeAudio } from "@/features/sound";
import { degreeColour } from "@/features/theory/scales";
import { NoteDot } from "@/components/chordKit/NoteDot";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import type { ScaleCell } from "@/lib/chordKit/scalePositions";

/* Drawn pictures of private lessons inside the kit, not screenshots, so they follow the theme. */


const OPEN_BY_ROW = [64, 59, 55, 50, 45, 40]; // high e down to low E
const PC_NAME = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
/** semitones above A -> [degree index in the minor scale, label], for the five notes of A minor pentatonic */
const PENTA: Record<number, [number, string]> = { 0: [0, "R"], 3: [2, "♭3"], 5: [3, "4"], 7: [4, "5"], 10: [6, "♭7"] };
const MINOR_SEMI = [0, 2, 3, 5, 7, 8, 10];
/** Where each box starts on the neck: box 1 at the 5th fret, box 2 at the 7th. */
const BOX_FRET = { 1: 5, 2: 7 } as const;
type Box = keyof typeof BOX_FRET;
/** The root to ring in each box: [string row from high e, fret offset] */
const BOX_ROOT: Record<Box, [number, number]> = { 1: [0, 0], 2: [3, 0] };

type Cell = ScaleCell & { row: number; off: number; label: string };

/** A minor pentatonic notes inside a four-fret window starting at `start`. */
function boxCells(start: number): Cell[] {
  const out: Cell[] = [];
  OPEN_BY_ROW.forEach((open, row) => {
    for (let off = 0; off < 4; off++) {
      const midi = open + start + off;
      const semi = (midi - 57 + 120) % 12;
      const hit = PENTA[semi];
      if (hit) out.push({ string: 5 - row, fret: start + off, midi, pc: midi % 12, degree: hit[0], name: PC_NAME[midi % 12], semi: MINOR_SEMI[hit[0]], degreeText: hit[1], row, off, label: hit[1] });
    }
  });
  return out;
}
const CELLS: Record<Box, Cell[]> = { 1: boxCells(BOX_FRET[1]), 2: boxCells(BOX_FRET[2]) };

/** The loop the mini band plays (the Aeolian vamp in A) and each chord's pitch classes, so the neck can light its notes. */
const AM = { name: "Am", num: "i", quality: "minor", pcs: [9, 0, 4] };
const LOOP = [
  AM,
  { name: "F", num: "♭VI", quality: "major", pcs: [5, 9, 0] },
  { name: "G", num: "♭VII", quality: "major", pcs: [7, 11, 2] },
  AM,
];

/** The box drawn with the app's own note dots: hover names the note, a click plays it. `highlight` is a dot with a pulsing ring. */
function PentatonicBox({ box = 1, highlight, chordPcs }: { box?: Box; highlight?: [number, number]; chordPcs?: number[] }) {
  const { active, tap } = useNotePlayer();
  return (
    <svg viewBox="0 0 260 132" className="w-full overflow-visible" role="img" aria-label={`A minor pentatonic box ${box} at the ${BOX_FRET[box]}th fret, notes coloured by degree. Click a note to hear it.`}>
      <rect x={20} y={6} width={232} height={120} rx={6} fill="var(--color-slate-900)" />
      {[0, 1, 2, 3, 4].map((f) => <line key={f} x1={20 + f * 58} x2={20 + f * 58} y1={6} y2={126} stroke="var(--color-slate-700)" strokeWidth={2} />)}
      {[0, 1, 2, 3, 4, 5].map((s) => <line key={s} x1={20} x2={252} y1={16 + s * 20} y2={16 + s * 20} stroke="var(--color-slate-500)" strokeOpacity={0.7} strokeWidth={0.8 + s * 0.3} />)}
      <text x={8} y={70} fontSize={10} fill="var(--color-slate-500)" textAnchor="middle">{BOX_FRET[box]}</text>
      {CELLS[box].map((c) => {
        const lit = highlight && highlight[0] === c.row && highlight[1] === c.off;
        const key = `${box}-${c.row}-${c.off}`;
        const x = 49 + c.off * 58;
        const y = 16 + c.row * 20;
        return (
          <g key={key}>
            {lit && <circle cx={x} cy={y} r={15} fill="none" stroke={degreeColour(c.degree)} strokeWidth={2.5} className="wheel-ripple pointer-events-none" style={{ animationIterationCount: "infinite", animationDuration: "1.6s" }} />}
            <NoteDot c={c} x={x} y={y} r={lit ? 11 : 9} ring={false} label={c.label} hover={c.name} active={active === key} dim={false} accent={!!chordPcs && chordPcs.includes(c.pc)} onNote={() => tap(key, c.midi)} />
          </g>
        );
      })}
    </svg>
  );
}

/** The smallest backing band: one play button over an A minor loop (the app's own band, drums, bass and keys). Its settings are not saved. */
/** Where the band is: the chord now playing and how far through its bar (0-1). */
type Pos = { chord: number; frac: number };

function MiniBacking({ pos, onPos }: { pos: Pos | null; onPos: (p: Pos | null) => void }) {
  const [band] = useState(() => {
    const b = new Band({ context: getAudioContext, destination: getOutputBus, wake: wakeAudio });
    b.set({ progression: "aeolian", tonic: "A", style: "rock", bpm: 80 });
    return b;
  });
  const snap = useSyncExternalStore(band.subscribe, band.getSnapshot, band.getSnapshot);
  useEffect(() => () => band.stop(), [band]);
  const focus = useAudioFocus(snap.playing, () => band.stop());
  // follow the band's chord while it plays and tell the neck, which lights that chord's notes
  useEffect(() => {
    if (!snap.playing) {
      onPos(null);
      return;
    }
    let raf = 0;
    let last = "";
    const tick = () => {
      const p = band.position();
      const key = p ? `${p.chord}:${p.beat}` : "";
      if (key !== last) {
        last = key;
        onPos(p ? { chord: p.chord, frac: (p.beat + 1) / p.beatsPerBar } : null);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [band, snap.playing, onPos]);
  return (
    <div ref={focus} className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
      <div className="flex items-center gap-3">
      <button type="button" onClick={() => band.toggle()} aria-pressed={snap.playing}
        className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition ${snap.playing ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"}`}>
        <Icon name={snap.playing ? "square" : "play"} size={14} fill />{snap.playing ? "Stop" : "Backing track"}
      </button>
      <span className="text-xs text-slate-500">Aeolian loop · 80 bpm</span>
      </div>
      {/* the loop: each chord with its place in A minor and its quality, filling as the bars go by */}
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Chords of the loop" aria-live="polite">
        {LOOP.map((c, i) => {
          const now = pos?.chord === i;
          const fill = !pos ? 0 : i < pos.chord ? 1 : now ? pos.frac : 0;
          return (
            <li key={i} className={`relative overflow-hidden rounded-lg border px-1.5 pb-2 pt-1 text-center transition ${now ? "border-sky-400/70 bg-sky-400/10" : "border-slate-800"}`}>
              <span className={`block text-sm font-semibold ${now ? "text-sky-100" : "text-slate-300"}`}>{c.name}</span>
              <span className="block text-xs text-amber-200">{c.num}</span>
              <span className="block text-[10px] text-slate-500">{c.quality}</span>
              <span className="absolute inset-x-0 bottom-0 h-1 bg-slate-800"><span className="block h-full bg-sky-400 transition-[width] duration-300" style={{ width: `${fill * 100}%` }} /></span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type Step = "b1" | "b2" | "imp";

/** What a student gets after a lesson: the shape, the plan, what comes next. Tap a plan line and the picture follows; "improvise" brings up a backing track. */
export function LessonNoteMock({ compact = false, startOn = "b1" }: { compact?: boolean; /** which plan line is open first: a box, or "imp" for the improvise line with the backing track */ startOn?: Step }) {
  const [step, setStep] = useState<Step>(startOn);
  const [pos, setPos] = useState<Pos | null>(null);
  const chord = pos?.chord ?? null;
  const [done, setDone] = useState<Record<Step, boolean>>({ b1: true, b2: false, imp: false });
  const box: Box = step === "b2" ? 2 : 1;
  const items: { id: Step; t: string }[] = [
    { id: "b1", t: "Box 1 up and down, landing on R" },
    { id: "b2", t: "Box 2, the same way, from the 7th fret" },
    { id: "imp", t: "Improvise over the A minor loop, 5 min a day" },
  ];
  const pick = (id: Step) => {
    setStep(id);
    setDone((d) => ({ ...d, [id]: id === step ? !d[id] : true }));
  };
  return (
    <div className={`relative rounded-2xl border border-slate-700/70 bg-slate-950 shadow-2xl shadow-black/30 ${compact ? "p-3" : "p-4 sm:p-5"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Lesson note · week 3</p>
          <p className="text-lg text-slate-100" style={DISPLAY}>Minor pentatonic, box {box}</p>
        </div>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">Preview</span>
      </div>
      <PentatonicBox box={box} highlight={step === "imp" && chord === null ? BOX_ROOT[1] : undefined} chordPcs={step === "imp" && chord !== null ? LOOP[chord].pcs : undefined} />
      <ul className={`flex flex-col gap-0.5 text-slate-300 ${compact ? "mt-2 text-[13px]" : "mt-3 text-sm"}`}>
        {items.map((x) => (
          <li key={x.id}>
            <button type="button" role="checkbox" aria-checked={done[x.id]} onClick={() => pick(x.id)}
              className={`flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left transition hover:bg-slate-800/60 ${step === x.id ? "bg-slate-800/50 ring-1 ring-sky-400/40" : ""}`}>
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${done[x.id] ? "bg-emerald-500 text-slate-950" : "border border-slate-600"}`}>{done[x.id] && <Icon name="check" size={11} />}</span>
              <span className={done[x.id] ? "text-slate-400" : ""}>{x.t}</span>
            </button>
          </li>
        ))}
      </ul>
      {step === "imp" && <div className="mt-2"><MiniBacking pos={pos} onPos={setPos} /></div>}
      {!compact && <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">Next time: add the ♭5 and it becomes the blues scale.</p>}
    </div>
  );
}

/** A video call tile: a cropped stock photo framed on the face, with the name tag and a mic dot like a real call. */
function Tile({ label, photo, focus, zoom = 1, speaking = false }: { label: string; photo: PhotoKey; focus: string; zoom?: number; speaking?: boolean }) {
  return (
    <div className={`relative aspect-4/3 overflow-hidden rounded-xl ${speaking ? "ring-2 ring-emerald-400" : "ring-1 ring-slate-700"}`}>
      {/* zoomed in round the face, so a wide shot reads as a webcam */}
      <div className="h-full w-full" style={{ transform: `scale(${zoom})`, transformOrigin: focus }}>
        <Photo name={photo} focus={focus} width={600} sizes="240px" credit={false} fixed className="h-full w-full" />
      </div>
      <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-slate-950/70 px-1.5 text-[10px] text-slate-100">
        {speaking && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
        {label}
      </span>
    </div>
  );
}

/** A lesson in progress: teacher and student on camera, and between them the neck the teacher just brought up, a note pointed at. */
export function LiveLessonMock() {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-3 shadow-2xl shadow-black/30 backdrop-blur sm:p-4">
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
        <span className="font-medium text-slate-200">Live lesson</span>
        <span className="tabular-nums">24:10</span>
        <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5">Preview</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <div className="relative rounded-xl border border-slate-800 bg-slate-950/60 p-2">
          <p className="mb-1 px-1 text-[11px] text-slate-500">Your teacher is showing <b className="font-medium text-slate-300">A minor pentatonic</b></p>
          <PentatonicBox highlight={[2, 2]} />
          {/* the teacher's pointer, as in a shared document */}
          <div className="pointer-events-none absolute left-[52%] top-[50%] flex items-start gap-1" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 1l5.5 13 1.8-5.2L13.5 7z" fill="var(--color-sky-400)" stroke="var(--color-slate-950)" strokeWidth="1" /></svg>
            <span className="mt-3 whitespace-nowrap rounded-md bg-sky-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">Bend this one</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Tile label="Teacher" photo="teacherSmile" focus="40% 32%" zoom={1.7} speaking />
          <Tile label="You" photo="couch" focus="50% 25%" zoom={1.5} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        {[
          { l: "Scales", c: "border-amber-500/40 text-amber-200" },
          { l: "Chords", c: "border-sky-500/40 text-sky-200" },
          { l: "Drone", c: "border-violet-500/40 text-violet-200" },
          { l: "Looper", c: "border-teal-500/40 text-teal-200" },
          { l: "Tuner", c: "border-emerald-500/40 text-emerald-200" },
        ].map((t) => (
          <span key={t.l} className={`rounded-full border px-2 py-0.5 ${t.c}`}>{t.l}</span>
        ))}
        <span className="text-slate-500">one click away</span>
      </div>
    </div>
  );
}
