"use client";

import { useEffect, useRef, useState } from "react";
import { getSharedPiano, noteToMidi, onSilence, playSequence, type Step } from "@/features/sound";
import { TERM_FIGURES, type BeatsFigure, type KeysFigure, type TuneFigure } from "./termFigures";

/** An explained word's picture (`TERM_FIGURES`), drawn small enough for its note, with a Play button for each part. */
export default function TermFigure({ id }: { id: string }) {
  const figure = TERM_FIGURES[id];
  useEffect(() => void getSharedPiano(), []); // start loading the piano while the note is read
  if (!figure) return null;
  return (
    <span className="flex flex-col gap-1.5">
      {figure.kind === "tune" ? <Tune figure={figure} /> : figure.kind === "keys" ? <Keys figure={figure} /> : <Beats figure={figure} />}
      <span className="text-slate-400">{figure.caption}</span>
    </span>
  );
}

const midi = (note: string) => noteToMidi(note) ?? 60;
const letter = (note: string) => note.replace(/-?\d+$/, "");

type Hit = Step & { mark: number };

/** Plays notes on the shared piano and lights each one's mark while it sounds. */
function usePlay() {
  const [lit, setLit] = useState<number[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setLit([]);
    };
    const off = onSilence(clear);
    return () => {
      off();
      timers.current.forEach(clearTimeout);
    };
  }, []);
  const play = (hits: Hit[]) => {
    playSequence(hits.map(({ note, at, hold }) => ({ note, at, hold }))); // silences the last one, which clears its lights
    for (const h of hits) {
      timers.current.push(setTimeout(() => setLit((l) => [...l, h.mark]), h.at));
      timers.current.push(setTimeout(() => setLit((l) => l.filter((m) => m !== h.mark)), h.at + Math.min(h.hold, 600)));
    }
  };
  return { lit, play };
}

function PlayButton({ label, onPlay }: { label: string; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-200 hover:border-sky-500 hover:text-sky-200"
    >
      <span aria-hidden className="text-sky-300">▶</span>
      {label}
    </button>
  );
}

const W = 240;
const STEP_MS = 380;

function Tune({ figure }: { figure: TuneFigure }) {
  const { lit, play } = usePlay();
  const count = figure.groups.reduce((n, g) => n + g.notes.length, 0);
  const gap = figure.groups.length > 1 ? 18 : 0;
  const dx = Math.min(26, (W - 16 - gap * (figure.groups.length - 1)) / count);
  const all = figure.groups.flatMap((g) => g.notes.map(midi));
  const lo = Math.min(...all), hi = Math.max(...all);
  const under = figure.groups.some((g) => g.under);
  const top = 12, span = 46, drone = figure.drone ? 10 : 0;
  const y = (m: number) => top + (hi === lo ? span / 2 : ((hi - m) / (hi - lo)) * span);
  const h = top + span + 12 + drone + (under ? 12 : 0);
  const width = 16 + dx * count + gap * (figure.groups.length - 1);

  const groups = figure.groups.map((g, gi) => {
    const before = figure.groups.slice(0, gi).reduce((n, p) => n + p.notes.length, 0);
    const x0 = 8 + gi * gap + before * dx;
    const dots = g.notes.map((n, k) => ({ note: n, x: x0 + k * dx + dx / 2, y: y(midi(n)), mark: before + k, under: g.under?.[k] }));
    return { ...g, dots, x0 };
  });

  const playGroup = (gi: number) => {
    const g = groups[gi];
    const hits: Hit[] = g.dots.map((d, k) => ({ note: midi(d.note), at: k * STEP_MS, hold: STEP_MS * 0.9, mark: d.mark }));
    if (figure.drone) hits.push({ note: midi(figure.drone), at: 0, hold: g.dots.length * STEP_MS + 300, mark: -1 });
    play(hits);
  };

  return (
    <>
      <svg viewBox={`0 0 ${width} ${h}`} className="w-full" style={{ maxWidth: width }} aria-hidden>
        {groups.map((g, gi) => (
          <g key={gi}>
            <polyline points={g.dots.map((d) => `${d.x},${d.y}`).join(" ")} className="fill-none stroke-slate-600" strokeWidth={1} />
            {g.dots.map((d) => {
              const on = lit.includes(d.mark);
              return (
                <g key={d.mark}>
                  <circle cx={d.x} cy={d.y} r={8} className={on ? "fill-sky-400 stroke-sky-200" : "fill-slate-800 stroke-slate-500"} strokeWidth={1} />
                  <text x={d.x} y={d.y + 3} textAnchor="middle" fontSize={8} className={on ? "fill-slate-950" : "fill-slate-100"}>{letter(d.note)}</text>
                  {d.under && <text x={d.x} y={h - 2} textAnchor="middle" fontSize={7.5} className={on ? "fill-sky-300" : "fill-slate-400"}>{d.under}</text>}
                </g>
              );
            })}
          </g>
        ))}
        {figure.drone && (
          <g>
            <line x1={8} x2={width - 8} y1={top + span + 14} y2={top + span + 14} strokeWidth={3} strokeLinecap="round" className={lit.includes(-1) ? "stroke-amber-300" : "stroke-amber-700"} />
          </g>
        )}
      </svg>
      <span className="flex flex-wrap gap-1">
        {groups.map((g, gi) => <PlayButton key={gi} label={g.label} onPlay={() => playGroup(gi)} />)}
      </span>
    </>
  );
}

