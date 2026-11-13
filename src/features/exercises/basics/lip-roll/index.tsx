"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InputChip, { micStatusMessage } from "@/components/InputChip";
import { useStepPart } from "@/components/practice/exerciseStep";
import { StartCover } from "@/components/practice/StartCover";
import { useSpaceKey } from "@/components/practice/toolKeys";
import { useAudioFocus, wakeAudio } from "@/features/sound";
import { VOICES } from "@/features/theory/singing";
import { PlayButton, PlayerCard } from "../../play-along/PlayerParts";
import { useVoice } from "../voiceChoice";
import { noteLabel, useTouch, useVoicePitch } from "../voicePitch";
import { DEFAULTS, LIMITS, clampInt, glidePath, midiAt, nearPath, roundAt, roundSeconds, type GlidePath, type LipRollShape, type RoundPhase } from "./glide";
import { playGlide, type GlideSound } from "./sound";
import type { LipRollProps } from "./lip-roll.props";

const TITLES: Record<LipRollShape, string> = { down: "Lip roll slide down", up: "Lip roll slide up", siren: "Lip roll siren", hold: "Lip roll on one note" };
const WHAT: Record<LipRollShape, string> = {
  down: "Listen to the tone slide down, then lip roll the same slide on your own. Your line is drawn over the tone's.",
  up: "Listen to the tone slide up, then lip roll the same slide on your own. Your line is drawn over the tone's.",
  siren: "Listen to the tone slide up and back down, then lip roll the same way on your own. Your line is drawn over the tone's.",
  hold: "Listen to the note, then lip roll it on your own and keep the buzz steady. Your line is drawn over the tone's.",
};
const TIPS = [
  "Let your lips buzz loosely, like a motorboat.",
  "Lips won't keep buzzing? Press your cheeks lightly with two fingers.",
  "Keep the air going evenly: the buzz is the breath you hear.",
  "Close is good enough. An easy, steady buzz matters more than the exact note.",
];
const TIP_SECONDS = 9;
const SPAN_NAME: Record<number, string> = { 3: "a minor 3rd", 4: "a major 3rd", 5: "a 4th", 7: "a 5th", 12: "an octave" };

type Point = { at: number; midi: number };

/**
 * The lip roll (`lip-roll.props.ts`): each round the tone sounds along its path while a playhead runs over it, then the
 * playhead runs again in silence while the mic draws the student's line. A short rest, then the next round.
 */
