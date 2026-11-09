"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { useStepPart } from "@/components/practice/exerciseStep";
import ToolSettings from "@/components/practice/ToolSettings";
import MicButton from "@/components/theory/singing/MicButton";
import InputChip from "@/components/InputChip";
import SingingStaff from "@/components/theory/singing/SingingStaff";
import Icon from "@/components/Icon";
import { Badge, Button, Checkbox, KeyCap } from "@/components/ui";
import { getSharedPiano, playSequence, wakeAudio } from "@/features/sound";
import { VOICES, buildLadder, clefFor, hzToMidi, spellName, type Ladder, type LadderNote, type Range, type Voice } from "@/features/theory/singing";
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
const ALL_KEYS = Array.from({ length: 12 }, (_, k) => k);
const KEY_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

/** Do in the voice for a key, spelled in it, and the intervals that fit from it */
function placeIn(pc: number, range: Range, intervals: number[], dir: IntervalDir) {
  const p = placeDo(pc, range, intervals, dir);
  const key = buildLadder("major-ionian", pc, range)!;
  if (!p) return null;
  const doNote: LadderNote = { midi: p.midi, spelled: spellName(key.notes[0].spelled.name, p.midi, "Do"), degree: 0, label: "Do" };
  return { doNote, asks: p.asks, signature: key.signature };
}
type Phase = "idle" | "prompt" | "listening" | "solved" | "shown";
const NO_PITCH = { current: null };

/**
 * Sing a named interval from Do: the interval shows as a name ("Interval · P5"), Do sounds and sits on a piano roll (the
 * default) or the staff, and the student sings the other note; held on it for a moment, it counts, shows and plays back.
 * With `dot` (the default) the voice is drawn as a dot; without it the student sings blind and only hears whether it
 * counted (the harder way); either is a switch on the tool too.
 */
