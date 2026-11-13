"use client";

import Link from "next/link";
import { useState } from "react";
import MiniPiano from "@/components/theory/MiniPiano";
import { INTERVALS, pianoFrom } from "@/lib/chordKit/intervals";
import { playMelody, strum } from "@/features/sound";
import { CHORD_QUALITIES, EAR_LEVELS, activeAnswers, levelSemis, nextEarQuestion, recordScore, type Direction, type EarQuestion, type EarSettings, type Score } from "@/lib/practice/earGame";
import Icon from "@/components/Icon";
import { GameChoice, SetupTag, Stage, Stat, btn, btnBig, panel, writeQuery } from "./shared";
import { useToolKeys } from "./toolKeys";
import { Chip, ChipRow, Hint, KeyCap } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { Volume } from "./ToolSettings";
import { DIRECTIONS, DirectionChips } from "./DirectionChips";

const DIRS: Direction[] = ["up", "down", "together"];

const KINDS: { id: EarSettings["kind"]; title: string; about: string }[] = [
  { id: "interval", title: "Intervals", about: "Hear two notes and name the gap between them." },
  { id: "chord", title: "Chord quality", about: "Hear a chord and name its kind." },
];

const ONE_TO_TWELVE = INTERVALS.filter((i) => i.semis >= 1 && i.semis <= 12);

/** The keys that pick an answer, in the order the answers are drawn. */
const ANSWER_KEYS = "1234567890-=";

const settingsQuery = (s: EarSettings) =>
  new URLSearchParams({ kind: s.kind, level: String(s.level), dir: s.direction, ...(s.custom ? { set: s.custom.join(",") } : {}), ...(s.wide ? { wide: "1" } : {}) }).toString();
const labelOf = (answer: string) => CHORD_QUALITIES.find((c) => c.id === answer)?.label ?? INTERVALS.find((i) => i.short === answer)?.name ?? answer;

function play(q: EarQuestion) {
  if (q.together) strum(q.midi, { gapMs: 0, holdMs: 1600 });
  else playMelody(q.midi, 650);
}

