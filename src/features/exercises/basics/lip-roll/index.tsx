"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InputChip, { micStatusMessage } from "@/components/InputChip";
import { useStepPart } from "@/components/practice/exerciseStep";
import { StartCover } from "@/components/practice/StartCover";
import { useAudioFocus, wakeAudio } from "@/features/sound";
import { useCoverage } from "@/features/guide/useCoverage";
import { REGISTERS, voiceMap, type Registers } from "@/features/theory/registers";
import { VOICES, type Voice } from "@/features/theory/singing";
import { Chip, Hint } from "@/components/ui";
import { PlayerCard } from "../../play-along/PlayerParts";
import { useVoice } from "../voiceChoice";
import { noteLabel, useVoicePitch } from "../voicePitch";
import { PlayAhead, WarmUpBar, usePlayAhead, useWarmUpKeys, type WarmUpStatus } from "../warmUpBar";
import { DEFAULTS, EDGE, LIMITS, LIP_ROLL_PLAYS, LIP_ROLL_SPEEDS, clampInt, youStart, glidePath, midiAt, nearPath, roundAt, roundSeconds, type GlidePath, type LipRollShape, type LipRollPlay, type LipRollSpeed, type RoundPhase } from "./glide";
import { playCue, playGlide, type GlideSound } from "./sound";
import type { LipRollProps } from "./lip-roll.props";

const TITLES: Record<LipRollShape, string> = { down: "Lip roll slide down", up: "Lip roll slide up", siren: "Lip roll siren", hold: "Lip roll on one note" };
const TIPS = [
  "Let your lips buzz loosely, like a motorboat.",
  "Lips won't keep buzzing? Press your cheeks lightly with two fingers.",
  "Keep the air going evenly: the buzz is the breath you hear.",
  "Close is good enough. An easy, steady buzz matters more than the exact note.",
];
const TIP_SECONDS = 9;

type Point = { at: number; midi: number };

const SPEED_LABEL: Record<LipRollSpeed, string> = { slow: "Slow", medium: "Medium", fast: "Fast" };
const PLAY_LABEL: Record<LipRollPlay, { label: string; title: string }> = {
  always: { label: "With the tone", title: "The tone plays the whole time and you lip roll with it" },
  echo: { label: "Tone, then you", title: "A pass with the tone, then the same pass on your own" },
  silent: { label: "No tone", title: "Follow the line on your own, no tone" },
};
const WHAT_PLAY: Record<LipRollPlay, string> = {
  always: "Lip roll with the tone the whole way. Your line is drawn over the tone's.",
  echo: "Lip roll with the tone, then once more on your own: its first note sounds and fades as you start.",
  silent: "Lip roll along the line on your own, with no tone.",
};

/**
 * The lip roll (`lip-roll.props.ts`): each round the tone sounds along its path while a playhead runs over it (or not,
 * by the Tone choice), and the mic draws the student's line over it in every pass. A short rest, then the next round,
 * a little deeper into chest voice. The run lives in refs, apart from the props and choices: a new shape, speed, tone or
 * voice while it runs starts the round on screen again with them, and the run goes on (the round count stays).
 */