const BLACK = new Set([1, 3, 6, 8, 10]);

function Keys({ figure }: { figure: KeysFigure }) {
  const { lit, play } = usePlay();
  const [shown, setShown] = useState(0);
  const all = figure.groups.flatMap((g) => g.notes.map(midi));
  const first = Math.min(...all) - (((Math.min(...all) % 12) + 12) % 12);
  let last = Math.max(first + 11, ...all);
  if (BLACK.has(last % 12)) last++;
  const whites: number[] = [], blacks: number[] = [];
  for (let m = first; m <= last; m++) (BLACK.has(m % 12) ? blacks : whites).push(m);
  const kw = W / whites.length, kh = 50, bw = kw * 0.6;
  const xOf = (m: number) => (BLACK.has(m % 12) ? whites.indexOf(m - 1) * kw + kw - bw / 2 : whites.indexOf(m) * kw);
  const group = figure.groups[shown];
  const marked = new Map(group.notes.map((n) => [midi(n), letter(n)]));

  const playGroup = (gi: number) => {
    setShown(gi);
    const g = figure.groups[gi];
    play(g.notes.map((n, k) => g.together
      ? { note: midi(n), at: k * 40, hold: 1400, mark: midi(n) }
      : { note: midi(n), at: k * 500, hold: 450, mark: midi(n) }));
  };

  const fill = (m: number, black: boolean) =>
    lit.includes(m) ? "fill-sky-300" : marked.has(m) ? "fill-sky-600" : black ? "fill-slate-950" : "fill-slate-200";

  return (
    <>
      <svg viewBox={`0 0 ${W} ${kh + 14}`} className="w-full" aria-hidden>
        {whites.map((m) => <rect key={m} x={xOf(m) + 0.5} y={0.5} width={kw - 1} height={kh} rx={2} className={`${fill(m, false)} stroke-slate-500`} strokeWidth={1} />)}
        {blacks.map((m) => <rect key={m} x={xOf(m)} y={0.5} width={bw} height={kh * 0.6} rx={1.5} className={`${fill(m, true)} stroke-slate-700`} strokeWidth={1} />)}
        {[...marked].map(([m, name]) => {
          const cx = xOf(m) + (BLACK.has(m % 12) ? bw : kw) / 2;
          return <text key={m} x={cx} y={kh + 12} textAnchor="middle" fontSize={9} className={lit.includes(m) ? "fill-sky-300" : "fill-slate-300"}>{name}</text>;
        })}
      </svg>
      <span className="flex flex-wrap gap-1">
        {figure.groups.map((g, gi) => <PlayButton key={gi} label={g.label} onPlay={() => playGroup(gi)} />)}
      </span>
    </>
  );
}

function Beats({ figure }: { figure: BeatsFigure }) {
  const { lit, play } = usePlay();
  const per = figure.counts.length;
  const slots = figure.bars * 4 * per;
  const sw = W / slots;
  const label = (s: number) => (s % per === 0 ? String((Math.floor(s / per) % 4) + 1) : figure.counts[s % per]);

  const playAt = (bpm: number) => {
    const ms = 60000 / bpm / per;
    play(Array.from({ length: slots }, (_, s) => ({
      note: s % (4 * per) === 0 ? "C6" : s % per === 0 ? "G5" : "C5",
      at: s * ms,
      hold: Math.max(80, ms * 0.6),
      mark: s,
    })));
  };

  return (
    <>
      <svg viewBox={`0 0 ${W} 34`} className="w-full" aria-hidden>
        {Array.from({ length: slots }, (_, s) => {
          const on = lit.includes(s), beat = s % per === 0, barStart = s % (4 * per) === 0;
          return (
            <g key={s}>
              {barStart && s > 0 && <line x1={s * sw} x2={s * sw} y1={0} y2={22} strokeWidth={2} className="stroke-slate-400" />}
              <rect x={s * sw + 1.5} y={beat ? 2 : 6} width={sw - 3} height={beat ? 18 : 14} rx={2} className={on ? "fill-sky-400" : beat ? "fill-slate-600" : "fill-slate-800"} />
              <text x={s * sw + sw / 2} y={32} textAnchor="middle" fontSize={per === 4 ? 7.5 : 9} className={on ? "fill-sky-300" : beat ? "fill-slate-200" : "fill-slate-400"}>{label(s)}</text>
            </g>
          );
        })}
      </svg>
      <span className="flex flex-wrap gap-1">
        {figure.bpms.map((bpm) => <PlayButton key={bpm} label={figure.bpms.length > 1 ? `${bpm} bpm` : "Play"} onPlay={() => playAt(bpm)} />)}
      </span>
    </>
  );
}
