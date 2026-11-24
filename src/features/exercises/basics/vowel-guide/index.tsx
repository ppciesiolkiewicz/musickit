"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import InputChip, { micStatusMessage } from "@/components/InputChip";
import { useStepPart } from "@/components/practice/exerciseStep";
import { StartCover } from "@/components/practice/StartCover";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import { useCoverage } from "@/features/guide/useCoverage";
import { voiceMapIn } from "@/features/theory/registers";
import { VOICES } from "@/features/theory/singing";
import { useAccuracy } from "@/features/theory/useAccuracy";
import { AccuracyRow } from "@/features/settings";
import { Button, Hint, PlaybackTip } from "@/components/ui";
import { PlayerCard } from "../../play-along/PlayerParts";
import { clampInt, stepHold } from "../voice-hill/hill";
import { useVoice, useVoiceRange } from "../voiceChoice";
import { noteLabel, useVoicePitch } from "../voicePitch";
import { WarmUpBar, useWarmUpKeys } from "../warmUpBar";
import { DEFAULTS, LIMITS, blend, cleanVowels, heardOf, holdsOf, liftOf, mouthShape, targetNotes, towards, type MouthShape, type Vowel, type VowelHold } from "./vowels";
import type { VowelGuideProps } from "./vowel-guide.props";

/** the breath between two vowels on one note, and before a new note (the note plays in it), in seconds */
const REST_SECONDS = 1;
const NOTE_REST_SECONDS = 2;
/** how long the note sounds, in ms; the mic opens after it */
const NOTE_MS = 1100;
/** how fast the drawn mouth moves to the next shape, per frame at 60 fps */
const FOLLOW = 0.1;
/** from this lift up the line under the mouth says what changes as the note gets higher */
const HIGH_LIFT = 0.2;

const SAY: Record<Vowel, string> = { ah: "“ah”", eh: "“eh”", ee: "“ee”", oh: "“oh”", oo: "“oo”" };
/** each vowel's mouth in words, as the course's "Sing it on a sound" says them */
const SHAPE: Record<Vowel, string> = {
  ah: "“ah” as in “father”: your mouth open tall.",
  eh: "“eh” as in “bed”: your jaw dropped, your mouth taller than wide.",
  ee: "“ee” as in “see”: your mouth almost as for “oo”, your lips a little round.\nKeep the corners of your mouth in, not spread in a smile.",
  oh: "“oh” as in “go”: your lips round, your mouth open.",
  oo: "“oo” as in “moon”: your lips round.",
};
/** what the mouth does as the note gets higher */
const HIGHER: Record<Vowel, string> = {
  ah: "Up here, let your jaw drop a little more.",
  eh: "Up here, open a little more and let the corners of your mouth come in.",
  ee: "Up here, open a little more and keep your lips a little round.",
  oh: "Up here, open a little more and keep your lips round.",
  oo: "Up here, open a little more and keep your lips round.",
};
const TIPS = [
  "Keep the sound quiet and easy. There is no need to push.",
  "Change only your mouth. The note stays where it is.",
  "Breathe whenever you need to. The ring waits.",
  "If a note feels tight, stop there. Don't reach for it.",
  "On “ee”, keep your lips a little round, almost as for “oo”. A wide smile flattens the sound.",
  "Keep your lips free to move. They shape the vowel and carry the feeling of the line.",
  "Open tall, not wide: drop your jaw instead of pulling the corners of your mouth back.",
  "Let your jaw hang loose. Only your lips and tongue change the vowel.",
];
const TIP_SECONDS = 8;

type Status = "idle" | "holding" | "rest" | "done";

/**
 * The vowel guide (`vowel-guide.props.ts`): a drawn mouth shows the vowel to sing, the note plays, and a ring round the
 * mouth fills while the mic hears the voice on that note. Each full ring moves on: the next vowel, then the next note up.
 * The mic reads the pitch only; the vowel is the singer's to copy from the mouth.
 */
