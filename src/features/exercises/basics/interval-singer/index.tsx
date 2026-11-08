"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { useStepPart } from "@/components/practice/exerciseStep";
import ToolSettings from "@/components/practice/ToolSettings";
import MicButton from "@/components/theory/singing/MicButton";
import InputChip from "@/components/InputChip";
import SingingStaff from "@/components/theory/singing/SingingStaff";
import Icon from "@/components/Icon";
import { Badge, Button, Checkbox } from "@/components/ui";
import { getSharedPiano, playSequence, wakeAudio } from "@/features/sound";
import { VOICES, buildLadder, clefFor, hzToMidi, spellName, type Ladder, type LadderNote, type Voice } from "@/features/theory/singing";
import { spellInterval } from "@/features/theory/singingIntervals";
import { useAccuracy } from "@/features/theory/useAccuracy";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { DEFAULT_INTERVALS, longName, nextAsk, placeDo, shortName, solfegeOf, type IntervalDir } from "./asks";
import IntervalRoll from "./IntervalRoll";

/** how long Do (and each note played back) sounds, in ms */
const NOTE_MS = 900;
/** after Do sounds, the mic waits this long before it listens, so it doesn't hear the piano's tail */
const LISTEN_AFTER_MS = 400;
/** the sung note has to stay on the target this long to count */
const HOLD_MS = 500;
/** frames without a pitch before the voice counts as gone */
const GAP_FRAMES = 6;

type Look = "roll" | "staff";
type Phase = "idle" | "prompt" | "listening" | "solved" | "shown";
const NO_PITCH = { current: null };

/**
 * Sing a named interval from Do: the interval shows as a name ("Interval · P5"), Do sounds and sits on a piano roll (the
 * default) or the staff, and the student sings the other note; held on it for a moment, it counts, shows and plays back.
 * With `dot` (the default) the voice is drawn as a dot; without it the student sings blind and only hears whether it
 * counted (the harder way); either is a switch on the tool too.
 */