/** Interval and chord-quality ear training. Settings live in the URL so a teacher can share a set-up. */
export default function EarGame({ initial, syncUrl = true, bare = false }: { initial: EarSettings; /** write the settings to the address bar (off when embedded in another page) */ syncUrl?: boolean; /** settings fixed by the host: no settings panel */ bare?: boolean }) {
  useCoverage({ hints: 4 });
  const [s, setS] = useState(initial);
  const [q, setQ] = useState<EarQuestion | null>(null);
  const [answered, setAnswered] = useState<{ pick: string; ok: boolean } | null>(null);
  const [score, setScore] = useState<Score>({});
  /** The last question answered: its notes stay laid out (hidden) under the next question, so the page doesn't jump. */
  const [shown, setShown] = useState<EarQuestion | null>(null);
  const answers = activeAnswers(s);

  const update = (patch: Partial<EarSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    if (syncUrl) writeQuery(settingsQuery(next));
    setQ(null);
    setAnswered(null);
    setShown(null);
  };
  const next = () => {
    const n = nextEarQuestion(s, Math.random, q ?? undefined);
    setQ(n);
    setAnswered(null);
    play(n);
  };
  const replay = () => {
    if (q) play(q);
  };
  const pick = (a: string) => {
    if (!q || answered) return;
    const ok = a === q.answer;
    setAnswered({ pick: a, ok });
    setShown(q);
    setScore((sc) => recordScore(sc, q.answer, ok));
  };

  const toggleCustom = (semis: number) => {
    const cur = s.custom ?? levelSemis(s.level);
    const set = cur.includes(semis) ? cur.filter((x) => x !== semis) : [...cur, semis];
    if (set.length) update({ custom: set });
  };
  // the first Custom starts from the level it came from
  const pickCustom = () => {
    if (!s.custom) update({ custom: levelSemis(s.level) });
  };
  // Space and Enter press the big button: Start or Next, or Replay while a question waits. Skip has no key, so Space
  // never throws a question away. R replays, the number keys answer; on a page of several
  // tools, the one last tapped or most on screen takes them
  const keys = useToolKeys((e, onControl) => {
    if (e.key === " " || e.key === "Enter") {
      if (onControl) return;
      if (q && !answered) replay();
      else next();
      return true;
    }
    if (q && e.key.toLowerCase() === "r") {
      replay();
      return true;
    }
    if (q && !answered && e.key.length === 1) {
      const a = answers[ANSWER_KEYS.indexOf(e.key)];
      if (a) {
        pick(a);
        return true;
      }
    }
  });
  // laid out (hidden) from the first question on: the last answered one, else the current one
  const laid = shown ?? q;
  const info = laid && s.kind === "interval" ? INTERVALS.find((i) => i.short === laid.answer) : undefined;

  const total = Object.values(score).reduce((n, v) => n + v.total, 0);
  const right = Object.values(score).reduce((n, v) => n + v.right, 0);
  const prompt = !q ? (s.kind === "chord" ? "A chord plays. Name its kind." : "Two notes play. Name the gap between them.")
    : "Replay it as often as you like, then pick an answer.";
  const question = !q ? "Press Start and listen." : answered ? (answered.ok ? "Right!" : "Not quite.") : s.kind === "chord" ? "What kind of chord?" : "Which interval?";

  /** Key caps only where the keys work: on the tool that has them, not on touch screens. */
  const cap = (key: string) => keys.armed && <KeyCap className="hidden md:inline">{key}</KeyCap>;

  const setup = !bare && (
    <section data-tour="ears-settings" className={`${panel} flex flex-col gap-2`}>
      <h2 className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Set up the training</h2>
      {s.kind === "interval" && (
        <>
          <ChipRow label="Level" info="Each level adds intervals to the ones before. Start with the 5th and octave, the most open sounds, then the 3rds that make chords major or minor. Custom lets you pick your own.">
            {EAR_LEVELS.map((l) => <Chip key={l.n} on={!s.custom && s.level === l.n} onClick={() => update({ level: l.n, custom: null })} title={l.label}>{l.n}</Chip>)}
            <Chip on={!!s.custom} onClick={pickCustom}>Custom</Chip>
          </ChipRow>
          <ChipRow label="Intervals" info="The intervals the questions use. Pick Custom to choose them yourself: when two keep getting mixed up, train only those two. m is minor, M is major, P is perfect and TT is the tritone.">
            {ONE_TO_TWELVE.filter((i) => s.custom || answers.includes(i.short)).map((i) => (
              <Chip key={i.semis} disabled={!s.custom} on={answers.includes(i.short)} onClick={() => toggleCustom(i.semis)}
                title={!s.custom ? `The ${i.name}: pick Custom to change the set` : answers.includes(i.short) ? (answers.length > 1 ? `Leave out the ${i.name}` : "At least one interval") : `Ask the ${i.name} too`}>{i.short}</Chip>
            ))}
          </ChipRow>
          <ChipRow label="Span" info="Within an octave, or sometimes an octave wider (a 9th for a 2nd). Wider is harder: answer with the simple interval name.">
            <Chip on={!s.wide} onClick={() => update({ wide: false })}>Within an octave</Chip>
            <Chip on={s.wide} onClick={() => update({ wide: true })}>Multi-octave</Chip>
          </ChipRow>
          <ChipRow label="Direction" info="Rising plays the low note first, Falling plays the high note first, and Together plays both at once."><DirectionChips options={DIRS} value={s.direction} onChange={(direction) => update({ direction })} /></ChipRow>
        </>
      )}
      <p className="mt-1 text-xs text-slate-400">These settings are in the page address. Copy the link to give a student the same set-up.</p>
    </section>
  );

  return (
    <div ref={keys.ref} className="flex flex-col gap-4">
      {!bare && <div data-tour="ears-setup"><GameChoice label="What to train" options={KINDS} value={s.kind} onChange={(kind) => update({ kind })} tone="sky" /></div>}
      {setup}
      <Stage tone="sky">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {bare && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5" aria-label="Set up as">
                {s.kind === "chord" ? <SetupTag tone="violet">Chord quality</SetupTag> : (() => {
                  const d = DIRECTIONS[s.direction];
                  return <>
                    <SetupTag tone="amber"><span aria-hidden className="text-sm leading-none">{d.mark}</span>{d.label}</SetupTag>
                    <SetupTag tone="teal">{s.wide ? "Multi-octave" : "Within an octave"}</SetupTag>
                  </>;
                })()}
              </div>
            )}
            <p className={`text-2xl leading-snug sm:text-3xl ${answered ? (answered.ok ? "text-emerald-300" : "text-rose-300") : "text-slate-50"}`} style={{ fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' }}>{question}</p>
            <p role="status" className="mt-1 min-h-6 text-slate-400">{answered && q ? <span className="text-slate-300">It was <b className="text-slate-50">{labelOf(q.answer)}</b>.</span> : prompt}</p>
          </div>
          {total > 0 && <div className="flex gap-2"><Stat label="right" value={right} tone="text-emerald-300" /><Stat label="asked" value={total} /></div>}
        </div>
        <div data-tour="interval-ears-play" className="flex flex-wrap items-center gap-2">
          {!q || answered
            ? <Hint title={q ? "Next" : "Start"} description="Plays a new one to name."><button type="button" className={btnBig} onClick={next}><Icon name="play" size={16} />{q ? "Next" : "Start"}{cap("Space")}</button></Hint>
            : <Hint title="Replay" description="Plays the same one again."><button type="button" className={btnBig} onClick={replay}><Icon name="repeat" size={16} />Replay{cap("Space")}</button></Hint>}
          {q && (answered
            ? <Hint title="Replay" description="Plays the same one again."><button type="button" className={`${btn} inline-flex items-center gap-1.5 py-2`} onClick={replay}><Icon name="repeat" size={14} />Replay{cap("R")}</button></Hint>
            : <Hint title="Skip" description="Moves on to a new one."><button type="button" className={`${btn} py-2`} onClick={next}>Skip</button></Hint>)}
          <span className="ml-auto"><Volume /></span>
        </div>
        <div data-tour="interval-ears-answers" className={`grid gap-2 ${s.kind === "chord" ? "grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))]"}`}>
          {answers.map((a, i) => {
            const isRight = answered && a === q?.answer, wrong = answered && !answered.ok && a === answered.pick;
            return (
              <button key={a} type="button" onClick={() => pick(a)} disabled={!q}
                className={`relative cursor-pointer rounded-xl border-2 px-3 py-3 text-lg font-semibold shadow-md shadow-black/30 transition active:scale-[0.96] disabled:cursor-default disabled:opacity-50 ${isRight ? "border-emerald-400 bg-emerald-500/25 text-emerald-50" : wrong ? "border-rose-400 bg-rose-500/25 text-rose-50" : "border-sky-300/50 bg-sky-500/15 text-sky-50 hover:border-sky-300 hover:bg-sky-500/30"}`}>
                {s.kind === "chord" ? labelOf(a) : a}
                {keys.armed && ANSWER_KEYS[i] && <KeyCap className="absolute right-1 top-1 hidden md:block">{ANSWER_KEYS[i]}</KeyCap>}
              </button>
            );
          })}
        </div>
        {keys.armed && <p className="hidden text-xs text-slate-400 md:block">Keys: Space presses the big button, R replays, numbers answer</p>}
        {laid && (
          <div aria-hidden={!answered || undefined} className={`flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300 ${answered ? "" : "invisible"}`}>
            {info && <p>Memory hook: the start of <i>{info.song}</i>. <Link className="text-sky-300 hover:underline" href={`/theory/basics?interval=${info.semis}#intervals`}>See it on the guitar →</Link></p>}
            <div className="max-w-md"><MiniPiano from={pianoFrom(laid.midi)} octaves={Math.max(...laid.midi) - pianoFrom(laid.midi) >= 24 ? 3 : 2} lit={laid.midi.map((m, i) => ({ midi: m, label: i === 0 ? "1st" : "", colour: i === 0 ? "#f8fafc" : "#f59e0b" }))} /></div>
          </div>
        )}
      </Stage>

      {Object.keys(score).length > 0 && (
        <section className={panel}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">How you are doing</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(score).map(([a, v]) => (
              <li key={a} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-24 shrink-0 truncate text-slate-400">{labelOf(a)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800"><span className="block h-full rounded-full bg-emerald-400/80" style={{ width: `${(100 * v.right) / v.total}%` }} /></span>
                <span className="w-10 text-right tabular-nums text-slate-400">{v.right}/{v.total}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
