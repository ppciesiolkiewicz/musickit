"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import MiniPiano from "@/components/theory/MiniPiano";
import { INTERVALS, pianoFrom } from "@/lib/chordKit/intervals";
import { midiToName, playMelody, strum } from "@/features/sound";
import { hzToNote, type Pitch } from "@/features/tuner/pitch";
import { useMicPitch } from "./useMicPitch";
import InputChip, { micStatusMessage } from "@/components/InputChip";
import { CHORD_QUALITIES, EAR_LEVELS, activeAnswers, nextEarQuestion, playedInterval, playedNotes, recordScore, type Direction, type EarQuestion, type EarSettings, type Score } from "@/lib/practice/earGame";
import Icon from "@/components/Icon";
import { GameChoice, SetupTag, Stage, Stat, btn, btnBig, panel, useGameKeys, writeQuery } from "./shared";
import { Chip, ChipRow } from "@/components/ui";

const DIRS: { id: Direction; label: string; mark: string }[] = [
  { id: "up", label: "Rising", mark: "↗" },
  { id: "down", label: "Falling", mark: "↘" },
  { id: "together", label: "Together", mark: "≡" },
];

const KINDS: { id: EarSettings["kind"]; title: string; about: string }[] = [
  { id: "interval", title: "Intervals", about: "Hear two notes and name the gap between them." },
  { id: "chord", title: "Chord quality", about: "Hear a chord and name its kind." },
];

/** The keys that pick an answer, in the order the answers are drawn. */
const ANSWER_KEYS = "1234567890-=";

const settingsQuery = (s: EarSettings) =>
  new URLSearchParams({ kind: s.kind, level: String(s.level), dir: s.direction, ...(s.custom ? { set: s.custom.join(",") } : {}), ...(s.wide ? { wide: "1" } : {}) }).toString();
const labelOf = (answer: string) => CHORD_QUALITIES.find((c) => c.id === answer)?.label ?? INTERVALS.find((i) => i.short === answer)?.name ?? answer;

/** how long a question sounds, in ms */
const playMs = (q: EarQuestion) => (q.together ? 1600 : q.midi.length * 650);
/** after a question sounds the mic waits this long, so it doesn't hear the piano's tail from the speakers */
const TAIL_MS = 500;
/** after a played answer: the time to take in the result before the next question, as the player's hands are on the guitar */
const NEXT_AFTER_RIGHT_MS = 2200;
const NEXT_AFTER_WRONG_MS = 4000;

function play(q: EarQuestion) {
  if (q.together) strum(q.midi, { gapMs: 0, holdMs: 1600 });
  else playMelody(q.midi, 650);
}