export function View({ climb = "one-note", vowels: vowelsProp, seconds: secondsProp, voice: own = "tenor", hostSettings = false }: Omit<VowelGuideProps, "level"> & {
  /** the page holds the volume in its settings panel: no volume on the tool */
  hostSettings?: boolean;
}) {
  useCoverage({ hints: 2 });
  const voice = useVoice(own);
  const range = useVoiceRange(voice);
  const map = useMemo(() => voiceMapIn(voice in VOICES ? voice : "tenor", range), [voice, range]);
  const seconds = clampInt(secondsProp, LIMITS.seconds, DEFAULTS.seconds);
  const [cents] = useAccuracy();
  const vowelsKey = cleanVowels(vowelsProp).join(",");
  const vowels = useMemo(() => vowelsKey.split(",") as Vowel[], [vowelsKey]);
  const notes = useMemo(() => targetNotes(climb, map), [climb, map]);
  const holds = useMemo(() => holdsOf(vowels, notes), [vowels, notes]);

  const [status, setStatus] = useState<Status>("idle");
  // how many holds are behind the singer, held or skipped
  const [index, setIndex] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const { pitch, status: micStatus } = useVoicePitch(micOn);

  const at = holds[Math.min(index, holds.length - 1)];
  const target = useMemo(() => mouthShape(at.vowel, liftOf(at.midi, map)), [at, map]);

  // what each frame draws, in one state so a frame is one render
  const [frame, setFrame] = useState({ heard: null as number | null, progress: 0, t: 0, mouth: target });
  const live = useRef({ progress: 0, t: 0, restLeft: 0, index: 0, status: "idle" as Status, mouth: target });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // what the frame loop and the holds read, always the latest
  const cfg = useRef({ seconds, cents, holds, map });
  useEffect(() => {
    cfg.current = { seconds, cents, holds, map };
  });

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setMicOn(false);
    live.current.status = "idle";
    setStatus((s) => (s === "done" ? s : "idle"));
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  /** sounds the note of the hold the singer is on */
  const playNote = useCallback(async () => {
    await wakeAudio();
    const all = cfg.current.holds;
    const m = all[Math.min(live.current.index, all.length - 1)].midi;
    const piano = getSharedPiano();
    piano.noteOn(m);
    setTimeout(() => piano.noteOff(m), NOTE_MS * 0.9);
  }, []);

  /** a breath before the next hold; a new note plays in it, so the mic never counts the piano */
  const breathe = useCallback((withNote: boolean) => {
    const s = live.current;
    s.status = "rest";
    s.restLeft = withNote ? NOTE_REST_SECONDS : REST_SECONDS;
    s.progress = 0;
    setStatus("rest");
    if (withNote) setTimeout(() => void playNote(), 250);
  }, [playNote]);

  /** the hold being sung ends, held or skipped: on to the next vowel or note after a breath, or the end */
  const finish = useCallback(() => {
    const s = live.current;
    const all = cfg.current.holds;
    const from = all[Math.min(s.index, all.length - 1)];
    s.index += 1;
    s.progress = 0;
    setIndex(s.index);
    if (s.index >= all.length) {
      s.status = "done";
      setStatus("done");
      setMicOn(false);
    } else {
      breathe(all[s.index].midi !== from.midi);
    }
  }, [breathe]);

  // Start and Restart: from the first vowel on the first note; the note plays, then the mic opens
  const start = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    live.current = { ...live.current, progress: 0, t: 0, restLeft: 0, index: 0, status: "holding" };
    setIndex(0);
    setStatus("holding");
    await playNote();
    timer.current = setTimeout(() => setMicOn(true), NOTE_MS);
  }, [playNote]);

  // the frame loop runs while it runs: it fills or drains the hold, counts the breath and moves the mouth
  const running = status === "holding" || status === "rest";
  useEffect(() => {
    if (!running) return;
    let id = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = live.current;
      const c = cfg.current;
      const hold: VowelHold = c.holds[Math.min(s.index, c.holds.length - 1)];
      const m = pitch.current;
      s.t += dt;
      if (s.status === "holding") {
        s.progress = stepHold(s.progress, heardOf(m, hold.midi, c.cents), dt, c.seconds);
        if (s.progress >= 1) finish();
      } else if (s.status === "rest") {
        s.restLeft -= dt;
        if (s.restLeft <= 0) {
          s.progress = 0;
          s.status = "holding";
          setStatus("holding");
        }
      }
      const next: VowelHold = c.holds[Math.min(s.index, c.holds.length - 1)];
      s.mouth = blend(s.mouth, mouthShape(next.vowel, liftOf(next.midi, c.map)), Math.min(1, FOLLOW * dt * 60));
      setFrame({ heard: m, progress: s.progress, t: s.t, mouth: s.mouth });
      if (s.status === "holding" || s.status === "rest") id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running, pitch, finish]);

  // new settings while it runs (notes, vowels, voice, length): it starts over on them after a breath with the first
  // note, and keeps running
  const settings = `${climb}|${vowelsKey}|${notes.join(",")}|${seconds}`;
  const lastSettings = useRef(settings);
  useEffect(() => {
    if (settings === lastSettings.current) return;
    lastSettings.current = settings;
    if (live.current.status !== "holding" && live.current.status !== "rest") return;
    live.current.index = 0;
    setIndex(0);
    breathe(true);
  }, [settings, breathe]);

  useStepPart({ kind: "mic", on: running, start, stop });
  // Skip: the hold being sung is passed over and the next starts after its breath; in the breath, the breath is cut short
  const skip = () => {
    const s = live.current;
    if (s.status === "holding") finish();
    else if (s.status === "rest") s.restLeft = 0;
  };
  const actions = { status: running ? "running" as const : status === "done" ? "done" as const : "idle" as const, onStart: () => void start(), onStop: stop, onRestart: () => void start(), onSkip: skip };
  const { ref: keysRef, armed } = useWarmUpKeys(actions);

  const heard = running && micOn ? frame.heard : null;
  const dir = heard === null ? null : towards(heard, at.midi, cents);
  const inside = status === "holding" && dir === 0;
  const word = status === "done" ? "That was the last vowel"
    : status === "rest" ? "Breathe in"
    : status === "holding" ? (!micOn ? "Listen…" : dir === null ? `Sing ${SAY[at.vowel]}` : dir === 0 ? "Hold it" : dir > 0 ? "Go higher" : "Go lower")
    : "Ready when you are";
  const wordTone = status === "rest" ? "text-sky-300" : inside ? "text-emerald-300" : dir !== null ? "text-amber-200" : "text-slate-200";
  const vowelAt = index % vowels.length;
  const noteAt = Math.min(notes.length - 1, Math.floor(index / vowels.length));
  const sub = status === "done" ? "Press Restart above to go again."
    : running ? `${SAY[at.vowel]} on ${noteLabel(at.midi)}${heard !== null ? ` · you: ${noteLabel(heard)}` : ""}`
    : `The first note is ${noteLabel(notes[0])}.`;
  const micNote = micStatusMessage(micStatus);
  const tip = TIPS[Math.floor(frame.t / TIP_SECONDS) % TIPS.length];
  const title = vowels.map((v) => SAY[v]).join(" ");
  const where = notes.length === 1 ? `on ${noteLabel(notes[0])}` : `from ${noteLabel(notes[0])} up to ${noteLabel(notes[notes.length - 1])}`;
  const high = liftOf(at.midi, map) >= HIGH_LIFT;
  const done = status === "done";

  return (
    <PlayerCard ref={keysRef}>
      <div data-tour="vowel-start">
        <WarmUpBar {...actions} armed={armed} hostSettings={hostSettings} settings={<AccuracyRow look="menu" />} skip="the next vowel" what="Plays the note, then the mic listens while you hold it on the vowel shown.">
          <span data-tour="vowel-mic" className="inline-flex">
            <Hint title="Audio input" description="The input the mic uses. Start switches it on: the dot turns from amber to green. Press it to pick another input or see its level.">
              <InputChip quiet status={micStatus} mic={{ on: micOn, onToggle: () => (running ? stop() : void start()) }} />
            </Hint>
          </span>
          <Hint title="Play note" description={`Plays ${noteLabel(at.midi)}, the note to hold, to find it again.`}>
            <Button size="sm" data-tour="vowel-note" onClick={() => void playNote()} title={`Play ${noteLabel(at.midi)}`} className="inline-flex items-center gap-1.5">
              <Icon name="volume-2" size={14} />Play note
            </Button>
          </Hint>
        </WarmUpBar>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vowels · the mouth</p>
        <h3 className="truncate text-base font-semibold text-slate-100">{title}</h3>
        <p className="text-xs tabular-nums text-slate-400">{seconds} seconds each · {where} · {range.label}</p>
      </div>

      <div className="flex flex-col items-center gap-0.5 text-center" aria-live="polite">
        <p className={`min-h-8 text-2xl font-medium transition-colors duration-300 ${wordTone}`}>{word}</p>
        <p className="min-h-5 text-sm tabular-nums text-slate-400">{sub}</p>
        {micNote && <p className="text-xs text-amber-300">{micNote}</p>}
      </div>

      <div data-tour="vowel-view" className="relative flex flex-col items-center gap-2">
        <StartCover show={status === "idle" && index === 0} title={title} onStart={() => void start()} keyCap={armed ? "Space" : undefined} note="The note plays first, then the mic starts.">
          Hold the note on the vowel the mouth shows until the ring fills. The mic checks the note only, so the vowel is yours to shape: copy the mouth.
        </StartCover>
        <Mouth shape={running ? frame.mouth : target} vowel={at.vowel} progress={frame.progress} inside={inside} resting={status === "rest"} />
        <p className="min-h-10 max-w-md whitespace-pre-line text-center text-sm leading-snug text-slate-200">{high ? HIGHER[at.vowel] : SHAPE[at.vowel]}</p>
        <Row label="Vowels" items={vowels.map((v) => SAY[v])} at={done ? -1 : vowelAt} past={done ? vowels.length : vowelAt} progress={frame.progress} />
        {notes.length > 1 && <Row label="Notes" items={notes.map(noteLabel)} at={done ? -1 : noteAt} past={done ? notes.length : noteAt} />}
        <p className="text-xs text-slate-400">The mic hears the note, not the vowel.</p>
      </div>

      <PlaybackTip live={running} className="border-t border-slate-800 pt-3"
        idle={done ? "Notice which vowel was the hardest to keep on the note."
          : notes.length === 1 ? `Hold each vowel for ${seconds} seconds on the same note, with a breath between.`
          : `Hold each vowel for ${seconds} seconds, then the same vowels one note higher. Each new note plays in the breath before it.`}>
        {tip}
      </PlaybackTip>
    </PlayerCard>
  );
}