export function View({ pc = 0, voice = "tenor", intervals = DEFAULT_INTERVALS, dir = "up", dot: dotProp = true }: { pc?: number; voice?: Voice; intervals?: number[]; dir?: IntervalDir; dot?: boolean }) {
  const range = VOICES[voice] ?? VOICES.tenor;
  const clef = clefFor(range);
  const [look, setLook] = useState<Look>("roll");
  const [dot, setDot] = useState(dotProp);
  const [cents] = useAccuracy();

  // Do in the voice, spelled in the key, and the intervals that fit from it
  const placed = useMemo(() => {
    const p = placeDo(pc, range, intervals, dir);
    const key = buildLadder("major-ionian", pc, range)!;
    if (!p) return null;
    const doNote: LadderNote = { midi: p.midi, spelled: spellName(key.notes[0].spelled.name, p.midi, "Do"), degree: 0, label: "Do" };
    return { doNote, asks: p.asks, signature: key.signature };
  }, [pc, range, intervals, dir]);

  const [ask, setAsk] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState({ right: 0, asked: 0 });
  const [tapped, setTapped] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => stopTimers, []);

  // N (no modifier, not while typing) is the Start / Next button, for the tool on screen (a plan may hold more than one)
  const root = useRef<HTMLDivElement>(null);
  const onN = useRef<() => void>(() => {});
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.closest("input,textarea,select"))) return;
      const box = root.current?.getBoundingClientRect();
      if (!box || box.bottom < 0 || box.top > window.innerHeight) return;
      e.preventDefault();
      onN.current();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  // the mic
  const [micOn, setMicOn] = useState(false);
  const pitch = useRef<number | null>(null);
  const smoother = useRef(createSmoother());
  const gaps = useRef(0);
  const onPitch = useCallback((p: Pitch | null) => {
    if (!p) {
      if (++gaps.current >= GAP_FRAMES) {
        pitch.current = null;
        smoother.current.reset();
      }
      return;
    }
    gaps.current = 0;
    pitch.current = hzToMidi(smoother.current.push(p));
  }, []);
  const { status: micStatus } = useMicPitch(micOn, undefined, onPitch);
  const startMic = () => {
    pitch.current = null;
    setMicOn(true);
  };
  useStepPart({ kind: "mic", on: micOn, start: startMic, stop: () => setMicOn(false) });

  const doMidi = placed?.doNote.midi ?? 60;
  const targetMidi = ask === null ? null : doMidi + ask;
  const sound = (notes: number[]) => playSequence(notes.map((note, i) => ({ note, at: i * NOTE_MS, hold: NOTE_MS * 0.9 })));
  const tap = async (midi: number, i: number) => {
    await wakeAudio();
    const piano = getSharedPiano();
    piano.noteOn(midi);
    setTapped(i);
    setTimeout(() => {
      piano.noteOff(midi);
      setTapped((t) => (t === i ? null : t));
    }, NOTE_MS);
  };

  // Do sounds, then the mic listens
  const prompt = async () => {
    stopTimers();
    await wakeAudio();
    setPhase("prompt");
    sound([doMidi]);
    timers.current = [setTimeout(() => setPhase("listening"), NOTE_MS + LISTEN_AFTER_MS)];
  };
  const next = () => {
    if (!placed) return;
    const s = nextAsk(placed.asks, Math.random, ask);
    if (s === null) return;
    setAsk(s);
    setScore((x) => ({ ...x, asked: x.asked + 1 }));
    void prompt();
    if (!micOn) startMic();
  };
  useEffect(() => {
    onN.current = next;
  });
  const reveal = (ok: boolean) => {
    if (targetMidi === null) return;
    stopTimers();
    setPhase(ok ? "solved" : "shown");
    if (ok) setScore((x) => ({ ...x, right: x.right + 1 }));
    sound([doMidi, targetMidi]);
  };

  // while listening, the voice held on the target long enough answers it
  const solve = useRef(reveal);
  useEffect(() => {
    solve.current = reveal;
  });
  useEffect(() => {
    if (phase !== "listening" || targetMidi === null || !micOn) return;
    let since: number | null = null;
    const id = setInterval(() => {
      const m = pitch.current;
      const now = performance.now();
      if (m === null || Math.abs(m - targetMidi) * 100 > cents) since = null;
      else if (since === null) since = now;
      else if (now - since >= HOLD_MS) solve.current(true);
    }, 30);
    return () => clearInterval(id);
  }, [phase, targetMidi, micOn, cents]);

  const found = phase === "solved" || phase === "shown";
  const target = useMemo(() => {
    if (!placed || ask === null) return null;
    const label = solfegeOf(ask);
    return { label, spelled: { ...spellInterval(placed.doNote.spelled, ask), degree: label } };
  }, [placed, ask]);

  // the staff: Do and the target low to high, the target drawn only once found
  const staff = useMemo(() => {
    if (!placed) return null;
    const doNote = placed.doNote;
    if (!target || ask === null) return { ladder: { notes: [doNote], signature: placed.signature, pcs: new Set([doNote.midi % 12]), title: "Do" } as Ladder, targetAt: -1 };
    const t: LadderNote = { midi: doNote.midi + ask, spelled: target.spelled, degree: Math.round((((ask % 12) + 12) % 12) * 7 / 12), label: target.label };
    const notes = ask > 0 ? [doNote, t] : [t, doNote];
    return { ladder: { notes, signature: placed.signature, pcs: new Set([((t.midi % 12) + 12) % 12]), title: longName(ask) } as Ladder, targetAt: ask > 0 ? 1 : 0 };
  }, [placed, target, ask]);

  if (!placed || !staff) return <p className="text-sm text-rose-300">None of these intervals fits the {range.label.toLowerCase()} voice.</p>;

  const message = ask === null ? "Press Start: Do plays, then sing the interval named above from it."
    : phase === "prompt" ? "Here is Do…"
    : phase === "listening" ? (micOn ? (dot ? "Sing it. Hold the note: the dot turns green on it." : "Sing it and hold the note.") : "Switch the mic on to sing your answer.")
    : phase === "solved" ? `Yes: ${target!.label}, ${target!.spelled.name}.` : `It was ${target!.label}, ${target!.spelled.name}.`;

  return (
    <div ref={root} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={next} title={`${ask === null ? "Start" : "Next interval"} (N)`} className="inline-flex items-center gap-1.5 !border-sky-400/80 !bg-sky-500/25 !text-sky-50">
          {ask === null ? "Start" : "Next"}<kbd aria-hidden className="rounded border border-current px-1 font-mono text-[10px] opacity-70">N</kbd>
        </Button>
        {ask !== null && <Button size="sm" onClick={() => void tap(doMidi, -1)}>Hear Do</Button>}
        {ask !== null && !found && <Button size="sm" onClick={() => reveal(false)}>Show me</Button>}
        <MicButton on={micOn} onClick={() => (micOn ? setMicOn(false) : startMic())} />
        <InputChip status={micStatus} />
        {score.asked > 0 && <span className="text-sm tabular-nums text-slate-400">{score.right}/{score.asked} sung</span>}
        <span className="ml-auto" />
        <ToolSettings accuracy />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-2xl font-semibold text-slate-50">
          Interval · <span className="text-sky-200">{ask === null ? "…" : shortName(ask)}</span>
          {/* the same interval in solfège: from Do up (or down) to its note */}
          {ask !== null && <span className="text-slate-300"> · Do {ask > 0 ? "↑" : "↓"} {solfegeOf(ask)}</span>}
        </p>
        {ask !== null && <p className="text-sm text-slate-400">{longName(ask)} from Do ({placed.doNote.spelled.name})</p>}
      </div>
      <p className={`text-sm ${phase === "solved" ? "text-emerald-300" : phase === "shown" ? "text-amber-300" : "text-slate-400"}`} aria-live="polite">{message}</p>
      {look === "roll" ? (
        <IntervalRoll doMidi={doMidi} low={doMidi + Math.min(0, ...placed.asks)} high={doMidi + Math.max(0, ...placed.asks)} target={targetMidi} found={found} doLabel={`Do · ${placed.doNote.spelled.name}`} targetLabel={target ? `${target.label} · ${target.spelled.name}` : ""}
          pitch={pitch} cents={cents} dot={dot} live={micOn} onNote={(w) => void (w === "do" ? tap(doMidi, -1) : targetMidi !== null && found && tap(targetMidi, -2))} />
      ) : (
        <SingingStaff ladder={staff.ladder} clef={clef} pitch={dot ? pitch : NO_PITCH} played={tapped === -1 ? (staff.targetAt === 0 ? 1 : 0) : tapped === -2 ? staff.targetAt : null} cents={cents}
          hidden={(i) => !found && i === staff.targetAt}
          onNote={(i) => void (i === staff.targetAt ? found && targetMidi !== null && tap(targetMidi, -2) : tap(doMidi, -1))} />
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span role="group" aria-label="View" className="inline-flex rounded-lg border border-slate-800 p-0.5">
          {(["roll", "staff"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={look === l} onClick={() => setLook(l)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition ${look === l ? "bg-sky-500/20 text-sky-100" : "hover:text-slate-200"}`}>
              <Icon name={l === "roll" ? "piano" : "music"} size={13} />{l === "roll" ? "Piano roll" : "Staff"}
            </button>
          ))}
        </span>
        <Checkbox checked={dot} onChange={setDot} title="Off is harder: you sing without seeing your voice">Show my voice</Checkbox>
        <span className="ml-auto" />
        <Badge>{range.label}</Badge>
        {/* plain text, not a badge: a badge's capitals would turn m3 into M3 */}
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">{[...new Set(placed.asks.map(Math.abs))].sort((a, b) => a - b).map(shortName).join(" ")} {dir === "both" ? "up and down" : dir}</span>
      </div>
    </div>
  );
}
