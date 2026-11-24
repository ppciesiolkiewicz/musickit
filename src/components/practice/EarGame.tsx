"use client";

import Link from "next/link";
import { useState } from "react";
import MiniPiano from "@/components/theory/MiniPiano";
import { INTERVALS, pianoFrom } from "@/lib/chordKit/intervals";
import { playMelody, playSequence, strum } from "@/features/sound";
import { CHORD_QUALITIES, KEY_CHORDS, activeAnswers, nextEarQuestion, recordScore, soundOfAnswer, type EarQuestion, type EarSettings, type Score } from "@/lib/practice/earGame";
import Icon from "@/components/Icon";
import { GameChoice, SetupTag, Stage, Stat, btn, btnBig, panel, writeQuery } from "./shared";
import { useToolKeys } from "./toolKeys";
import { Hint, KeyCap, SettingsPanel, SettingsSection } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { Volume, VolumeRow } from "@/features/settings";
import { DIRECTIONS } from "./DirectionChips";
import { solfegeOfSemis } from "@/features/theory/labels";
import { EarGameSettings } from "./EarGameSettings";
import { ExerciseDone, StageRow } from "./Stages";

const KINDS: { id: EarSettings["kind"]; title: string; about: string }[] = [
  { id: "interval", title: "Intervals", about: "Hear two notes and name the gap between them." },
  { id: "chord", title: "Chord quality", about: "Hear a chord and name its kind." },
  { id: "change", title: "Chord changes", about: "Hear the 1 chord, then another chord of the key, and name the second one." },
];

/** The keys that pick an answer, in the order the answers are drawn. */
const ANSWER_KEYS = "1234567890-=";

const settingsQuery = (s: EarSettings) =>
  new URLSearchParams({ kind: s.kind, level: String(s.level), dir: s.direction, ...(s.custom ? { set: s.custom.join(",") } : {}), ...(s.wide ? { wide: "1" } : {}), ...(s.qualities ? { qualities: s.qualities.join(",") } : {}) }).toString();
const chordOf = (answer: string) => KEY_CHORDS.find((c) => c.numeral === answer);
/** An answer in words: a chord's kind, an interval's name, or a numeral with its number ("IV, the 4 chord"). */
const labelOf = (answer: string) => CHORD_QUALITIES.find((c) => c.id === answer)?.label ?? INTERVALS.find((i) => i.short === answer)?.name ?? (chordOf(answer) ? `${answer}, the ${chordOf(answer)!.degree} chord` : answer);

/** How long each chord of a change rings before the next, and how long the last one rings. */
const CHANGE_MS = 1200, CHANGE_LAST_MS = 1800;

function play(q: EarQuestion) {
  // a chord change: each chord struck whole, one after another
  if (q.chords) playSequence(q.chords.flatMap((chord, i, all) => chord.map((note) => ({ note, at: i * CHANGE_MS, hold: i === all.length - 1 ? CHANGE_LAST_MS : CHANGE_MS * 0.92 }))));
  else if (q.together) strum(q.midi, { gapMs: 0, holdMs: 1600 });
  else playMelody(q.midi, 650);
}

/**
 * The keys lit once a question is answered. An interval or a chord: its notes, the first one white and marked "1st". A
 * chord change: the second chord in amber, its root marked with the chord's number, and the rest of the 1 chord in white,
 * its root marked 1.
 */
function litKeys(q: EarQuestion) {
  if (!q.chords) return q.midi.map((m, i) => ({ midi: m, label: i === 0 ? "1st" : "", colour: i === 0 ? "#f8fafc" : "#f59e0b" }));
  const [home, second] = q.chords;
  return [
    ...second.map((m, i) => ({ midi: m, label: i === 0 ? String(chordOf(q.answer)?.degree ?? "") : "", colour: "#f59e0b" })),
    ...home.filter((m) => !second.includes(m)).map((m) => ({ midi: m, label: m === home[0] ? "1" : "", colour: "#f8fafc" })),
  ];
}