/** A row of the vowels or the notes: the ones behind the singer green, the one being sung lit (and filling, with `progress`). */
function Row({ label, items, at, past, progress }: { label: string; items: string[]; at: number; past: number; progress?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5" aria-label={`${label}: ${at < 0 ? "all done" : `${items[at]}, ${at + 1} of ${items.length}`}`}>
      <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {items.map((item, i) => (
        <span key={i} className={`relative overflow-hidden rounded-full border px-2.5 py-0.5 text-sm tabular-nums ${i === at ? "border-sky-300/80 text-sky-50" : i < past ? "border-emerald-400/50 text-emerald-200" : "border-slate-700 text-slate-400"}`}>
          {i === at && progress !== undefined && <span aria-hidden className="absolute inset-y-0 left-0 bg-emerald-400/25" style={{ width: `${progress * 100}%` }} />}
          <span className="relative">{item}</span>
        </span>
      ))}
    </div>
  );
}

const W = 260, H = 220, CX = W / 2, CY = H / 2, RING = 102;

/**
 * The mouth, drawn from its three numbers: the lips an ellipse as wide as `wide` and as tall as `open`, thicker the
 * more `round` they are, the dark of the mouth inside them with the top teeth and the tongue. Round it the ring of the hold.
 */
function Mouth({ shape, vowel, progress, inside, resting }: { shape: MouthShape; vowel: Vowel; progress: number; inside: boolean; resting: boolean }) {
  const id = useId().replace(/:/g, "");
  const rx = 22 + shape.wide * 50;
  const ry = 12 + shape.open * 62;
  const lip = 8 + shape.round * 7;
  const ix = Math.max(2, rx - lip);
  const iy = Math.max(1.5, ry - lip);
  const C = 2 * Math.PI * RING;
  const tone = inside ? "text-emerald-300" : resting ? "text-sky-300" : "text-slate-500";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full max-w-xs" role="img" aria-label={`A mouth in the shape of ${SAY[vowel]}. The ring round it fills while you hold the note.`}>
      <defs>
        <clipPath id={`${id}-in`}><ellipse cx={CX} cy={CY} rx={ix} ry={iy} /></clipPath>
      </defs>
      <g className={`${tone} transition-colors duration-300`}>
        <circle cx={CX} cy={CY} r={RING} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
        <circle cx={CX} cy={CY} r={RING} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform={`rotate(-90 ${CX} ${CY})`} />
      </g>
      {/* the lips, then the inside of the mouth */}
      <ellipse cx={CX} cy={CY} rx={rx} ry={ry} fill="rgb(251 113 133)" />
      <ellipse cx={CX} cy={CY} rx={ix} ry={iy} fill="rgb(15 23 42)" />
      <g clipPath={`url(#${id}-in)`}>
        <rect x={CX - ix} y={CY - iy} width={2 * ix} height={Math.min(11, iy * 0.45)} fill="rgb(241 245 249)" />
        <ellipse cx={CX} cy={CY + iy} rx={ix * 0.72} ry={iy * 0.5} fill="rgb(225 29 72)" fillOpacity="0.75" />
      </g>
      {/* a thin line round the inside of the lips, so a nearly closed mouth still reads as one */}
      <ellipse cx={CX} cy={CY} rx={ix} ry={iy} fill="none" stroke="rgb(159 18 57)" strokeOpacity="0.6" strokeWidth="1.5" />
    </svg>
  );
}
