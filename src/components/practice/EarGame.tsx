"use client";

import Link from "next/link";
import { useState } from "react";
import MiniPiano from "@/components/theory/MiniPiano";
import { INTERVALS, pianoFrom } from "@/lib/chordKit/intervals";
import { playMelody, strum } from "@/features/sound";
import { CHORD_QUALITIES, EAR_LEVELS, activeAnswers, nextEarQuestion, recordScore, type Direction, type EarQuestion, type EarSettings, type Score } from "@/lib/practice/earGame";
import { btn, btnPrimary, panel, writeQuery } from "./shared";
import { Chip, ChipRow } from "@/components/ui";

const DIRS: { id: Direction; label: string }[] = [
  { id: "up", label: "Rising" },
  { id: "down", label: "Falling" },
  { id: "together", label: "Together" },
];

const settingsQuery = (s: EarSettings) =>
  new URLSearchParams({ kind: s.kind, level: String(s.level), dir: s.direction, ...(s.custom ? { set: s.custom.join(",") } : {}) }).toString();
const labelOf = (answer: string) => CHORD_QUALITIES.find((c) => c.id === answer)?.label ?? INTERVALS.find((i) => i.short === answer)?.name ?? answer;

function play(q: EarQuestion) {
  if (q.together) strum(q.midi, { gapMs: 0, holdMs: 1600 });
  else playMelody(q.midi, 650);
}

/** Interval and chord-quality ear training. Settings live in the URL so a teacher can share a set-up. */
export default function EarGame({ initial }: { initial: EarSettings }) {
  const [s, setS] = useState(initial);
  const [q, setQ] = useState<EarQuestion | null>(null);
  const [answered, setAnswered] = useState<{ pick: string; ok: boolean } | null>(null);
  const [score, setScore] = useState<Score>({});
  const answers = activeAnswers(s);

  const update = (patch: Partial<EarSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    writeQuery(settingsQuery(next));
    setQ(null);
    setAnswered(null);
  };
  const next = () => {
    const n = nextEarQuestion(s, Math.random, q ?? undefined);
    setQ(n);
    setAnswered(null);
    play(n);
  };
  const pick = (a: string) => {
    if (!q || answered) return;
    const ok = a === q.answer;
    setAnswered({ pick: a, ok });
    setScore((sc) => recordScore(sc, q.answer, ok));
  };
  const toggleCustom = (semis: number) => {
    const cur = s.custom ?? EAR_LEVELS.filter((l) => l.n <= s.level).flatMap((l) => l.semis);
    const set = cur.includes(semis) ? cur.filter((x) => x !== semis) : [...cur, semis];
    if (set.length) update({ custom: set });
  };
  const info = q && s.kind === "interval" ? INTERVALS.find((i) => i.short === q.answer) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <section className={`${panel} flex flex-col gap-2`}>
        <ChipRow label="Train">
          <Chip on={s.kind === "interval"} onClick={() => update({ kind: "interval" })}>Intervals</Chip>
          <Chip on={s.kind === "chord"} onClick={() => update({ kind: "chord" })}>Chord quality</Chip>
        </ChipRow>
        {s.kind === "interval" && (
          <>
            <ChipRow label="Level" info="Each level adds intervals to the ones before. Start with the 5th and octave, the most open sounds, then the 3rds that make chords major or minor.">
              {EAR_LEVELS.map((l) => <Chip key={l.n} on={!s.custom && s.level === l.n} onClick={() => update({ level: l.n, custom: null })} title={l.label}>{l.n}</Chip>)}
            </ChipRow>
            <ChipRow label="Custom set">
              {INTERVALS.map((i) => <Chip key={i.semis} on={answers.includes(i.short)} onClick={() => toggleCustom(i.semis)} title={i.name}>{i.short}</Chip>)}
            </ChipRow>
            <ChipRow label="Played">{DIRS.map((d) => <Chip key={d.id} on={s.direction === d.id} onClick={() => update({ direction: d.id })}>{d.label}</Chip>)}</ChipRow>
          </>
        )}
      </section>

      <section className={panel}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" className={btnPrimary} onClick={next}>{q ? "Next" : "Start"}</button>
          {q && <button type="button" className={btn} onClick={() => play(q)}>Replay</button>}
          <span className="text-sm text-slate-400">{q ? (answered ? "" : s.kind === "chord" ? "What kind of chord?" : "Which interval?") : "Press Start and listen."}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {answers.map((a) => {
            const right = answered && a === q?.answer, wrong = answered && !answered.ok && a === answered.pick;
            return (
              <button key={a} type="button" onClick={() => pick(a)} disabled={!q}
                className={`rounded-full border px-3 py-1 text-sm transition ${right ? "border-emerald-400 bg-emerald-500/20 text-emerald-100" : wrong ? "border-rose-400 bg-rose-500/20 text-rose-100" : "border-slate-700 text-slate-200 hover:border-slate-500"} disabled:opacity-40`}>
                {s.kind === "chord" ? labelOf(a) : a}
              </button>
            );
          })}
        </div>
        {answered && q && (
          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
            <p className={answered.ok ? "text-emerald-300" : "text-rose-300"}>{answered.ok ? "Right" : "Not quite"}: {labelOf(q.answer)}.</p>
            {info && <p>Memory hook: the start of <i>{info.song}</i>. <Link className="text-sky-300 hover:underline" href={`/theory/basics?interval=${info.semis}#intervals`}>See it on the guitar →</Link></p>}
            <div className="max-w-md"><MiniPiano from={pianoFrom(q.midi)} lit={q.midi.map((m, i) => ({ midi: m, label: i === 0 ? "1st" : "", colour: i === 0 ? "#f8fafc" : "#f59e0b" }))} /></div>
          </div>
        )}
      </section>

      {Object.keys(score).length > 0 && (
        <section className={panel}>
          <h2 className="mb-2 text-sm font-medium text-slate-100">How you are doing</h2>
          <table className="text-sm text-slate-300">
            <tbody>
              {Object.entries(score).map(([a, v]) => (
                <tr key={a}><td className="pr-4 text-slate-400">{labelOf(a)}</td><td className="tabular-nums">{v.right}/{v.total}</td><td className="pl-3 tabular-nums text-slate-500">{Math.round((100 * v.right) / v.total)}%</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