export function View({ shape = "down", speed: speedProp = "medium", play: playProp = "echo", seconds: secondsProp, plays: playsProp, voice: own = "tenor", controls = true }: LipRollProps & {
  /** draw the Tone and Speed choices on the tool (a plan); false: the page holds them beside its other choices and hands
   * them in as `speed` and `play`, and the tool follows those props */
  controls?: boolean;
}) {
  useCoverage({ hints: 3 });
  const voice = useVoice(own);
  const known: Voice = voice in VOICES ? voice : "tenor";
  const range = VOICES[known];
  const map = useMemo(() => voiceMap(known), [known]);
  const seconds = clampInt(secondsProp, LIMITS.seconds, DEFAULTS.seconds);
  const plays = clampInt(playsProp, LIMITS.plays, DEFAULTS.plays);
  const ownSpeed: LipRollSpeed = LIP_ROLL_SPEEDS.includes(speedProp) ? speedProp : "medium";
  const ownPlay: LipRollPlay = LIP_ROLL_PLAYS.includes(playProp) ? playProp : "echo";
  // picked on the tool when it draws its own choices, else the props
  const [speedPicked, setSpeed] = useState(ownSpeed);
  const [playPicked, setPlay] = useState(ownPlay);
  const speed = controls ? speedPicked : ownSpeed;
  const play = controls ? playPicked : ownPlay;
  // round 1's path, for the picture before Start
  const first = useMemo(() => glidePath(shape, map, seconds, speed, 0), [shape, map, seconds, speed]);
  const [path, setPath] = useState(first);

  const [status, setStatus] = useState<WarmUpStatus>("idle");
  const [now, setNow] = useState<{ round: number; phase: RoundPhase; at: number; voiceAt: number; t: number; voice: number | null } | null>(null);
  const [trace, setTrace] = useState<Point[]>([]);
  const sounds = useRef<GlideSound[]>([]);
  const hush = () => {
    sounds.current.forEach((x) => x.stop());
    sounds.current = [];
  };
  // the run: when it started, the round on screen (its number, path, mode and start; Skip moves `start` back), and the
  // student's line in the pass on screen. Kept apart from the props and choices, which it reads through `latest`.
  const run = useRef({ t0: 0, n: 0, path: first, play, start: 0, pass: null as RoundPhase | null, line: [] as Point[] });
  const latest = useRef({ shape, map, seconds, speed, play, plays });
  useEffect(() => {
    latest.current = { shape, map, seconds, speed, play, plays };
  });
  const [micOff, setMicOff] = useState(false);
  // the voice is drawn this far behind the playhead, to make up for the mic's delay
  const [lagMs, setLag] = usePlayAhead();
  const lag = useRef(lagMs / 1000);
  useEffect(() => {
    lag.current = lagMs / 1000;
  }, [lagMs]);
  const running = status === "running";
  // the mic listens through every pass, the ones with the tone too
  const { pitch, status: micStatus } = useVoicePitch(running && !micOff);

  const stop = useCallback(() => {
    sounds.current.forEach((x) => x.stop());
    sounds.current = [];
    setStatus((s) => (s === "running" ? "idle" : s));
    setNow(null);
  }, []);
  useEffect(() => () => sounds.current.forEach((x) => x.stop()), []);

  /** round `n` starts now with the latest settings: its own path (deeper each round), the tone by the Tone choice, the line cleared */
  const begin = useCallback((n: number) => {
    const l = latest.current;
    const p = glidePath(l.shape, l.map, l.seconds, l.speed, n);
    Object.assign(run.current, { n, path: p, play: l.play, start: performance.now(), pass: null, line: [] });
    setPath(p);
    setTrace([]);
    sounds.current.forEach((x) => x.stop());
    sounds.current = [];
    if (l.play !== "silent") sounds.current.push(playGlide(p));
    const you = youStart(p, l.play);
    if (you !== null) sounds.current.push(playCue(p.points[0].midi, you + 0.12, EDGE));
  }, []);

  // Start and Restart: the run starts over from round 1; a loop already going just reads the reset run
  const start = useCallback(async () => {
    await wakeAudio();
    setMicOff(false);
    run.current.t0 = performance.now();
    begin(0);
    setStatus("running");
  }, [begin]);

  // the frame loop runs while the status is running: it moves the playhead, draws the line and starts each round
  useEffect(() => {
    if (!running) return;
    let id = 0;
    const frame = () => {
      const nowMs = performance.now();
      const r = run.current;
      if ((nowMs - r.start) / 1000 >= roundSeconds(r.path, r.play)) {
        if (r.n + 1 >= latest.current.plays) {
          sounds.current = [];
          setStatus("done");
          setNow(null);
          return;
        }
        begin(r.n + 1);
      }
      const at = roundAt(r.path, (nowMs - r.start) / 1000, r.play) ?? { phase: "rest" as const, at: r.path.duration };
      const sung = at.phase === "listen" || at.phase === "along" || at.phase === "you";
      if (sung) {
        // each pass draws its own line
        if (r.pass !== at.phase) Object.assign(r, { pass: at.phase, line: [] });
        // the voice heard now was sung a moment ago: drawn `lag` behind the playhead
        const t = at.at - lag.current;
        const m = pitch.current;
        if (t < 0) { /* sung before the pass began */ }
        else if (m !== null) r.line = [...r.line, { at: t, midi: m }];
        else if (r.line.length && r.line[r.line.length - 1].midi !== -1) r.line = [...r.line, { at: t, midi: -1 }];
        setTrace(r.line);
      }
      setNow({ round: r.n, phase: at.phase, at: at.at, voiceAt: Math.max(0, at.at - lag.current), t: (nowMs - r.t0) / 1000, voice: sung ? pitch.current : null });
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [running, begin, pitch]);

  // new settings while it runs (shape, speed, tone, voice): the round on screen starts again with them
  const settings = `${shape}|${known}|${seconds}|${speed}|${play}`;
  const lastSettings = useRef(settings);
  useEffect(() => {
    if (settings === lastSettings.current) return;
    lastSettings.current = settings;
    if (running) begin(run.current.n);
  }, [settings, running, begin]);

  // Skip: the round on screen ends now, and the next one starts on the next frame
  const skip = () => {
    const r = run.current;
    r.start = performance.now() - roundSeconds(r.path, r.play) * 1000;
    hush();
  };

  const group = useStepPart({ kind: "mic", on: running, start, stop });
  const focusRef = useAudioFocus(running, stop, group);
  const actions = { status, onStart: () => void start(), onStop: stop, onRestart: () => void start(), onSkip: skip };
  const { ref: keysRef, armed } = useWarmUpKeys(actions);
  const cardRef = useCallback((el: HTMLDivElement | null) => {
    keysRef(el);
    focusRef(el);
  }, [keysRef, focusRef]);
  // before Start (and after), the picture shows round 1 of what is picked
  const shown = running ? path : first;

  const phase = now?.phase ?? null;
  const voiceNow = now?.voice ?? null;
  const near = voiceNow !== null && now ? nearPath(shown, now.voiceAt, voiceNow, 1.5) : false;
  const word = status === "done" ? "All rounds done"
    : phase === "listen" ? "Lip roll with the tone"
    : phase === "along" ? (near ? "With the tone: on the line" : "Lip roll with the tone")
    : phase === "gap" ? "Now on your own"
    : phase === "you" ? (voiceNow === null ? "Your turn: lip roll" : near ? "Your turn: on the line" : "Your turn")
    : phase === "rest" ? "Breathe in"
    : "Ready when you are";
  const tone = status === "done" ? "text-emerald-300" : near ? "text-emerald-300" : phase === "listen" || phase === "along" ? "text-sky-300" : phase === "you" ? "text-violet-300" : "text-slate-200";
  const sub = status === "done" ? "Notice how your lips and face feel now."
    : now ? `Round ${now.round + 1} of ${plays} · ${shape === "hold" ? noteLabel(shown.low) : `${noteLabel(shown.low)} to ${noteLabel(shown.high)}`}`
    : shape === "hold" ? `${noteLabel(shown.low)} for ${seconds} seconds, a little lower each round` : `${noteLabel(shown.low)} to ${noteLabel(shown.high)}, a little deeper each round`;
  const tip = TIPS[Math.floor((now?.t ?? 0) / TIP_SECONDS) % TIPS.length];
  const micNote = micStatusMessage(micStatus);
  const meta = `${shape === "hold" ? `chest voice · ${seconds} seconds` : shape === "siren" ? "chest to head voice and back" : shape === "up" ? "chest to head voice" : "head to chest voice"} · ${plays} ${plays === 1 ? "round" : "rounds"} · ${range.label}`;

  return (
    <PlayerCard ref={cardRef}>
      <div data-tour="lip-roll-start">
      <WarmUpBar {...actions} armed={armed} settings={<PlayAhead ms={lagMs} onChange={setLag} />} skip="the next round" what="Starts the rounds and the mic.">
        <span data-tour="lip-roll-mic" className="inline-flex">
          <Hint title="Audio input" description="The input the mic uses to draw your line. Start switches it on: the dot turns from amber to green. Press it to pick another input or see its level.">
            <InputChip quiet status={micStatus} mic={{ on: running && !micOff, onToggle: () => (running ? setMicOff((o) => !o) : void start()) }} />
          </Hint>
        </span>
      </WarmUpBar>
      </div>
      {controls && <div data-tour="lip-roll-options" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
        <Hint title="Tone" description="When the tone plays. A new choice starts the round again with it.">
          <span role="group" aria-label="Tone" className="inline-flex flex-wrap items-center gap-1.5">
            <span className="uppercase tracking-wider">Tone</span>
            {LIP_ROLL_PLAYS.map((m) => <Chip key={m} on={m === play} onClick={() => setPlay(m)} title={PLAY_LABEL[m].title}>{PLAY_LABEL[m].label}</Chip>)}
          </span>
        </Hint>
        {shape !== "hold" && (
          <Hint title="Speed" description="How fast the slide goes. A new speed starts the round again at that speed.">
            <span role="group" aria-label="Speed" className="inline-flex items-center gap-1.5">
              <span className="uppercase tracking-wider">Speed</span>
              {LIP_ROLL_SPEEDS.map((sp) => <Chip key={sp} on={sp === speed} onClick={() => setSpeed(sp)}>{SPEED_LABEL[sp]}</Chip>)}
            </span>
          </Hint>
        )}
      </div>}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Warm-up · lip roll</p>
        <h3 className="truncate text-base font-semibold text-slate-100">{TITLES[shape]}</h3>
        <p className="text-xs tabular-nums text-slate-400">{meta}</p>
      </div>

      <div className="flex flex-col items-center gap-0.5 text-center" aria-live="polite">
        <p className={`min-h-8 text-2xl font-medium transition-colors duration-300 ${tone}`}>{word}</p>
        <p className="min-h-5 text-sm tabular-nums text-slate-400">{sub}</p>
        {micNote && <p className="text-xs text-amber-300">{micNote}</p>}
      </div>

      <div data-tour="lip-roll-view" className="relative">
        <StartCover show={status === "idle" && !now && trace.length === 0} title={TITLES[shape]} onStart={() => void start()} keyCap={armed ? "Space" : undefined} note="The mic starts with it.">
          {WHAT_PLAY[play]}
        </StartCover>
        <Roll path={shown} registers={REGISTERS[known]} trace={trace} at={phase === "listen" || phase === "along" || phase === "you" ? now!.at : null} voiceAt={now?.voiceAt ?? 0} phase={phase} voice={voiceNow} near={near} />
      </div>

      <p className="min-h-10 border-t border-slate-800 pt-3 text-sm leading-snug text-slate-300">
        {running ? <><span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tip</span>{tip}</> : status === "done" ? "Press Restart above to go again." : WHAT_PLAY[play]}
      </p>
    </PlayerCard>
  );
}

const W = 400, H = 200, L = 40, RGT = 12, TOP = 16, BOT = 24;

/** Time across, pitch up: the voice's registers as bands with the breaks between, the tone's path as a wide band, the playhead, and the student's line over it. */
function Roll({ path, registers, trace, at, voiceAt, phase, voice, near }: { path: GlidePath; registers: Registers; trace: Point[]; at: number | null; /** where the voice dot is drawn: `lag` behind the playhead */ voiceAt: number; phase: RoundPhase | null; voice: number | null; near: boolean }) {
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
  // chest up to the first break, the middle voice between the breaks, head voice from the second; each clipped to the picture
  const edge = (m: number) => Math.min(hi, Math.max(lo, m - 0.5));
  const bands = [
    { name: "head voice", top: hi, bottom: edge(registers.secondo), fill: "fill-violet-400/[0.07]", text: "fill-violet-300/80" },
    { name: "middle", top: edge(registers.secondo), bottom: edge(registers.primo), fill: "fill-slate-400/[0.03]", text: "fill-slate-400/80" },
    { name: "chest voice", top: edge(registers.primo), bottom: lo, fill: "fill-amber-400/[0.06]", text: "fill-amber-200/80" },
  ].filter((b) => y(b.bottom) - y(b.top) >= 16);
  const headTone = phase === "you" ? "rgb(196 181 253)" : "rgb(125 211 252)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-slate-950/40" role="img" aria-label="The tone's path, and your line drawn over it on your turn">
      {bands.map((b) => (
        <g key={b.name}>
          <rect x={L} width={W - L - RGT} y={y(b.top)} height={Math.max(0, y(b.bottom) - y(b.top))} className={b.fill} />
          <text x={W - RGT - 6} y={y(b.top) + 13} textAnchor="end" className={`text-[11px] font-medium ${b.text}`}>{b.name}</text>
        </g>
      ))}
      {[registers.primo, registers.secondo].filter((m) => m - 0.5 > lo && m - 0.5 < hi).map((m) => (
        <line key={m} x1={L} x2={W - RGT} y1={y(m - 0.5)} y2={y(m - 0.5)} stroke="rgb(203 213 225)" strokeOpacity="0.35" strokeDasharray="2 4" />
      ))}
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
          {voice !== null && <circle cx={x(voiceAt)} cy={y(Math.min(hi + 1, Math.max(lo - 1, voice)))} r="7" fill={near ? "rgb(52 211 153)" : "rgb(251 191 36)"} stroke="white" strokeOpacity="0.7" strokeWidth="1.5" />}
        </g>
      )}
      <text x={L} y={H - 6} className="fill-slate-400 text-[11px]">{phase === "you" ? "your turn" : phase === "listen" || phase === "along" ? "with the tone" : ""}</text>
    </svg>
  );
}