export function View({ shape = "down", span: spanProp, seconds: secondsProp, plays: playsProp, voice: own = "tenor" }: LipRollProps) {
  const voice = useVoice(own);
  const range = VOICES[voice] ?? VOICES.tenor;
  const span = clampInt(spanProp, LIMITS.span, DEFAULTS.span);
  const seconds = clampInt(secondsProp, LIMITS.seconds, DEFAULTS.seconds);
  const plays = clampInt(playsProp, LIMITS.plays, DEFAULTS.plays);
  const path = useMemo(() => glidePath(shape, range, span, seconds), [shape, range, span, seconds]);
  const total = roundSeconds(path);

  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [now, setNow] = useState<{ round: number; phase: RoundPhase; at: number; t: number; voice: number | null } | null>(null);
  const [trace, setTrace] = useState<Point[]>([]);
  const sound = useRef<GlideSound | null>(null);
  const raf = useRef(0);
  const touch = useTouch();
  // on a touch screen the mic opens only for the student's turn, so the phone plays the tone at full volume
  const micWanted = status === "running" && (!touch || now?.phase === "gap" || now?.phase === "you");
  const [micOff, setMicOff] = useState(false);
  const { pitch, status: micStatus } = useVoicePitch(micWanted && !micOff);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    sound.current?.stop();
    sound.current = null;
    setStatus((s) => (s === "running" ? "idle" : s));
    setNow(null);
  }, []);
  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    sound.current?.stop();
  }, []);

  const start = useCallback(async () => {
    stop();
    await wakeAudio();
    setTrace([]);
    setStatus("running");
    setMicOff(false);
    const t0 = performance.now();
    let round = -1;
    let line: Point[] = [];
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      const r = Math.floor(t / total);
      if (r >= plays) {
        sound.current = null;
        setStatus("done");
        setNow(null);
        return;
      }
      if (r !== round) {
        round = r;
        sound.current = playGlide(path);
      }
      const at = roundAt(path, t - r * total) ?? { phase: "rest" as const, at: path.duration };
      if (at.phase === "listen" && line.length) line = [];
      if (at.phase === "you") {
        const m = pitch.current;
        if (m !== null) line = [...line, { at: at.at, midi: m }];
        else if (line.length && line[line.length - 1].midi !== -1) line = [...line, { at: at.at, midi: -1 }];
      }
      setTrace(line);
      setNow({ round: r, phase: at.phase, at: at.at, t, voice: at.phase === "you" ? pitch.current : null });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [stop, total, plays, path, pitch]);

  const running = status === "running";
  const group = useStepPart({ kind: "mic", on: running, start, stop });
  const focusRef = useAudioFocus(running, stop, group);
  const playStop = () => (running ? stop() : void start());
  const { ref: spaceRef, armed: spaceArmed } = useSpaceKey(playStop, focusRef);

  const phase = now?.phase ?? null;
  const voiceNow = now?.voice ?? null;
  const near = voiceNow !== null && now ? nearPath(path, now.at, voiceNow, 1.5) : false;
  const word = status === "done" ? "All rounds done"
    : phase === "listen" ? "Listen"
    : phase === "gap" ? "Get ready"
    : phase === "you" ? (voiceNow === null ? "Your turn: lip roll" : near ? "Your turn: on the line" : "Your turn")
    : phase === "rest" ? "Breathe in"
    : "Ready when you are";
  const tone = status === "done" ? "text-emerald-300" : phase === "listen" ? "text-sky-300" : phase === "you" ? (near ? "text-emerald-300" : "text-violet-300") : "text-slate-200";
  const sub = status === "done" ? "Notice how your lips and face feel now."
    : now ? `Round ${now.round + 1} of ${plays}`
    : shape === "hold" ? `${noteLabel(path.low)} for ${seconds} seconds` : `${noteLabel(path.low)} to ${noteLabel(path.high)}`;
  const tip = TIPS[Math.floor((now?.t ?? 0) / TIP_SECONDS) % TIPS.length];
  const micNote = micStatusMessage(micStatus);
  const meta = `${shape === "hold" ? `${seconds} seconds` : SPAN_NAME[span] ?? `${span} semitones`} · ${plays} ${plays === 1 ? "round" : "rounds"} · ${range.label}`;

  return (
    <PlayerCard ref={spaceRef}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Warm-up · lip roll</p>
          <h3 className="truncate text-base font-semibold text-slate-100">{TITLES[shape]}</h3>
          <p className="text-xs tabular-nums text-slate-400">{meta}</p>
        </div>
        <span data-tour="lip-roll-mic" className="shrink-0">
          <InputChip status={micStatus} mic={{ on: micWanted && !micOff, onToggle: () => (running ? setMicOff((o) => !o) : void start()) }} align="right" />
        </span>
      </div>

      <div className="flex flex-col items-center gap-0.5 text-center" aria-live="polite">
        <p className={`min-h-8 text-2xl font-medium transition-colors duration-300 ${tone}`}>{word}</p>
        <p className="min-h-5 text-sm tabular-nums text-slate-400">{sub}</p>
        {micNote && <p className="text-xs text-amber-300">{micNote}</p>}
      </div>

      <div data-tour="lip-roll-view" className="relative">
        <StartCover show={status === "idle" && !now && trace.length === 0} title={TITLES[shape]} onStart={() => void start()} keyCap={spaceArmed ? "Space" : undefined} note="The mic starts with it. It listens only on your turn.">
          {WHAT[shape]}
        </StartCover>
        <Roll path={path} trace={trace} at={phase === "listen" || phase === "you" ? now!.at : null} phase={phase} voice={voiceNow} near={near} />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-800 pt-3">
        <PlayButton data-tour="lip-roll-play" playing={running} onClick={playStop} space={spaceArmed} />
        <p className="min-h-10 flex-1 text-sm leading-snug text-slate-300">
          {running ? <><span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tip</span>{tip}</> : status === "done" ? "Press Play to go again." : "Each round: listen, then your turn, then a breath."}
        </p>
      </div>
    </PlayerCard>
  );
}