export function View({ keys: keysProp = [0], voice = "tenor", intervals = DEFAULT_INTERVALS, dir = "up", dot: dotProp = true }: { keys?: number[]; voice?: Voice; intervals?: number[]; dir?: IntervalDir; dot?: boolean }) {
  const range = VOICES[voice] ?? VOICES.tenor;
  const clef = clefFor(range);
  const [look, setLook] = useState<Look>("roll");
  const [dot, setDot] = useState(dotProp);
  const [cents] = useAccuracy();
  // the keys picked on the chips, and Random (all twelve) as its own switch over them, so turning Random off gives the
  // picked keys back; all twelve given in the props start as Random over the first. Each question asks in one at random.
  const [picked, setPicked] = useState(() => {
    const ks = keysProp.length ? [...new Set(keysProp)].sort((a, b) => a - b) : [0];
    return ks.length === 12 ? [keysProp[0] ?? 0] : ks;
  });
  const [random, setRandom] = useState(keysProp.length >= 12);
  const keys = random ? ALL_KEYS : picked;
  const [pc, setPc] = useState(keys[0]);
  // a chip is one more key or one less, never none
  const toggleKey = (k: number) => setPicked((ks) => (ks.includes(k) ? (ks.length > 1 ? ks.filter((x) => x !== k) : ks) : [...ks, k].sort((a, b) => a - b)));

  const placed = useMemo(() => placeIn(pc, range, intervals, dir), [pc, range, intervals, dir]);

  const [ask, setAsk] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState({ right: 0, asked: 0 });
  const [tapped, setTapped] = useState<number | null>(null);
  // whether the question asked has been scored, right or shown
  const counted = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => stopTimers, []);

  // the keys, for the tool on screen (a plan may hold more than one), with no modifier and not while typing: Space is
  // Start / Next (not on a focused button, which Space already presses), D plays Do, R restarts the interval asked
  const root = useRef<HTMLDivElement>(null);
  const onKey = useRef<Record<string, () => void>>({});
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!(k in onKey.current) || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.closest("input,textarea,select"))) return;
      if (k === " " && t instanceof HTMLElement && t.closest("button,a,[role=button],[role=tab]")) return;
      const box = root.current?.getBoundingClientRect();
      if (!box || box.bottom < 0 || box.top > window.innerHeight) return;
      e.preventDefault();
      onKey.current[k]();
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
  const prompt = async (midi = doMidi) => {
    stopTimers();
    await wakeAudio();
    setPhase("prompt");
    sound([midi]);
    timers.current = [setTimeout(() => setPhase("listening"), NOTE_MS + LISTEN_AFTER_MS)];
  };
  const next = () => {
    // a new key each time when there is a choice
    const k = keys.length > 1 ? nextAsk(keys, Math.random, pc)! : keys[0];
    const there = placeIn(k, range, intervals, dir);
    if (!there) return;
    const s = nextAsk(there.asks, Math.random, k === pc ? ask : null);
    if (s === null) return;
    setPc(k);
    setAsk(s);
    counted.current = false;
    setScore((x) => ({ ...x, asked: x.asked + 1 }));
    void prompt(there.doNote.midi);
    if (!micOn) startMic();
  };
  // the same interval again: the answer hidden, Do played, the mic listening; a second try doesn't count twice
  const restart = () => {
    if (ask === null) return;
    void prompt();
    if (!micOn) startMic();
  };
  const hearDo = () => void tap(doMidi, -1);
  useEffect(() => {
    onKey.current = { " ": next, ...(ask !== null ? { d: hearDo, r: restart } : {}) };
  });
  const reveal = (ok: boolean) => {
    if (targetMidi === null) return;
    stopTimers();
    setPhase(ok ? "solved" : "shown");
    if (ok && !counted.current) setScore((x) => ({ ...x, right: x.right + 1 }));
    counted.current = true;
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
      <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={next} title={`${ask === null ? "Start" : "Next interval"} (Space)`} className="inline-flex items-center gap-1.5 !border-sky-400/80 !bg-sky-500/25 !text-sky-50">
          {ask === null ? "Start" : "Next"}<KeyCap>Space</KeyCap>
        </Button>
        {ask !== null && <Button size="sm" onClick={hearDo} title="Hear Do (D)" className="inline-flex items-center gap-1.5">Hear Do<KeyCap>D</KeyCap></Button>}
        {ask !== null && <Button size="sm" onClick={restart} title="The same interval again: Do plays and the mic listens (R)" className="inline-flex items-center gap-1.5">Restart<KeyCap>R</KeyCap></Button>}
        {ask !== null && !found && <Button size="sm" onClick={() => reveal(false)}>Show me</Button>}
        <MicButton on={micOn} onClick={() => (micOn ? setMicOn(false) : startMic())} />
        <InputChip status={micStatus} />
        {score.asked > 0 && <span className="text-sm tabular-nums text-slate-400">{score.right}/{score.asked} sung</span>}
        <span className="ml-auto" />
        <ToolSettings accuracy />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2 text-xs text-slate-400">
        <span role="group" aria-label="View" className="inline-flex rounded-lg border border-slate-800 p-0.5">
          {(["roll", "staff"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={look === l} onClick={() => setLook(l)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition ${look === l ? "bg-sky-500/20 text-sky-100" : "hover:text-slate-200"}`}>
              <Icon name={l === "roll" ? "piano" : "music"} size={13} />{l === "roll" ? "Piano roll" : "Staff"}
            </button>
          ))}
        </span>
        {/* where Do comes from: the keys picked on the chips, or any of the twelve; switching keeps the keys picked */}
        <span className="text-slate-500">Keys</span>
        <span role="group" aria-label="Keys" className="inline-flex rounded-lg border border-slate-800 p-0.5">
          {([false, true] as const).map((r) => (
            <button key={String(r)} type="button" aria-pressed={random === r} onClick={() => setRandom(r)} title={r ? "Any of the 12 keys: a random Do each time" : "Only the keys picked"}
              className={`rounded-md px-2 py-1 transition ${random === r ? "bg-sky-500/20 text-sky-100" : "hover:text-slate-200"}`}>{r ? "Random" : "Picked"}</button>
          ))}
        </span>
        {!random && (
          <span role="group" aria-label="Keys picked" className="inline-flex flex-wrap items-center gap-0.5">
            {KEY_NAMES.map((name, k) => (
              <button key={k} type="button" aria-pressed={picked.includes(k)} onClick={() => toggleKey(k)}
                title={picked.includes(k) ? (picked.length > 1 ? `Leave out ${name}` : "At least one key") : `Ask in ${name} too`}
                className={`min-w-7 rounded-md px-1.5 py-1 transition ${picked.includes(k) ? "bg-sky-500/20 text-sky-100" : "text-slate-500 hover:text-slate-200"}`}>{name}</button>
            ))}
          </span>
        )}
        <Checkbox checked={dot} onChange={setDot} title="Off is harder: you sing without seeing your voice">Show my voice</Checkbox>
        <span className="ml-auto" />
        <Badge>{range.label}</Badge>
        {/* plain text, not a badge: a badge's capitals would turn m3 into M3 */}
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">{[...new Set(placed.asks.map(Math.abs))].sort((a, b) => a - b).map(shortName).join(" ")} {dir === "both" ? "up and down" : dir}</span>
      </div>
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
          doName={`${placed.doNote.spelled.name}${placed.doNote.spelled.octave}`} targetName={target ? `${target.spelled.name}${target.spelled.octave}` : ""}
          pitch={pitch} cents={cents} dot={dot} live={micOn} onNote={(w) => void (w === "do" ? tap(doMidi, -1) : targetMidi !== null && found && tap(targetMidi, -2))} />
      ) : (
        <SingingStaff ladder={staff.ladder} clef={clef} pitch={dot ? pitch : NO_PITCH} played={tapped === -1 ? (staff.targetAt === 0 ? 1 : 0) : tapped === -2 ? staff.targetAt : null} cents={cents}
          hidden={(i) => !found && i === staff.targetAt}
          onNote={(i) => void (i === staff.targetAt ? found && targetMidi !== null && tap(targetMidi, -2) : tap(doMidi, -1))} />
      )}
    </div>
  );
}
