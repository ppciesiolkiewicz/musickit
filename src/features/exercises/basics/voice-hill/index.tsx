"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import InputChip, { micStatusMessage } from "@/components/InputChip";
import { useStepPart } from "@/components/practice/exerciseStep";
import { StartCover } from "@/components/practice/StartCover";
import { getAudioContext, getOutputBus, getSharedPiano, wakeAudio } from "@/features/sound";
import { useCoverage } from "@/features/guide/useCoverage";
import { voiceMap } from "@/features/theory/registers";
import { VOICES } from "@/features/theory/singing";
import { Button, Hint } from "@/components/ui";
import { PlayerCard } from "../../play-along/PlayerParts";
import { useVoice } from "../voiceChoice";
import { noteLabel, useVoicePitch } from "../voicePitch";
import { WarmUpBar, useWarmUpKeys } from "../warmUpBar";
import { DEFAULTS, LIMITS, ballX, clampInt, heightAt, inZone, stepHold, towards, zoneFor, zoneX, type HillSound, type HillWhere } from "./hill";
import type { VoiceHillProps } from "./voice-hill.props";

/** slack at the zone's edges: a lip roll or a hum wobbles, so this is looser than a sung note */
const CENTS = 40;
/** the breath between holds, in seconds */
const REST_SECONDS = 2;
/** how long the note sounds on Play note, in ms; the mic opens after it */
const NOTE_MS = 1100;
/** how fast the drawn ball follows the voice, per frame at 60 fps */
const FOLLOW = 0.12;

const PLACE: Record<HillWhere, string> = { low: "Low", middle: "Middle", high: "High" };
const SOUND: Record<HillSound, string> = { hum: "hum", oo: "“oo”", ee: "“ee”" };
const DOING: Record<HillSound, string> = { hum: "hum", oo: "sing on “oo”", ee: "sing on “ee”" };
const NOW: Record<HillSound, string> = { hum: "Hum now", oo: "Sing “oo”", ee: "Sing “ee”" };

const WHAT: Record<HillWhere, (s: HillSound) => string> = {
  low: (s) => `Roll the ball down into the hollow: ${DOING[s]} on a low, easy note. Let the sound wobble a little to keep it loose, but keep the ball on the green part until the ring fills.`,
  middle: (s) => `Rest the ball in the valley: ${DOING[s]} on an easy note in the middle of your voice. Let the sound wobble a little to keep it loose, but keep the ball on the green part until the ring fills.`,
  high: (s) => `Lift the ball to the top of the hill: ${DOING[s]} on a light, high note. Keep the ball on the green part until the ring fills.`,
};
const TIPS: Record<HillWhere, string[]> = {
  low: ["Wobble the sound a little: the ball can move, as long as it stays on the green part.", "Let your jaw hang loose.", "Low and easy: there is no need to push down.", "Breathe whenever you need to. The ring waits."],
  middle: ["Wobble the sound a little: the ball can move, as long as it stays between the marks.", "Keep the sound relaxed.", "Feel where the buzz sits: lips, face or chest.", "Breathe whenever you need to. The ring waits."],
  high: ["Keep it light and soft, like a sigh.", "Too much effort? Go a little lower: easy is the point.", "Breathe whenever you need to. The ring waits."],
};
const TIP_SECONDS = 8;


/** A small bell when a hold is done. */
function chime() {
  const ctx = getAudioContext();
  const at = ctx.currentTime + 0.01;
  for (const [hz, peak] of [[880, 0.12], [1320, 0.04]] as const) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.value = hz;
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(peak, at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0005, at + 1.1);
    osc.connect(env).connect(getOutputBus());
    osc.start(at);
    osc.stop(at + 1.2);
  }
}

type Status = "idle" | "holding" | "rest" | "done";
type Hold = "held" | "skipped";

/**
 * The hill (`voice-hill.props.ts`): a ball on a slope or in a valley follows the voice from the mic, and a ring round it
 * fills while the voice stays in the lit place. Each full ring is one hold; a short breath and the next one starts.
 */
