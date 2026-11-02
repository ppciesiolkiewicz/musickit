"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui";
import { getSharedPiano, playSequence, wakeAudio } from "@/features/sound";
import type { Clef } from "@/features/theory/piano/staff";
import type { Ladder, LadderNote, Range } from "@/features/theory/singing";
import { intervalName, nextIntervalQuestion, type IntervalDirection, type IntervalQuestion } from "@/features/theory/singingIntervals";
import SingingStaff from "./SingingStaff";
import MicButton from "./MicButton";
import InputChip from "@/components/InputChip";
import type { MicStatus } from "@/components/practice/useMicPitch";

/** how long each note of the interval sounds, in ms */
const NOTE_MS = 750;
/** after the prompt ends, the mic waits this long before it listens, so it doesn't hear the piano's tail */
const LISTEN_AFTER_MS = 400;
/** the sung note has to stay on the target this long to count */
const HOLD_MS = 500;
/** the label of the target counted from the root (the root is Do, 1, R), by semitones above it */
const DEGREE = ["R", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];

export type IntervalPrompt = "interval" | "root";
type Phase = "prompt" | "listening" | "solved" | "shown";

/**
 * Sing an interval from a root: the root comes from the scale in the singer's range and sits on the staff with the interval
 * to sing named above it. The interval plays (or the root alone, the harder way), then the mic listens; holding the target
 * for a moment counts it, shows it on the staff and plays the interval back. The mic doesn't listen while the prompt plays.
 */
export default function IntervalDrill({ ladder, range, clef, pitch, cents, semis, direction, prompt, mic, micStatus, onMic }: {
  ladder: Ladder;
  range: Range;
  clef: Clef;
  pitch: RefObject<number | null>;
  cents: number;
  /** the intervals to ask, in semitones */
  semis: number[];
  direction: IntervalDirection;
  prompt: IntervalPrompt;
  mic: boolean;
  /** the page's listener, for the input chip */
  micStatus: MicStatus;
  onMic: () => void;
}) {
  const [q, setQ] = useState<IntervalQuestion | null>(null);
  const [phase, setPhase] = useState<Phase>("prompt");
  const [score, setScore] = useState({ right: 0, asked: 0 });
  // no root in the range fits an interval of the level
  const [none, setNone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => stop, []);
  // new settings or a new scale drop the question asked
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the question belongs to the settings it was asked under
    setQ(null);
  }, [ladder, range, semis, direction]);

  const sound = (x: IntervalQuestion, whole: boolean) =>
    playSequence((whole ? [x.root.midi, x.target.midi] : [x.root.midi]).map((note, i) => ({ note, at: i * NOTE_MS, hold: NOTE_MS * 0.9 })));
  // the prompt sounds, and the mic listens once it has died away
  const ask = async (x: IntervalQuestion) => {
    stop();
    await wakeAudio();
    setPhase("prompt");
    const whole = prompt === "interval";
    sound(x, whole);
    timers.current = [setTimeout(() => setPhase("listening"), (whole ? 2 : 1) * NOTE_MS + LISTEN_AFTER_MS)];
  };
  const next = () => {
    const x = nextIntervalQuestion(ladder, range, semis, direction, Math.random, q);
    setQ(x);
    setNone(!x);
    if (!x) return;
    setScore((s) => ({ ...s, asked: s.asked + 1 }));
    void ask(x);
    if (!mic) onMic();
  };
  const reveal = (ok: boolean) => {
    if (!q) return;
    stop();
    setPhase(ok ? "solved" : "shown");
    if (ok) setScore((s) => ({ ...s, right: s.right + 1 }));
    sound(q, true);
  };
  const playRoot = async () => {
    if (!q) return;
    await wakeAudio();
    const piano = getSharedPiano();
    piano.noteOn(q.root.midi);
    setTimeout(() => piano.noteOff(q.root.midi), NOTE_MS);
  };

  // while listening, the voice held on the target for long enough answers it
  const solve = useRef(reveal);
  useEffect(() => {
    solve.current = reveal;
  });
  useEffect(() => {
    if (phase !== "listening" || !q || !mic) return;
    let since: number | null = null;
    const id = setInterval(() => {
      const m = pitch.current;
      const on = m !== null && Math.abs(m - q.target.midi) * 100 <= cents;
      const now = performance.now();
      if (!on) since = null;
      else if (since === null) since = now;
      else if (now - since >= HOLD_MS) solve.current(true);
    }, 30);
    return () => clearInterval(id);
  }, [phase, q, mic, cents, pitch]);

  // the root and the target low to high, the target only drawn once it is found or shown
  const staff = useMemo(() => {
    if (!q) return null;
    const up = ((q.semis % 12) + 12) % 12;
    const target: LadderNote = { midi: q.target.midi, spelled: { ...q.target, degree: DEGREE[up] }, degree: Math.round((up * 7) / 12), label: DEGREE[up] };
    const root: LadderNote = { ...q.root, spelled: { ...q.root.spelled, degree: "R" }, degree: 0, label: "R" };
    const notes = q.semis > 0 ? [root, target] : [target, root];
    return { ladder: { notes, signature: ladder.signature, pcs: new Set([((q.target.midi % 12) + 12) % 12]), title: intervalName(q.semis) }, targetAt: q.semis > 0 ? 1 : 0 };
  }, [q, ladder.signature]);
  const found = phase === "solved" || phase === "shown";

  const status = !q
    ? semis.length ? "Press Start: a root shows on the staff and the interval to sing from it plays. Then sing the top (or bottom) note back." : "Pick a level."
    : phase === "prompt" ? (prompt === "interval" ? "Listen…" : "Here is the root…")
    : phase === "listening" ? (mic ? "Sing it. Hold the note: the dot turns green on it." : "Start the microphone to sing your answer.")
    : phase === "solved" ? `Yes: ${q.target.name}.` : `It was ${q.target.name}.`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={next} disabled={!semis.length} className="!border-sky-400/80 !bg-sky-500/25 !text-sky-50">{q ? "Next" : "Start"}</Button>
        {q && <Button size="sm" onClick={() => void ask(q)}>Play again</Button>}
        {q && <Button size="sm" onClick={() => void playRoot()}>Root</Button>}
        {q && !found && <Button size="sm" onClick={() => reveal(false)}>Show me</Button>}
        <MicButton on={mic} onClick={onMic} />
        <InputChip status={micStatus} />
        {score.asked > 0 && <span className="ml-auto text-sm tabular-nums text-slate-400">{score.right}/{score.asked} sung</span>}
      </div>
      {q && staff && (
        <p className="text-lg text-slate-100">
          Sing a <span className="font-semibold text-sky-200">{intervalName(q.semis)}</span> from <span className="font-semibold">{q.root.spelled.name}</span>
        </p>
      )}
      {none && <p className="text-sm text-rose-300">No interval of this level fits your voice from this scale.</p>}
      <p className={`text-sm ${phase === "solved" ? "text-emerald-300" : phase === "shown" ? "text-amber-300" : "text-slate-400"}`} aria-live="polite">{status}</p>
      {staff && (
        <SingingStaff
          ladder={staff.ladder}
          clef={clef}
          pitch={pitch}
          played={null}
          cents={cents}
          hidden={(i) => !found && i === staff.targetAt}
          onNote={(i) => {
            if (i !== staff.targetAt) return void playRoot();
            const piano = getSharedPiano();
            piano.noteOn(q!.target.midi);
            setTimeout(() => piano.noteOff(q!.target.midi), NOTE_MS);
          }}
        />
      )}
    </div>
  );
}