/** Interval and chord-quality ear training. Settings live in the URL so a teacher can share a set-up. */
export default function EarGame({ initial, syncUrl = true, bare = false }: { initial: EarSettings; /** write the settings to the address bar (off when embedded in another page) */ syncUrl?: boolean; /** settings fixed by the host: no settings panel */ bare?: boolean }) {
  const [s, setS] = useState(initial);
  const [q, setQ] = useState<EarQuestion | null>(null);
  /** `played`: answered on the instrument, with the interval the mic heard */
  const [answered, setAnswered] = useState<{ pick: string; ok: boolean; played?: boolean } | null>(null);
  const [mic, setMic] = useState(false);
  const [listening, setListening] = useState(false);
  const [firstNote, setFirstNote] = useState<number | null>(null);
  const [stay, setStay] = useState(false); // they asked to hear it again, so don't move on by yourself
  const track = useRef(playedNotes.initial);
  const listenFrom = useRef(0);
  const listenTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [score, setScore] = useState<Score>({});
  const answers = activeAnswers(s);

  const update = (patch: Partial<EarSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    if (syncUrl) writeQuery(settingsQuery(next));
    setQ(null);
    setAnswered(null);
    setListening(false);
    setFirstNote(null);
    clearTimeout(listenTimer.current);
  };
  /** Sound the question, and keep the mic out of it until it has died away. */
  const ask = (x: EarQuestion) => {
    play(x);
    track.current = playedNotes.initial;
    setFirstNote(null);
    setListening(false);
    const wait = playMs(x) + TAIL_MS;
    listenFrom.current = performance.now() + wait;
    clearTimeout(listenTimer.current);
    listenTimer.current = setTimeout(() => setListening(true), wait);
  };
  const next = () => {
    const n = nextEarQuestion(s, Math.random, q ?? undefined);
    setQ(n);
    setAnswered(null);
    setStay(false);
    ask(n);
  };
  const replay = () => {
    if (!q) return;
    if (answered) setStay(true);
    ask(q);
  };
  const pick = (a: string, played = false) => {
    if (!q || answered) return;
    const ok = a === q.answer;
    setAnswered({ pick: a, ok, played });
    setScore((sc) => recordScore(sc, q.answer, ok));
    if (played && !ok) play(q); // what it should have been, while the hands are still on the strings
  };

  const canPlay = s.kind === "interval";
  const onPitch = (p: Pitch | null) => {
    const now = performance.now();
    const t = playedNotes.step(track.current, p ? hzToNote(p.freq).midi : null, now, !q || !!answered || now < listenFrom.current);
    track.current = t;
    setFirstNote(t.notes[0] ?? null);
    if (t.notes.length >= 2) pick(playedInterval(t.notes[0], t.notes[1]), true);
  };
  const { status } = useMicPitch(mic && canPlay && !!q, undefined, onPitch);
  const micText = micStatusMessage(status);

  // a played answer moves on by itself
  const latestNext = useRef(next);
  useEffect(() => {
    latestNext.current = next;
  });
  useEffect(() => {
    if (!answered?.played || stay) return;
    const id = setTimeout(() => latestNext.current(), answered.ok ? NEXT_AFTER_RIGHT_MS : NEXT_AFTER_WRONG_MS);
    return () => clearTimeout(id);
  }, [answered, stay]);
  useEffect(() => () => clearTimeout(listenTimer.current), []);
  const toggleCustom = (semis: number) => {
    const cur = s.custom ?? EAR_LEVELS.filter((l) => l.n <= s.level).flatMap((l) => l.semis);
    const set = cur.includes(semis) ? cur.filter((x) => x !== semis) : [...cur, semis];
    if (set.length) update({ custom: set });
  };
  useGameKeys((e, onControl) => {
    if (e.key === " " || e.key === "Enter") {
      if (onControl) return;
      e.preventDefault();
      if (q && !answered) replay();
      else next();
    } else if (q && e.key.toLowerCase() === "r") replay();
    else if (q) {
      const a = answers[ANSWER_KEYS.indexOf(e.key)];
      if (a && e.key.length === 1) pick(a);
    }
  }, !bare);
  const info = q && s.kind === "interval" ? INTERVALS.find((i) => i.short === q.answer) : undefined;

  const total = Object.values(score).reduce((n, v) => n + v.total, 0);
  const right = Object.values(score).reduce((n, v) => n + v.right, 0);
  const playing = mic && canPlay && status === "on";
  const prompt = !q ? (s.kind === "chord" ? "A chord plays. Name its kind." : "Two notes play. Name the gap between them.")
    : !playing ? "Replay it as often as you like, then pick an answer."
    : !listening ? "Listen."
    : firstNote === null ? "Now play it on your guitar, from any note."
    : `Heard ${midiToName(firstNote)}. Now play the second note.`;
  const question = !q ? "Press Start and listen." : answered ? (answered.ok ? "Right!" : "Not quite.") : s.kind === "chord" ? "What kind of chord?" : "Which interval?";

  const setup = !bare && (
    <section className={`${panel} flex flex-col gap-2`}>
      <h2 className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Set up the training</h2>
      {s.kind === "interval" && (
        <>
          <ChipRow label="Level" info="Each level adds intervals to the ones before. Start with the 5th and octave, the most open sounds, then the 3rds that make chords major or minor.">
            {EAR_LEVELS.map((l) => <Chip key={l.n} on={!s.custom && s.level === l.n} onClick={() => update({ level: l.n, custom: null })} title={l.label}>{l.n}</Chip>)}
            <span className="ml-1 text-xs text-slate-400">{s.custom ? "Your own set" : EAR_LEVELS.find((l) => l.n === s.level)?.label}</span>
          </ChipRow>
          <ChipRow label="Your set" info="Pick exactly which intervals to practise. When two keep getting mixed up, train only those two. m is minor, M is major, P is perfect and TT is the tritone.">
            {INTERVALS.map((i) => <Chip key={i.semis} on={answers.includes(i.short)} onClick={() => toggleCustom(i.semis)} title={i.name}>{i.short}</Chip>)}
          </ChipRow>
          <ChipRow label="Span" info="Within an octave, or sometimes an octave wider (a 9th for a 2nd). Wider is harder: answer with the simple interval name.">
            <Chip on={!s.wide} onClick={() => update({ wide: false })}>Within an octave</Chip>
            <Chip on={s.wide} onClick={() => update({ wide: true })}>Multi-octave</Chip>
          </ChipRow>
          <ChipRow label="Played" info="Rising plays the low note first, Falling plays the high note first, and Together plays both at once.">{DIRS.map((d) => <Chip key={d.id} on={s.direction === d.id} onClick={() => update({ direction: d.id })}>{d.mark} {d.label}</Chip>)}</ChipRow>
        </>
      )}
      <p className="mt-1 text-xs text-slate-400">These settings are in the page address. Copy the link to give a student the same set-up.</p>
    </section>
  );

  return (
    <div className="flex flex-col gap-4">
      {!bare && <GameChoice label="What to train" options={KINDS} value={s.kind} onChange={(kind) => update({ kind })} tone="sky" />}
      <Stage tone="sky">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {bare && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5" aria-label="Set up as">
                {s.kind === "chord" ? <SetupTag tone="violet">Chord quality</SetupTag> : (() => {
                  const d = DIRS.find((x) => x.id === s.direction)!;
                  return <>
                    <SetupTag tone="amber"><span aria-hidden className="text-sm leading-none">{d.mark}</span>{d.label}</SetupTag>
                    <SetupTag tone="teal">{s.wide ? "Multi-octave" : "Within an octave"}</SetupTag>
                  </>;
                })()}
              </div>
            )}
            <p className={`text-2xl leading-snug sm:text-3xl ${answered ? (answered.ok ? "text-emerald-300" : "text-rose-300") : "text-slate-50"}`} style={{ fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' }}>{question}</p>
            <p role="status" className="mt-1 min-h-6 text-slate-400">{answered && q ? <span className="text-slate-300">It was <b className="text-slate-50">{labelOf(q.answer)}</b>.{answered.played && !answered.ok && <> You played <b className="text-slate-50">{labelOf(answered.pick)}</b>.</>}{answered.played && !stay && <span className="text-slate-400"> The next one is coming.</span>}</span> : prompt}</p>
          </div>
          {total > 0 && <div className="flex gap-2"><Stat label="right" value={right} tone="text-emerald-300" /><Stat label="asked" value={total} /></div>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!q || answered
            ? <button type="button" className={btnBig} onClick={next}><Icon name="play" size={16} />{q ? "Next" : "Start"}</button>
            : <button type="button" className={btnBig} onClick={replay}><Icon name="repeat" size={16} />Replay</button>}
          {q && (answered
            ? <button type="button" className={`${btn} inline-flex items-center gap-1.5 py-2`} onClick={replay}><Icon name="repeat" size={14} />Replay</button>
            : <button type="button" className={`${btn} py-2`} onClick={next}>Skip</button>)}
          {!bare && <span className="ml-auto hidden text-xs text-slate-400 md:block">Keys: numbers answer, R replays, Space goes on</span>}
        </div>
        <div className={`grid gap-2 ${s.kind === "chord" ? "grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))]"}`}>
          {answers.map((a, i) => {
            const isRight = answered && a === q?.answer, wrong = answered && !answered.ok && a === answered.pick;
            return (
              <button key={a} type="button" onClick={() => pick(a)} disabled={!q}
                className={`relative cursor-pointer rounded-xl border-2 px-3 py-3 text-base font-semibold transition active:scale-[0.96] disabled:cursor-default disabled:opacity-40 ${isRight ? "border-emerald-400 bg-emerald-500/25 text-emerald-50" : wrong ? "border-rose-400 bg-rose-500/25 text-rose-50" : "border-slate-600 bg-slate-800 text-slate-50 hover:border-sky-400 hover:bg-slate-700"}`}>
                {s.kind === "chord" ? labelOf(a) : a}
                {!bare && ANSWER_KEYS[i] && <span aria-hidden className="absolute right-1.5 top-1 hidden text-[10px] font-normal text-slate-400 md:block">{ANSWER_KEYS[i]}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          <ChipRow label="Answer by" info="Tap the answer, or play the gap on your guitar and let the mic hear it: one note, then the other, starting on any note, up or down. After a played answer the next question comes by itself.">
            <Chip on={!mic} onClick={() => setMic(false)}>Tapping the answer</Chip>
            <Chip on={mic} onClick={() => setMic(true)}>Playing it (mic)</Chip>
            {mic && canPlay && <InputChip status={status} />}
          </ChipRow>
          {mic && (
            <p className="text-xs text-slate-400">
              {!canPlay ? "The mic hears one note at a time, so chord quality is answered by tapping." : micText ? (status === "asking" ? micText : `${micText} Or answer by tapping.`) : status === "on" ? "Headphones keep the question out of the mic." : "Press Start, then play it back."}
            </p>
          )}
        </div>
        {answered && q && (
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
            {info && <p>Memory hook: the start of <i>{info.song}</i>. <Link className="text-sky-300 hover:underline" href={`/theory/basics?interval=${info.semis}#intervals`}>See it on the guitar →</Link></p>}
            <div className="max-w-md"><MiniPiano from={pianoFrom(q.midi)} octaves={Math.max(...q.midi) - pianoFrom(q.midi) >= 24 ? 3 : 2} lit={q.midi.map((m, i) => ({ midi: m, label: i === 0 ? "1st" : "", colour: i === 0 ? "#f8fafc" : "#f59e0b" }))} /></div>
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
      {setup}
    </div>
  );
}