export function View({ where = "low", sound = "hum", seconds: secondsProp, reps: repsProp, voice: own = "tenor" }: VoiceHillProps) {
  useCoverage({ hints: 2 });
  const voice = useVoice(own);
  const range = VOICES[voice] ?? VOICES.tenor;
  const map = useMemo(() => voiceMap(voice in VOICES ? voice : "tenor"), [voice]);
  const seconds = clampInt(secondsProp, LIMITS.seconds, DEFAULTS.seconds);
  const reps = clampInt(repsProp, LIMITS.reps, DEFAULTS.reps);

  const [status, setStatus] = useState<Status>("idle");
  // each hold so far: held to the end, or skipped
  const [holds, setHolds] = useState<Hold[]>([]);
  // the place of the hold being sung (low steps down a semitone a hold); the frame loop reads it from the ref
  const zone = useMemo(() => zoneFor(where, map, Math.min(holds.length, reps - 1)), [where, map, holds.length, reps]);
  const zoneRef = useRef(zone);
  useEffect(() => {
    zoneRef.current = zone;
  }, [zone]);
  const [micOn, setMicOn] = useState(false);
  const { pitch, status: micStatus } = useVoicePitch(micOn);

  // what each frame draws, kept in one state so a frame is one render; the ball starts away from the place and
  // stays where it is when the settings change
  const [startX] = useState(where === "low" ? 0.82 : where === "high" ? 0.18 : 0.15);
  const [frame, setFrame] = useState({ x: startX, heard: null as number | null, progress: 0, t: 0 });
  const live = useRef({ x: startX, progress: 0, t: 0, restLeft: 0, holds: [] as Hold[], status: "idle" as Status });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // the settings the frame loop and the holds read, always the latest props
  const cfg = useRef({ seconds, reps, where });
  useEffect(() => {
    cfg.current = { seconds, reps, where };
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

  const playNote = useCallback(async () => {
    await wakeAudio();
    const piano = getSharedPiano();
    const m = Math.round(zoneRef.current.ref);
    piano.noteOn(m);
    setTimeout(() => piano.noteOff(m), NOTE_MS * 0.9);
  }, []);

  /** a breath before the next hold; the note plays in it once the place has moved, so the mic never counts the piano */
  const breathe = useCallback((withNote: boolean) => {
    const s = live.current;
    s.status = "rest";
    s.restLeft = REST_SECONDS;
    s.progress = 0;
    setStatus("rest");
    if (withNote) setTimeout(() => void playNote(), 250);
  }, [playNote]);

  /** the hold being sung ends, held or skipped: a breath before the next (`rest`), or straight on, or the end */
  const finish = useCallback((how: Hold, rest: boolean) => {
    const s = live.current;
    s.holds = [...s.holds, how];
    s.progress = 0;
    setHolds(s.holds);
    if (s.holds.length >= cfg.current.reps) {
      s.status = "done";
      setStatus("done");
      setMicOn(false);
    } else if (rest) {
      // low steps down a semitone a hold: its new note plays in the breath
      breathe(cfg.current.where === "low");
    } else {
      s.status = "holding";
      setStatus("holding");
    }
  }, [breathe]);

  // Start and Restart: the holds start over from the first; the note plays, then the mic opens
  const start = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    live.current = { ...live.current, progress: 0, t: 0, restLeft: 0, holds: [], status: "holding" };
    setHolds([]);
    setStatus("holding");
    await playNote();
    timer.current = setTimeout(() => setMicOn(true), NOTE_MS);
  }, [playNote]);

  // the frame loop runs while it runs: it fills or drains the hold, counts the breath and moves the ball
  const running = status === "holding" || status === "rest";
  useEffect(() => {
    if (!running) return;
    let id = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = live.current;
      const m = pitch.current;
      s.t += dt;
      if (s.status === "holding") {
        const heard = m === null ? "none" : inZone(m, zoneRef.current, CENTS) ? "in" : "out";
        s.progress = stepHold(s.progress, heard, dt, cfg.current.seconds);
        if (s.progress >= 1) {
          chime();
          finish("held", true);
        }
      } else if (s.status === "rest") {
        s.restLeft -= dt;
        if (s.restLeft <= 0) {
          s.progress = 0;
          s.status = "holding";
          setStatus("holding");
        }
      }
      if (m !== null) s.x += (ballX(m, zoneRef.current) - s.x) * Math.min(1, FOLLOW * dt * 60);
      setFrame({ x: s.x, heard: m, progress: s.progress, t: s.t });
      if (s.status === "holding" || s.status === "rest") id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [running, pitch, finish]);

  // new settings while it runs (place, sound, voice, length): the holds start over on them after a breath with the
  // new note, and it keeps running
  const settings = `${where}|${sound}|${voice}|${seconds}|${reps}`;
  const lastSettings = useRef(settings);
  useEffect(() => {
    if (settings === lastSettings.current) return;
    lastSettings.current = settings;
    if (live.current.status !== "holding" && live.current.status !== "rest") return;
    live.current.holds = [];
    setHolds([]);
    breathe(true);
  }, [settings, breathe]);

  useStepPart({ kind: "mic", on: running, start, stop });
  // Skip: the hold being sung counts as skipped and the next starts now (low: after a breath with its new note); in the breath, the breath is cut short
  const skip = () => {
    const s = live.current;
    if (s.status === "holding") finish("skipped", where === "low");
    else if (s.status === "rest") s.restLeft = 0;
  };
  const actions = { status: running ? "running" as const : status === "done" ? "done" as const : "idle" as const, onStart: () => void start(), onStop: stop, onRestart: () => void start(), onSkip: skip };
  const { ref: keysRef, armed } = useWarmUpKeys(actions);
  const done = holds.length;

  const dir = frame.heard === null ? null : towards(frame.heard, zone, CENTS);
  const inside = running && dir === 0;
  const word = status === "done" ? "All holds done"
    : status === "rest" ? "Breathe in"
    : status === "holding" ? (!micOn ? "Listen…" : dir === null ? NOW[sound] : dir === 0 ? "Hold it" : dir > 0 ? "Go higher" : "Go lower")
    : "Ready when you are";
  const wordTone = status === "done" ? "text-emerald-300" : status === "rest" ? "text-sky-300" : inside ? "text-emerald-300" : dir !== null && running ? "text-amber-200" : "text-slate-200";
  const aim = where === "low" ? `${noteLabel(zone.hi)} or lower` : where === "high" ? `${noteLabel(zone.lo)} or higher` : `${noteLabel(zone.lo)} to ${noteLabel(zone.hi)}`;
  const sub = status === "done" ? "Notice how your voice feels now."
    : running ? `Hold ${Math.min(done + 1, reps)} of ${reps} · aim for ${aim}${frame.heard !== null && micOn ? ` · you: ${noteLabel(frame.heard)}` : ""}`
    : `Aim for ${aim}.`;
  const micNote = micStatusMessage(micStatus);
  const tips = TIPS[where];
  const tip = tips[Math.floor(frame.t / TIP_SECONDS) % tips.length];
  const title = `${PLACE[where]} ${SOUND[sound]}`;

  return (
    <PlayerCard ref={keysRef}>
      <div data-tour="hill-start">
      <WarmUpBar {...actions} armed={armed} skip="the next hold" what="Plays the note, then the mic listens while you hold your sound.">
        <span data-tour="hill-mic" className="inline-flex">
          <Hint title="Audio input" description="The input the mic uses. Start switches it on: the dot turns from amber to green. Press it to pick another input or see its level.">
            <InputChip quiet status={micStatus} mic={{ on: micOn, onToggle: () => (running ? stop() : void start()) }} />
          </Hint>
        </span>
        <Hint title="Play note" description={`Plays ${noteLabel(zone.ref)}, the edge of the green part, to find it again.`}>
          <Button size="sm" data-tour="hill-note" onClick={() => void playNote()} title={`Play ${noteLabel(zone.ref)}`} className="inline-flex items-center gap-1.5">
            <Icon name="volume-2" size={14} />Play note
          </Button>
        </Hint>
      </WarmUpBar>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Warm-up · the hill</p>
        <h3 className="truncate text-base font-semibold text-slate-100">{title}</h3>
        <p className="text-xs tabular-nums text-slate-400">{seconds} seconds × {reps} · {range.label}</p>
      </div>

      <div className="flex flex-col items-center gap-0.5 text-center" aria-live="polite">
        <p className={`min-h-8 text-2xl font-medium transition-colors duration-300 ${wordTone}`}>{word}</p>
        <p className="min-h-5 text-sm tabular-nums text-slate-400">{sub}</p>
        {micNote && <p className="text-xs text-amber-300">{micNote}</p>}
      </div>

      <div data-tour="hill-view" className="relative">
        <StartCover show={status === "idle" && done === 0} title={title} onStart={() => void start()} keyCap={armed ? "Space" : undefined} note="The note plays first, then the mic starts.">
          {WHAT[where](sound)}
        </StartCover>
        <Hill where={where} zone={zoneX(zone)} edgeLabels={[Number.isFinite(zone.lo) ? noteLabel(zone.lo) : null, Number.isFinite(zone.hi) ? noteLabel(zone.hi) : null]}
          x={frame.x} heard={running && frame.heard !== null} inside={inside} toward={running && dir ? dir : 0} progress={frame.progress} resting={status === "rest"} done={status === "done"} />
      </div>

      <Reps total={reps} holds={holds} current={running ? done : -1} progress={frame.progress} />

      <p className="min-h-10 border-t border-slate-800 pt-3 text-sm leading-snug text-slate-300">
        {running ? <><span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tip</span>{tip}</> : status === "done" ? "Press Restart above to go again." : where === "low" ? `Hold it ${reps} times, ${seconds} seconds each, a little lower each time. The new note plays in the breath between.` : `Hold it ${reps} times, ${seconds} seconds each, with a breath between.`}
      </p>
    </PlayerCard>
  );
}

/** One bar a hold: green when held, faint and struck when skipped, the one being held filling as its ring does. */
function Reps({ total, holds, current, progress }: { total: number; holds: Hold[]; current: number; progress: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-label={`${holds.length} of ${total} holds done`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} title={holds[i] === "skipped" ? "Skipped" : undefined} className={`relative h-2 w-8 overflow-hidden rounded-full ${holds[i] === "held" ? "bg-emerald-400" : holds[i] === "skipped" ? "bg-slate-500/40 outline outline-1 outline-dashed outline-slate-500" : "bg-slate-700/70"}`}>
          {i === current && <span className="absolute inset-y-0 left-0 bg-emerald-400/80" style={{ width: `${progress * 100}%` }} />}
        </span>
      ))}
    </div>
  );
}

