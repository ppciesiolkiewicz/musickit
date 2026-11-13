"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { ToolHeadphonesHint, useStepPart } from "@/components/practice/exerciseStep";
import { StartCover } from "@/components/practice/StartCover";
import { useToolKeys } from "@/components/practice/toolKeys";
import ToolSettings from "@/components/practice/ToolSettings";
import InputChip from "@/components/InputChip";
import SingingStaff from "@/components/theory/singing/SingingStaff";
import { Badge, Button, Checkbox, Hint, KeyCap } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { useLevelAtLeast } from "@/features/guide/Tier";
import { getSharedPiano, playSequence, wakeAudio } from "@/features/sound";
import { IN_TUNE_CENTS, VOICES, buildLadder, clefFor, hzToMidi, spellName, type Ladder, type LadderNote, type Range, type Voice } from "@/features/theory/singing";
import { spellInterval } from "@/features/theory/singingIntervals";
import { useAccuracy } from "@/features/theory/useAccuracy";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { DEFAULT_INTERVALS, longName, nextAsk, placeDo, shortName, solfegeOf, toggleOne, type IntervalDir } from "./asks";
import IntervalRoll from "./IntervalRoll";
import { KeyChips, KeysSwitch, LookSwitch, type Look } from "./IntervalOptions";
import { useVoice } from "../voiceChoice";

/** how long Do (and each note played back) sounds, in ms */
const NOTE_MS = 900;
/** after Do sounds, the mic waits this long before it listens, so it doesn't hear the piano's tail */
const LISTEN_AFTER_MS = 400;
/** the sung note has to stay on the target this long to count */
const HOLD_MS = 500;
/** frames without a pitch before the voice counts as gone */
const GAP_FRAMES = 6;

/**
 * True on a touch screen. A phone (an iPhone always, many Android phones too) plays every sound much quieter while a page has
 * the mic open, so there the mic is opened only once the piano has finished and closed again whenever it plays.
 */
const TOUCH = "(pointer: coarse)";
const useTouch = () => useSyncExternalStore(
  (fn) => {
    const mq = window.matchMedia(TOUCH);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  },
  () => window.matchMedia(TOUCH).matches,
  () => false,
);

const ALL_KEYS = Array.from({ length: 12 }, (_, k) => k);

/** Do in the voice for a key, spelled in it, and the intervals that fit from it */
function placeIn(pc: number, range: Range, intervals: number[], dir: IntervalDir) {
  const p = placeDo(pc, range, intervals, dir);
  const key = buildLadder("major-ionian", pc, range)!;
  if (!p) return null;
  const doNote: LadderNote = { midi: p.midi, spelled: spellName(key.notes[0].spelled.name, p.midi, "Do"), degree: 0, label: "Do" };
  return { doNote, asks: p.asks, signature: key.signature };
}
type Phase = "idle" | "prompt" | "hint" | "listening" | "solved" | "shown";
const NO_PITCH = { current: null };

/**
 * Sing a named interval from Do: the interval shows as a name ("Interval · P5"), Do sounds and sits on a piano roll (the
 * default) or the staff, and the student sings the other note; held on it for a moment, it counts, shows and plays back.
 * With `play` "both", the note to sing sounds after Do, so the student hears the leap first (the easier way).
 * With `dot` (the default) the voice is drawn as a dot; without it the student sings blind and only hears whether it
 * counted (the harder way); either is a switch on the tool too. `picker` false leaves the Keys switch and key chips out
 * (an exercise does: its keys are set, and a step-choice changes them). A page with a side panel holds the keys, view and dot
 * there and hands them in as `options`, and the tool then leaves those controls out.
 */
