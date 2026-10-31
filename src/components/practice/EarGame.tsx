"use client";

import Link from "next/link";
import { useState } from "react";
import MiniPiano from "@/components/theory/MiniPiano";
import { INTERVALS, pianoFrom } from "@/lib/chordKit/intervals";
import { playMelody, strum } from "@/features/sound";
import { CHORD_QUALITIES, EAR_LEVELS, activeAnswers, nextEarQuestion, recordScore, type Direction, type EarQuestion, type EarSettings, type Score } from "@/lib/practice/earGame";
import { SetupTag, btn, btnPrimary, panel, writeQuery } from "./shared";
import { Chip, ChipRow } from "@/components/ui";

const DIRS: { id: Direction; label: string; mark: string }[] = [
  { id: "up", label: "Rising", mark: "↗" },
  { id: "down", label: "Falling", mark: "↘" },
  { id: "together", label: "Together", mark: "≡" },
];

const settingsQuery = (s: EarSettings) =>
  new URLSearchParams({ kind: s.kind, level: String(s.level), dir: s.direction, ...(s.custom ? { set: s.custom.join(",") } : {}), ...(s.wide ? { wide: "1" } : {}) }).toString();
const labelOf = (answer: string) => CHORD_QUALITIES.find((c) => c.id === answer)?.label ?? INTERVALS.find((i) => i.short === answer)?.name ?? answer;

function play(q: EarQuestion) {
  if (q.together) strum(q.midi, { gapMs: 0, holdMs: 1600 });
  else playMelody(q.midi, 650);
}

/** Interval and chord-quality ear training. Settings live in the URL so a teacher can share a set-up. */
export default function EarGame({ initial, syncUrl = true, bare = false }: { initial: EarSettings; /** write the settings to the address bar (off when embedded in another page) */ syncUrl?: boolean; /** settings fixed by the host: no settings panel */ bare?: boolean }) {
  const [s, setS] = useState(initial);
  const [q, setQ] = useState<EarQuestion | null>(null);
  const [answered, setAnswered] = useState<{ pick: string; ok: boolean } | null>(null);
  const [score, setScore] = useState<Score>({});
  const answers = activeAnswers(s);

  const update = (patch: Partial<EarSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    if (syncUrl) writeQuery(settingsQuery(next));
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
      {!bare && <section className={`${panel} flex flex-col gap-2`}>
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
            <ChipRow label="Span" info="Within an octave, or sometimes an octave wider (a 9th for a 2nd). Wider is harder: answer with the simple interval name.">
              <Chip on={!s.wide} onClick={() => update({ wide: false })}>Within an octave</Chip>
              <Chip on={s.wide} onClick={() => update({ wide: true })}>Multi-octave</Chip>
            </ChipRow>
            <ChipRow label="Played">{DIRS.map((d) => <Chip key={d.id} on={s.direction === d.id} onClick={() => update({ direction: d.id })}>{d.label}</Chip>)}</ChipRow>
          </>
        )}
      </section>}

      <section className={panel}>
        {bare && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5" aria-label="Set up as">
            {s.kind === "chord" ? <SetupTag tone="violet">Chord quality</SetupTag> : (() => {
              const d = DIRS.find((x) => x.id === s.direction)!;
              return <>
                <SetupTag tone="amber"><span aria-hidden className="text-sm leading-none">{d.mark}</span>{d.label}</SetupTag>
                <SetupTag tone="teal">{s.wide ? "Multi-octave" : "Within an octave"}</SetupTag>
              </>;
            })()}
          </div>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" className={btnPrimary} onClick={next}>{q ? "Next" : "Start"}</button>
          {q && <button type="button" className={`cursor-pointer ${btn}`} onClick={() => play(q)}>Replay</button>}
          <span className="text-sm text-slate-400">{q ? (answered ? "" : s.kind === "chord" ? "What kind of chord?" : "Which interval?") : "Press Start and listen."}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {answers.map((a) => {
            const right = answered && a === q?.answer, wrong = answered && !answered.ok && a === answered.pick;
            return (
              <button key={a} type="button" onClick={() => pick(a)} disabled={!q}
                className={`min-w-14 cursor-pointer rounded-lg border-2 px-4 py-2 text-base font-semibold transition active:scale-[0.96] disabled:cursor-default disabled:opacity-40 ${right ? "border-emerald-400 bg-emerald-500/25 text-emerald-50" : wrong ? "border-rose-400 bg-rose-500/25 text-rose-50" : "border-slate-600 bg-slate-800 text-slate-50 hover:border-sky-400 hover:bg-slate-700"}`}>
                {s.kind === "chord" ? labelOf(a) : a}
              </button>
            );
          })}
        </div>
        {answered && q && (
          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
            <p className={answered.ok ? "text-emerald-300" : "text-rose-300"}>{answered.ok ? "Right" : "Not quite"}: {labelOf(q.answer)}.</p>
            {info && <p>Memory hook: the start of <i>{info.song}</i>. <Link className="text-sky-300 hover:underline" href={`/theory/basics?interval=${info.semis}#intervals`}>See it on the guitar →</Link></p>}
            <div className="max-w-md"><MiniPiano from={pianoFrom(q.midi)} octaves={Math.max(...q.midi) - pianoFrom(q.midi) >= 24 ? 3 : 2} lit={q.midi.map((m, i) => ({ midi: m, label: i === 0 ? "1st" : "", colour: i === 0 ? "#f8fafc" : "#f59e0b" }))} /></div>
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