const W = 400, H = 190, PAD = 22, TOP = 34, BOTTOM = 160, R = 15;
const px = (x: number) => PAD + x * (W - 2 * PAD);
const py = (where: HillWhere, x: number) => BOTTOM - heightAt(where, x) * (BOTTOM - TOP);

/** The ground, the lit place to aim for with its edge notes, and the ball with its ring. */
function Hill({ where, zone, edgeLabels, x, heard, inside, toward, progress, resting, done }: {
  where: HillWhere; zone: [number, number]; edgeLabels: [string | null, string | null]; x: number; heard: boolean; inside: boolean; /** which way the voice has to go: 1 higher (right), -1 lower (left), 0 none */ toward: number; progress: number; resting: boolean; done: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const steps = 80;
  const line = (a: number, b: number) => Array.from({ length: steps + 1 }, (_, i) => {
    const t = a + ((b - a) * i) / steps;
    return `${i ? "L" : "M"}${px(t).toFixed(1)},${py(where, t).toFixed(1)}`;
  }).join("");
  const ground = line(0, 1);
  const cx = px(Math.min(1, Math.max(0, x)));
  const cy = py(where, Math.min(1, Math.max(0, x))) - R - 2;
  const C = 2 * Math.PI * (R + 6);
  const ballTone = done || inside ? "text-emerald-300" : resting ? "text-sky-300" : heard ? "text-amber-200" : "text-slate-500";
  const labels = ([[zone[0], edgeLabels[0]], [zone[1], edgeLabels[1]]] as const).filter(([zx, l]) => l && zx > 0 && zx < 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`The hill: the ball shows your voice, the green part of the ground is where to hold it`}>
      <defs>
        <linearGradient id={`${id}-earth`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="rgb(56 189 248)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-ball`} cx="35%" cy="32%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.95" />
          <stop offset="45%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <path d={`${ground}L${px(1)},${H}L${px(0)},${H}Z`} fill={`url(#${id}-earth)`} />
      <path d={ground} fill="none" stroke="rgb(148 163 184)" strokeOpacity="0.35" strokeWidth="2" />
      {/* the place to hold: a wide soft band and a bright line on the ground */}
      <path d={line(zone[0], zone[1])} fill="none" stroke="rgb(52 211 153)" strokeOpacity={inside ? 0.35 : 0.18} strokeWidth="16" strokeLinecap="round" className="transition-[stroke-opacity] duration-300" />
      <path d={line(zone[0], zone[1])} fill="none" stroke="rgb(52 211 153)" strokeOpacity="0.9" strokeWidth="2.5" strokeLinecap="round" />
      {labels.map(([zx, l]) => (
        <g key={zx}>
          <line x1={px(zx)} x2={px(zx)} y1={py(where, zx) - 9} y2={py(where, zx) + 9} stroke="rgb(52 211 153)" strokeWidth="2" />
          <text x={px(zx)} y={py(where, zx) - 16} textAnchor="middle" className="fill-emerald-200 text-[12px] font-semibold">{l}</text>
        </g>
      ))}
      <text x={px(0)} y={H - 6} className="fill-slate-400 text-[11px]">lower</text>
      <text x={px(1)} y={H - 6} textAnchor="end" className="fill-slate-400 text-[11px]">higher</text>
      <g className={`${ballTone} transition-colors duration-300`} opacity={heard || resting || done ? 1 : 0.55}>
        {inside && <circle cx={cx} cy={cy} r={R + 12} fill="currentColor" opacity="0.15" />}
        <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform={`rotate(-90 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={R} fill={`url(#${id}-ball)`} />
        {/* a chevron on the side to move to */}
        {toward !== 0 && <path d={`M${cx + toward * (R + 14)},${cy - 7}l${toward * 7},7l${-toward * 7},7`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      </g>
    </svg>
  );
}