export function View({ keys: keysProp = [0], voice: own = "tenor", intervals = DEFAULT_INTERVALS, dir = "up", play = "do", dot: dotProp = true, picker = true, options }: { keys?: number[]; voice?: Voice; intervals?: number[]; dir?: IntervalDir; /** "both": Do and then the note sound before the student sings (the easier way); "do": only Do */ play?: "do" | "both"; dot?: boolean; /** the Keys switch and key chips; false: the keys are the ones given, with nothing to pick */ picker?: boolean; options?: { keys: number[]; look: Look; dot: boolean } }) {
  useCoverage({ hints: 7 });
  const voice = useVoice(own);
  const range = VOICES[voice] ?? VOICES.tenor;
  const clef = clefFor(range);
  // Standard controls, each kept at Simple when the exercise sets it (several keys, the voice dot off); a hidden one
  // gives its default (the exercise's own setting), and what was picked returns when it shows again
  const standard = useLevelAtLeast("standard");
  const showKeys = useLevelAtLeast("standard", keysProp.length > 1) && picker;
  const showDot = useLevelAtLeast("standard", !dotProp);
  const [lookPicked, setLook] = useState<Look>("roll");
  const look = options?.look ?? (standard ? lookPicked : "roll");
  const [dotPicked, setDot] = useState(dotProp);
  const dot = options?.dot ?? (showDot ? dotPicked : dotProp);
  const [storedCents] = useAccuracy();
  const cents = standard ? storedCents : IN_TUNE_CENTS;
  // the keys picked on the chips, and Random (all twelve) as its own switch over them, so turning Random off gives the
  // picked keys back; all twelve given in the props start as Random over the first. Each question asks in one at random.
  const [first] = useState(() => {
    const ks = keysProp.length ? [...new Set(keysProp)].sort((a, b) => a - b) : [0];
    return ks.length === 12 ? [keysProp[0] ?? 0] : ks;
  });
  const [picked, setPicked] = useState(first);
  const [random, setRandom] = useState(keysProp.length >= 12);
  const keys = options?.keys ?? (showKeys ? (random ? ALL_KEYS : picked) : keysProp.length >= 12 ? ALL_KEYS : first);
  const [ask, setAsk] = useState<number | null>(null);
  const [lastPc, setPc] = useState(keys[0]);
  // before the first question Do follows the keys picked; a question asked keeps its own key
  const pc = ask !== null || keys.includes(lastPc) ? lastPc : keys[0];
  const toggleKey = (k: number) => setPicked((ks) => toggleOne(ks, k));

  const placed = useMemo(() => placeIn(pc, range, intervals, dir), [pc, range, intervals, dir]);

  const [phase, setPhase] = useState<Phase>("idle");
  // the note played in "prompt" or "hint" has ended, so on a touch screen the mic can open in the wait before listening
  const [played, setPlayed] = useState(false);
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

  // the keys, for the tool on screen (a plan may hold more than one), with no modifier and not while typing: Space
  // presses the big button (not on a focused button, which Space already presses): Start or Next, or Restart while the
  // interval is still to sing. Skip has no key, so Space never throws an interval away. R restarts the interval asked
  const onKey = useRef<Record<string, () => void>>({});
  const { ref: keysRef, armed: keysArmed } = useToolKeys((e, onControl) => {
    const k = e.key.toLowerCase();
    if (!(k in onKey.current) || (k === " " && onControl)) return;
    onKey.current[k]();
    return true;
  });

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
  const touch = useTouch();
  const listens = micOn && (!touch || phase === "listening" || ((phase === "prompt" || phase === "hint") && played));
  // a pitch heard before the mic closed is not the voice now
  useEffect(() => {
    pitch.current = null;
    smoother.current.reset();
  }, [listens]);
  const { status: micStatus } = useMicPitch(listens, undefined, onPitch);
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

  // Do sounds (and with `play` "both" the note after it), then the mic listens
  const both = play === "both";
  const prompt = async (midi: number, target: number) => {
    stopTimers();
    await wakeAudio();
    setPhase("prompt");
    setPlayed(false);
    const notes = both ? [midi, target] : [midi];
    sound(notes);
    const end = notes.length * NOTE_MS;
    timers.current = [setTimeout(() => setPlayed(true), end), setTimeout(() => setPhase("listening"), end + LISTEN_AFTER_MS)];
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
    void prompt(there.doNote.midi, there.doNote.midi + s);
    if (!micOn) startMic();
  };
  // the same interval again: the answer hidden, Do played, the mic listening; a second try doesn't count twice
  const restart = () => {
    if (ask === null) return;
    void prompt(doMidi, doMidi + ask);
    if (!micOn) startMic();
  };
  // the note to sing, on a tap; while it is still to find the mic waits it out as it does Do, so the piano can't answer for the student
  const hearTarget = () => {
    if (targetMidi === null) return;
    if (phase === "solved" || phase === "shown") return void tap(targetMidi, -2);
    stopTimers();
    setPhase("hint");
    setPlayed(false);
    void tap(targetMidi, -2);
    timers.current = [setTimeout(() => setPlayed(true), NOTE_MS), setTimeout(() => setPhase("listening"), NOTE_MS + LISTEN_AFTER_MS)];
  };
  useEffect(() => {
    const sung = phase === "solved" || phase === "shown";
    onKey.current = { " ": ask !== null && !sung ? restart : next, ...(ask !== null ? { r: restart } : {}) };
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
  /** an interval asked and not yet sung: the big button is Restart, and Skip moves on */
  const waiting = ask !== null && !found;
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
    return { ladder: { notes, signature: placed.signature, pcs: new Set([doNote.midi % 12, ((t.midi % 12) + 12) % 12]), title: longName(ask) } as Ladder, targetAt: ask > 0 ? 1 : 0 };
  }, [placed, target, ask]);

  if (!placed || !staff) return <p className="text-sm text-rose-300">None of these intervals fits the {range.label.toLowerCase()} voice.</p>;

  // before the first Start the cover over the picture says what happens
  const message = ask === null ? ""
    : phase === "prompt" ? (both ? "Here is Do, then the note…" : "Here is Do…")
    : phase === "hint" ? "Here is the note…"
    : phase === "listening" ? (micOn ? (dot ? "Sing it and hold the note. The dot turns green on Do and on the note." : "Sing it and hold the note.") : "Switch the mic on to sing your answer.")
    : phase === "solved" ? `Yes: ${target!.label}, ${target!.spelled.name}.` : `It was ${target!.label}, ${target!.spelled.name}.`;

  const doPlays = both ? "Do and the note play" : "Do plays";
  // one width for Start, Restart and Next, so the buttons after it stay put
  const big = "inline-flex min-w-[6.5rem] items-center justify-center gap-1.5 !border-sky-400/80 !bg-sky-500/25 !text-sky-50";
  const settings = standard && <Hint title="Settings" description="How close counts as on the note, and the volume."><ToolSettings accuracy /></Hint>;

  return (
    <div ref={keysRef} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span data-tour="interval-singer-start" className="inline-flex">
          {waiting
            ? <Hint title="Restart" description={`The same interval again: ${doPlays} and the mic listens.`}>
              <Button size="sm" onClick={restart} title={`The same interval again: ${doPlays} and the mic listens (Space)`} className={big}>
                Restart{keysArmed && <KeyCap className="hidden md:inline">Space</KeyCap>}
              </Button>
            </Hint>
            : <Hint title={ask === null ? "Start" : "Next"} description={both ? "Plays Do and then the note, then listens for you to sing the note." : "Plays Do, then listens for the interval you sing from it."}>
              <Button size="sm" onClick={next} title={`${ask === null ? "Start" : "Next interval"} (Space)`} className={big}>
                {ask === null ? "Start" : "Next"}{keysArmed && <KeyCap className="hidden md:inline">Space</KeyCap>}
              </Button>
            </Hint>}
        </span>
        {/* always drawn, off until they apply, so nothing moves as the question changes */}
        <Hint title="Skip" description="Moves on to a new interval."><Button size="sm" disabled={!waiting} onClick={next}>Skip</Button></Hint>
        <Button size="sm" disabled={!waiting} onClick={() => reveal(false)}>Show me</Button>
        <Button size="sm" disabled={!(ask !== null && found)} onClick={restart} title={`The same interval again: ${doPlays} and the mic listens (R)`} className="inline-flex items-center gap-1.5">Restart{keysArmed && <KeyCap className="hidden md:inline">R</KeyCap>}</Button>
        <span data-tour="interval-singer-mic" className="inline-flex items-center gap-2">
          <Hint title="Audio input" description="The input the mic uses. Start switches it on: the dot turns from amber to green. Press it to pick another input, see its level, or stop it.">
            <InputChip quiet status={micStatus} mic={{ on: micOn, onToggle: () => (micOn ? setMicOn(false) : startMic()) }} />
          </Hint>
        </span>
        <ToolHeadphonesHint />
        <span className={`text-sm tabular-nums text-slate-400 ${score.asked > 0 ? "" : "invisible"}`} aria-hidden={score.asked === 0}>{score.right}/{score.asked} sung</span>
        <span className="ml-auto" />
        {options ? settings : <>
        <Badge>{range.label}</Badge>
        {/* plain text, not a badge: a badge's capitals would turn m3 into M3 */}
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">{[...new Set(placed.asks.map(Math.abs))].sort((a, b) => a - b).map(shortName).join(" ")} {dir === "both" ? "up and down" : dir}</span>
        </>}
      </div>
      {!options && <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2 text-xs text-slate-400">
        {(standard || showKeys || showDot) && <span data-tour="interval-singer-options" className="inline-flex flex-wrap items-center gap-2">
        {standard && <Hint title="View" description="Shows Do and your note on a piano roll or on the staff."><LookSwitch look={look} onLook={setLook} /></Hint>}
        {showKeys && <Hint title="Keys" description="Where Do comes from: only the keys picked, or a random one of all twelve each time."><KeysSwitch random={random} onRandom={setRandom} /></Hint>}
        {showKeys && !random && <KeyChips picked={picked} onToggle={toggleKey} />}
        {showDot && <Checkbox checked={dot} onChange={setDot} title="Off is harder: you sing without seeing your voice">Show my voice</Checkbox>}
        </span>}
        <span className="ml-auto" />
        {settings}
      </div>}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-2xl font-semibold text-slate-50">
          Interval · <span className="text-sky-200">{ask === null ? "…" : shortName(ask)}</span>
          {/* the same interval in solfège: from Do up (or down) to its note */}
          {ask !== null && <span className="text-slate-300"> · Do {ask > 0 ? "↑" : "↓"} {solfegeOf(ask)}</span>}
        </p>
        {ask !== null && <p className="text-sm text-slate-400">{longName(ask)} from Do ({placed.doNote.spelled.name})</p>}
      </div>
      <p className={`min-h-5 text-sm ${phase === "solved" ? "text-emerald-300" : phase === "shown" ? "text-amber-300" : "text-slate-400"}`} aria-live="polite">{message}</p>
      <div data-tour="interval-singer-view" className="relative">
      <StartCover show={ask === null} title="Sing an interval" onStart={next} keyCap={keysArmed ? "Space" : undefined} note="The mic starts with it.">
        {both ? "Do plays, then the note. Sing the note back from Do and hold it." : "Do plays and the interval to sing shows above. Sing it from Do and hold the note."}
      </StartCover>
      {look === "roll" ? (
        <IntervalRoll doMidi={doMidi} low={doMidi + Math.min(0, ...placed.asks, ask ?? 0)} high={doMidi + Math.max(0, ...placed.asks, ask ?? 0)} target={targetMidi} found={found} doLabel={`Do · ${placed.doNote.spelled.name}`} targetLabel={target ? `${target.label} · ${target.spelled.name}` : ""} targetHint={ask !== null && target ? `${shortName(ask)} · ${target.label}` : ""}
          doName={`${placed.doNote.spelled.name}${placed.doNote.spelled.octave}`} targetName={target ? `${target.spelled.name}${target.spelled.octave}` : ""}
          pitch={pitch} cents={cents} dot={dot} live={micOn} onNote={(w) => (w === "do" ? void tap(doMidi, -1) : hearTarget())} />
      ) : (
        <SingingStaff ladder={staff.ladder} clef={clef} pitch={dot ? pitch : NO_PITCH} played={tapped === -1 ? (staff.targetAt === 0 ? 1 : 0) : tapped === -2 ? staff.targetAt : null} cents={cents}
          greens={(i) => i !== staff.targetAt} hidden={(i) => !found && i === staff.targetAt} question={(i) => (ask !== null && target && i === staff.targetAt ? [shortName(ask), target.label] : undefined)}
          onNote={(i) => (i === staff.targetAt ? hearTarget() : void tap(doMidi, -1))} />
      )}
      </div>
    </div>
  );
}