/** Interval, chord-quality and chord-change ear training. Settings live in the URL so a teacher can share a set-up. */
export default function EarGame({ initial, syncUrl = true, bare = false, stages }: { initial: EarSettings; /** write the settings to the address bar (off when embedded in another page) */ syncUrl?: boolean; /** settings fixed by the host: no settings panel */ bare?: boolean;
  /** play in stages of `questions` answers each, `count` of them, then the exercise is complete; without it the game never ends */
  stages?: { count: number; questions: number } }) {
  useCoverage({ hints: 5 });
  const [s, setS] = useState(initial);
  const [q, setQ] = useState<EarQuestion | null>(null);
  const [answered, setAnswered] = useState<{ pick: string; ok: boolean } | null>(null);
  const [score, setScore] = useState<Score>({});
  // with stages: the stage being played, the answers given in it, and the score before it (Restart stage goes back to it)
  const [stage, setStage] = useState(0);
  const [inStage, setInStage] = useState(0);
  const [before, setBefore] = useState<Score>({});
  const stageFull = !!stages && inStage >= stages.questions && !!answered;
  const complete = !!stages && stage >= stages.count;
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
    if (complete) return;
    if (stages && stageFull) {
      // the stage is done: on to the next, or the end
      setStage(stage + 1);
      setInStage(0);
      setBefore(score);
      setQ(null);
      setAnswered(null);
      setShown(null);
      if (stage + 1 >= stages.count) return;
    }
    const n = nextEarQuestion(s, Math.random, q ?? undefined);
    setQ(n);
    setAnswered(null);
    play(n);
  };
  const replay = () => {
    if (q) play(q);
  };
  /** An answer's own sound on the question's first note, to set beside the question. */
  const hear = (a: string) => {
    if (q) play(soundOfAnswer(q, a));
  };
  // the first press answers, and plays what was picked; every press after it only plays
  const pick = (a: string) => {
    if (!q) return;
    hear(a);
    if (answered) return;
    const ok = a === q.answer;
    setAnswered({ pick: a, ok });
    setShown(q);
    setScore((sc) => recordScore(sc, q.answer, ok));
    setInStage((n) => n + 1);
  };
  /** the stage being played from its first question, its answers taken back off the score; once complete, the whole exercise */
  const restartStage = () => {
    const all = complete;
    if (all) setStage(0);
    setScore(all ? {} : before);
    if (all) setBefore({});
    setInStage(0);
    setQ(null);
    setAnswered(null);
    setShown(null);
  };

  // Space and Enter press the big button: Start or Next, or Replay while a question waits. Skip has no key, so Space
  // never throws a question away. R replays, the number keys answer; on a page of several
  // tools, the one last tapped or most on screen takes them
  const { ref: keysRef, armed } = useToolKeys((e, onControl) => {
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
    if (q && e.key.length === 1) {
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
  const prompt = !q ? (s.kind === "chord" ? "A chord plays. Name its kind." : s.kind === "change" ? "Two chords play: the 1 chord, then another chord of the key. Name the second one." : "Two notes play. Name the gap between them.")
    : "Replay it as often as you like, then pick an answer.";
  const question = stageFull ? (stage + 1 >= stages!.count ? "That was the last question." : "Stage done.") : !q ? "Press Start and listen." : answered ? (answered.ok ? "Right!" : "Not quite.") : s.kind === "chord" ? "What kind of chord?" : s.kind === "change" ? "Which chord came second?" : "Which interval?";

  /** Key caps only where the keys work: on the tool that has them, not on touch screens. */
  const cap = (key: string) => armed && <KeyCap className="hidden md:inline">{key}</KeyCap>;

  const settings = (
    <SettingsSection first>
      <div data-tour="ears-settings" className="flex flex-col gap-2">
        <EarGameSettings settings={s} onChange={update} />
        <VolumeRow />
      </div>
      <p className="text-xs text-slate-400">These settings are in the page address. Copy the link to give a student the same set-up.</p>
    </SettingsSection>
  );

  const game = (
    <div ref={keysRef} className="flex flex-col gap-4">
      {!bare && <div data-tour="ears-setup"><GameChoice label="What to train" options={KINDS} value={s.kind} onChange={(kind) => update({ kind })} tone="sky" /></div>}
      {stages && <StageRow at={stage} total={stages.count} detail={`question ${Math.min(inStage + (q && !answered ? 1 : 0), stages.questions) || 1} of ${stages.questions}`} />}
      {complete ? <ExerciseDone total={stages!.count} onRestart={restartStage}>You named {right} of {total} right.</ExerciseDone> : <Stage tone="sky">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {bare && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5" aria-label="Set up as">
                {s.kind === "chord" ? <SetupTag tone="violet">Chord quality</SetupTag> : s.kind === "change" ? <SetupTag tone="violet">Chord changes</SetupTag> : (() => {
                  const d = DIRECTIONS[s.direction];
                  return <>
                    <SetupTag tone="amber"><span aria-hidden className="text-sm leading-none">{d.mark}</span>{d.label}</SetupTag>
                    <SetupTag tone="teal">{s.wide ? "Multi-octave" : "Within an octave"}</SetupTag>
                  </>;
                })()}
              </div>
            )}
            <p className={`text-2xl leading-snug sm:text-3xl ${answered ? (answered.ok ? "text-emerald-300" : "text-rose-300") : "text-slate-50"}`} style={{ fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' }}>{question}</p>
            <p role="status" className="mt-1 min-h-6 text-slate-400">{answered && q ? <span className="text-slate-300">It was <b className="text-slate-50">{labelOf(q.answer)}</b>. Press any answer to hear it.</span> : prompt}</p>
          </div>
          {total > 0 && <div className="flex gap-2"><Stat label="right" value={right} tone="text-emerald-300" /><Stat label="asked" value={total} /></div>}
        </div>
        <div data-tour="interval-ears-play" className="flex flex-wrap items-center gap-2">
          {!q || answered
            ? (() => {
              const label = stageFull ? (stage + 1 >= stages!.count ? "Finish" : "Next stage") : q ? "Next" : "Start";
              return <Hint title={label} description={stageFull ? (label === "Finish" ? "Ends the exercise." : "Starts the next stage.") : "Plays a new one to name."}><button type="button" className={btnBig} onClick={next}><Icon name="play" size={16} />{label}{cap("Space")}</button></Hint>;
            })()
            : <Hint title="Replay" description="Plays the same one again."><button type="button" className={btnBig} onClick={replay}><Icon name="repeat" size={16} />Replay{cap("Space")}</button></Hint>}
          {q && (answered
            ? <Hint title="Replay" description="Plays the same one again."><button type="button" className={`${btn} inline-flex items-center gap-1.5 py-2`} onClick={replay}><Icon name="repeat" size={14} />Replay{cap("R")}</button></Hint>
            : <Hint title="Skip" description="Moves on to a new one."><button type="button" className={`${btn} py-2`} onClick={next}>Skip</button></Hint>)}
          {stages && <Hint title="Restart stage" description="Starts this stage again from its first question."><button type="button" className={`${btn} inline-flex items-center gap-1.5 py-2`} onClick={restartStage} disabled={inStage === 0 && !q}><Icon name="rotate-ccw" size={14} />Restart stage</button></Hint>}
          {bare && <span className="ml-auto"><Volume /></span>}
        </div>
        <div data-tour="interval-ears-answers" className={`grid gap-2 ${s.kind === "chord" ? "grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))]"}`}>
          {answers.map((a, i) => {
            const isRight = answered && a === q?.answer, wrong = answered && !answered.ok && a === answered.pick;
            return (
              <button key={a} type="button" onClick={() => pick(a)} disabled={!q}
                className={`relative cursor-pointer rounded-xl border-2 px-3 py-3 text-lg font-semibold shadow-md shadow-black/30 transition active:scale-[0.96] disabled:cursor-default disabled:opacity-50 ${isRight ? "border-emerald-400 bg-emerald-500/25 text-emerald-50" : wrong ? "border-rose-400 bg-rose-500/25 text-rose-50" : "border-sky-300/50 bg-sky-500/15 text-sky-50 hover:border-sky-300 hover:bg-sky-500/30"}`}>
                {s.kind === "chord" ? labelOf(a) : a}
                {s.kind === "interval" && (() => { const iv = INTERVALS.find((x) => x.short === a); return iv && <span className="block text-xs font-normal opacity-70">Do–{solfegeOfSemis(iv.semis)}</span>; })()}
                {armed && ANSWER_KEYS[i] && <KeyCap className="absolute right-1 top-1 hidden md:block">{ANSWER_KEYS[i]}</KeyCap>}
              </button>
            );
          })}
        </div>
        {armed && <p className="hidden text-xs text-slate-400 md:block">Keys: Space presses the big button, R replays, numbers press the answers</p>}
        {laid && (
          <div aria-hidden={!answered || undefined} className={`flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300 ${answered ? "" : "invisible"}`}>
            {info && <p>Memory hook: the start of <i>{info.song}</i>. <Link className="text-sky-300 hover:underline" href={`/theory/basics?interval=${info.semis}#intervals`}>See it on the guitar →</Link></p>}
            <div className="max-w-md"><MiniPiano from={pianoFrom(laid.midi)} octaves={Math.max(...laid.midi) - pianoFrom(laid.midi) >= 24 ? 3 : 2} lit={litKeys(laid)} /></div>
          </div>
        )}
      </Stage>}

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
  // the settings in the page's panel; fixed by the host (an exercise in the plan): none
  return bare ? game : <SettingsPanel side={syncUrl} settings={settings}>{game}</SettingsPanel>;
}