const W = 400, H = 180, L = 40, RGT = 12, TOP = 16, BOT = 24;

/** Time across, pitch up: the tone's path as a wide band, the playhead, and the student's line over it. */
function Roll({ path, trace, at, phase, voice, near }: { path: GlidePath; trace: Point[]; at: number | null; phase: RoundPhase | null; voice: number | null; near: boolean }) {
  const lo = path.low - 3, hi = path.high + 3;
  const x = (t: number) => L + (t / path.duration) * (W - L - RGT);
  const y = (m: number) => TOP + ((hi - m) / (hi - lo)) * (H - TOP - BOT);
  const tone = path.points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.midi).toFixed(1)}`).join("");
  // the student's line in runs: a break (midi -1) or a jump of an octave lifts the pen
  const runs: { d: string; near: boolean }[] = [];
  let prev: Point | null = null;
  for (const p of trace) {
    if (p.midi < 0) { prev = null; continue; }
    const m = Math.min(hi + 1, Math.max(lo - 1, p.midi));
    const ok = nearPath(path, p.at, p.midi, 1.5);
    const seg = `${x(p.at).toFixed(1)},${y(m).toFixed(1)}`;
    if (!prev || runs[runs.length - 1].near !== ok) runs.push({ d: `M${prev ? `${x(prev.at).toFixed(1)},${y(Math.min(hi + 1, Math.max(lo - 1, prev.midi))).toFixed(1)}L` : ""}${seg}`, near: ok });
    else runs[runs.length - 1].d += `L${seg}`;
    prev = p;
  }
  const rows = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const named = new Set([path.low, path.high]);
  const headTone = phase === "you" ? "rgb(196 181 253)" : "rgb(125 211 252)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-slate-950/40" role="img" aria-label="The tone's path, and your line drawn over it on your turn">
      {rows.map((m) => (
        <g key={m}>
          <line x1={L} x2={W - RGT} y1={y(m)} y2={y(m)} stroke="rgb(148 163 184)" strokeOpacity={named.has(m) ? 0.22 : 0.07} />
          {named.has(m) && <text x={L - 6} y={y(m) + 4} textAnchor="end" className="fill-slate-400 text-[11px] font-medium">{noteLabel(m)}</text>}
        </g>
      ))}
      <path d={tone} fill="none" stroke="rgb(56 189 248)" strokeOpacity="0.18" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <path d={tone} fill="none" stroke="rgb(125 211 252)" strokeOpacity="0.7" strokeWidth="2" strokeDasharray={phase === "you" ? "5 5" : undefined} strokeLinecap="round" strokeLinejoin="round" />
      {runs.map((r, i) => <path key={i} d={r.d} fill="none" stroke={r.near ? "rgb(52 211 153)" : "rgb(251 191 36)"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
      {at !== null && (
        <g>
          <line x1={x(at)} x2={x(at)} y1={TOP - 6} y2={H - BOT + 6} stroke={headTone} strokeOpacity="0.5" strokeWidth="1.5" />
          <circle cx={x(at)} cy={y(midiAt(path, at))} r="6" fill={headTone} opacity={phase === "listen" ? 0.95 : 0.35} />
          {voice !== null && <circle cx={x(at)} cy={y(Math.min(hi + 1, Math.max(lo - 1, voice)))} r="7" fill={near ? "rgb(52 211 153)" : "rgb(251 191 36)"} stroke="white" strokeOpacity="0.7" strokeWidth="1.5" />}
        </g>
      )}
      <text x={L} y={H - 6} className="fill-slate-400 text-[11px]">{phase === "you" ? "your turn" : "the tone"}</text>
    </svg>
  );
}
