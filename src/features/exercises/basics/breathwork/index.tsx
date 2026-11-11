"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import { Checkbox } from "@/components/ui";
import { useStepPart } from "@/components/practice/exerciseStep";
import { useAudioFocus, wakeAudio } from "@/features/sound";
import { PlayButton, PlayerCard } from "../../play-along/PlayerParts";
import { TITLES, breathPlan, farinelliCounts, fullness, phaseAt, totalSeconds, type BreathDrill, type BreathKind } from "./breaths";
import { scheduleBreaths, type BreathSound } from "./sound";
import type { BreathworkProps } from "./breathwork.props";

/** Each phase's colour: sky to breathe in, amber to hold, emerald to breathe out, teal for air (sss), violet for voice (zzz). */
const TONE: Record<BreathKind, { text: string; bar: string; soft: string }> = {
  ready: { text: "text-slate-300", bar: "bg-slate-400", soft: "bg-slate-500/25" },
  in: { text: "text-sky-300", bar: "bg-sky-400", soft: "bg-sky-400/20" },
  hold: { text: "text-amber-300", bar: "bg-amber-400", soft: "bg-amber-400/20" },
  out: { text: "text-emerald-300", bar: "bg-emerald-400", soft: "bg-emerald-400/20" },
  rest: { text: "text-slate-400", bar: "bg-slate-500", soft: "bg-slate-500/20" },
  sss: { text: "text-teal-300", bar: "bg-teal-400", soft: "bg-teal-400/20" },
  zzz: { text: "text-violet-300", bar: "bg-violet-400", soft: "bg-violet-400/20" },
  body: { text: "text-sky-300", bar: "bg-sky-400", soft: "bg-sky-400/20" },
};

const WHAT: Record<BreathDrill, string> = {
  farinelli: "Breathe in, hold and breathe out for the same count. Each cycle adds one count.",
  "sss-zzz": "Hiss on sss, add your voice for zzz, then hiss again. Breathe in between rounds.",
  "zzz-sss": "Start with your voice on zzz, drop it for sss, then bring it back.",
  cycles: "Breathe in, hold, breathe out, then rest. Follow the circle.",
  "long-exhale": "Breathe in for 4, then let the air out slowly, as even at the end as at the start.",
  "body-scan": "Breathe into each part the circle names, and notice how it moves.",
};

const CALM = ["Breathe low: your belly moves, your shoulders stay still.", "Let the air out evenly, as slow at the end as at the start.", "Feel dizzy? Stop and breathe normally."];
const TIPS: Record<BreathDrill, string[]> = {
  farinelli: [
    "Stay relaxed. That matters more than a high count.",
    "Fill to about 80%, not to the top.",
    "As the count grows, breathe in more slowly.",
    "While you hold, keep your ribs wide. A small sip of air is fine.",
    "Let all the air out each time.",
    "Feel dizzy? Stop and breathe normally.",
  ],
  "sss-zzz": ["Keep each sound steady from start to end.", "Feel the buzz start on zzz and stop on sss.", "Keep your mouth and jaw still as you switch.", "Let your belly move in slowly, not your shoulders."],
  "zzz-sss": ["Keep each sound steady from start to end.", "Feel the buzz stop on sss and come back on zzz.", "Keep your mouth and jaw still as you switch.", "Let your belly move in slowly, not your shoulders."],
  cycles: CALM,
  "long-exhale": CALM,
  "body-scan": ["Notice where the breath moves easily and where it feels stuck.", ...CALM],
};
const TIP_SECONDS = 12;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * A breathing exercise (`breathwork.props.ts`): a circle that fills and empties with the breath, the count in the
 * middle, the phase above and a strip of every phase below. Ticks and chimes on the audio clock, no spoken voice.
 */
export function View({ drill = "farinelli", from, to, seconds, rounds }: BreathworkProps) {
  const plan = useMemo(() => breathPlan(drill, { from, to, seconds, rounds }), [drill, from, to, seconds, rounds]);
  const total = totalSeconds(plan);
  const lastRound = plan[plan.length - 1].round;
  const counts = drill === "farinelli" ? farinelliCounts({ from, to }) : null;

  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [t, setT] = useState(0);
  const [muted, setMuted] = useState(false);
  const sound = useRef<BreathSound | null>(null);
  const raf = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    sound.current?.stop();
    sound.current = null;
    setStatus((s) => (s === "running" ? "idle" : s));
    setT(0);
  }, []);

  const start = useCallback(async () => {
    stop();
    await wakeAudio();
    const s = scheduleBreaths(plan, muted);
    sound.current = s;
    setStatus("running");
    const frame = () => {
      const now = s.ctx.currentTime - s.t0;
      if (now >= total) {
        s.stop();
        sound.current = null;
        setT(total);
        setStatus("done");
        return;
      }
      setT(Math.max(0, now));
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  }, [plan, total, muted, stop]);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    sound.current?.stop();
  }, []);

  const running = status === "running";
  const group = useStepPart({ kind: "play", on: running, start, stop });
  const focusRef = useAudioFocus(running, stop, group);
  const safety = useSafety();

  const toggleMute = () => {
    setMuted((m) => {
      sound.current?.setMuted(!m);
      return !m;
    });
  };

  const at = running ? phaseAt(plan, t) : null;
  const phase = at ? plan[at.index] : null;
  const tone = TONE[phase?.kind ?? (status === "done" ? "out" : "in")];
  const full = at ? fullness(plan, at.index, at.progress) : status === "done" ? 0.55 : 0.45;
  const left = phase && at ? Math.max(1, Math.ceil(phase.seconds * (1 - at.progress) - 1e-6)) : null;
  const tips = TIPS[drill];
  const tip = tips[Math.floor(t / TIP_SECONDS) % tips.length];

  const meta = counts ? `${counts[0]} to ${counts[counts.length - 1]} counts` : `${lastRound} ${lastRound === 1 ? "round" : "rounds"}`;
  const sub = !phase
    ? null
    : phase.kind === "ready"
      ? "Get ready"
      : counts
        ? `Cycle ${phase.round} of ${counts.length} · ${counts[phase.round - 1]} counts`
        : `Round ${phase.round} of ${lastRound}`;

  return (
    <PlayerCard ref={focusRef}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Breathwork</p>
          <h3 className="truncate text-base font-semibold text-slate-100">{TITLES[drill]}</h3>
          <p className="text-xs text-slate-400 tabular-nums">{meta} · {clock(total)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {drill === "farinelli" && <SafetyChip open={safety.open} onClick={safety.toggle} />}
          <button type="button" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Sound on" : "Sound off"} title={muted ? "Sound on" : "Sound off"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-slate-200">
            <Icon name={muted ? "bell-off" : "bell"} size={16} />
          </button>
        </div>
      </div>

      {drill === "farinelli" && safety.open && <SafetyPanel onOk={safety.ok} />}

      <div className="flex flex-col items-center gap-1 pt-1 text-center" aria-live="polite">
        <p className={`min-h-8 text-2xl font-medium transition-colors duration-500 ${phase ? tone.text : "text-slate-200"}`}>
          {phase ? phase.label : status === "done" ? "Well done" : "Ready when you are"}
        </p>
        <p className="min-h-5 text-sm text-slate-400">{sub ?? (status === "done" ? "Notice how your breath feels now." : "Sit or stand tall, shoulders loose.")}</p>
      </div>

      <Orb full={full} progress={at?.progress ?? (status === "done" ? 1 : 0)} kind={phase?.kind ?? null} toneText={tone.text}
        label={left !== null ? String(left) : null} done={status === "done"} onStart={() => void start()} />

      <Strip plan={plan} t={running || status === "done" ? t : -1} />
      <div className="-mt-1 flex justify-between text-[11px] tabular-nums text-slate-500">
        <span>{clock(running || status === "done" ? t : 0)}</span>
        <span>{clock(total)}</span>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-800 pt-3">
        <PlayButton data-tour="breath-play" playing={running} onClick={() => (running ? stop() : void start())} />
        <p className="min-h-10 flex-1 text-sm leading-snug text-slate-300">
          {running ? <><span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tip</span>{tip}</> : WHAT[drill]}
        </p>
      </div>
    </PlayerCard>
  );
}

const SAFETY = [
  "Feel lightheaded, dizzy or short of breath? Stop and breathe normally.",
  "Have a heart, lung or blood pressure condition, or are pregnant? Ask your doctor first.",
  "Make sure someone else is nearby while you practise.",
];
const SAFETY_KEY = "musickit.breathwork.safetyOk";
const safetyRead = () => {
  try {
    return localStorage.getItem(SAFETY_KEY) === "1";
  } catch {
    return false;
  }
};
const safetySubscribe = (fn: () => void) => {
  queueMicrotask(fn); // pick up the stored value after hydration
  return () => {};
};

/** Farinelli's safety note: open on each visit until the learner ticks "Don't show again" and presses OK (kept in this browser), and a yellow chip that reopens it. */
function useSafety() {
  const seen = useSyncExternalStore(safetySubscribe, safetyRead, () => false);
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? !seen;
  const ok = (remember: boolean) => {
    setToggled(false);
    if (!remember) return;
    try {
      localStorage.setItem(SAFETY_KEY, "1");
    } catch { /* storage unavailable */ }
  };
  return { open, toggle: () => setToggled(!open), ok };
}

/** The always-visible yellow chip in the header; it opens and folds the note. */
function SafetyChip({ open, onClick }: { open: boolean; onClick(): void }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} title="Safety"
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-amber-400/70 bg-amber-400/15 px-3 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/25">
      <Icon name="alert-triangle" size={14} />
      Safety
    </button>
  );
}

/** The note itself, laid over the card below the header so the circle keeps its size and place. */
function SafetyPanel({ onOk }: { onOk(remember: boolean): void }) {
  const [remember, setRemember] = useState(false);
  return (
    <div role="note" className="absolute inset-x-3 top-16 z-10 rounded-xl border border-amber-400/70 bg-amber-950/95 p-3 text-amber-100 shadow-xl shadow-black/40 backdrop-blur sm:inset-x-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-200"><Icon name="alert-triangle" size={16} />Safety first</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-snug">
        {SAFETY.map((s) => <li key={s}>{s}</li>)}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => onOk(remember)}
          className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-300">OK</button>
        <Checkbox checked={remember} onChange={setRemember}>Don&apos;t show again</Checkbox>
      </div>
    </div>
  );
}

/** The breathing circle: its size is how full the lungs are, its ring how far through the phase. */
function Orb({ full, progress, kind, toneText, label, done, onStart }: { full: number; progress: number; kind: BreathKind | null; toneText: string; label: string | null; done: boolean; onStart(): void }) {
  const id = useId().replace(/:/g, "");
  const R = 88;
  const C = 2 * Math.PI * R;
  const r = 26 + 56 * full;
  const idle = kind === null;
  return (
    <div data-tour="breath-circle" className="relative mx-auto aspect-square w-full max-w-[15rem]">
      <svg viewBox="0 0 200 200" className={`h-full w-full ${toneText} transition-colors duration-700`} aria-hidden>
        <defs>
          <radialGradient id={`${id}-fill`} cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="70%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
          </radialGradient>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="5" />
        <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
          transform="rotate(-90 100 100)" opacity={idle && !done ? 0 : 0.9} />
        <circle cx="100" cy="100" r={r} fill="currentColor" opacity="0.35" filter={`url(#${id}-glow)`} />
        <circle cx="100" cy="100" r={r} fill={`url(#${id}-fill)`} stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.2"
          className={idle && !done ? "origin-center animate-[breath-idle_5s_ease-in-out_infinite]" : ""} />
        {kind === "zzz" && <circle cx="100" cy="100" r={r + 7} fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="3 4" className="origin-center animate-[breath-buzz_0.12s_linear_infinite]" />}
        {kind === "sss" && <circle cx="100" cy="100" r={r + 4} fill="none" stroke="currentColor" strokeWidth="1" className="origin-center animate-[breath-air_1.6s_ease-out_infinite]" />}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {label !== null ? (
          <span className="text-5xl font-light tabular-nums text-white drop-shadow">{label}</span>
        ) : done ? (
          <button type="button" onClick={onStart} className="flex flex-col items-center gap-1 text-emerald-200 transition hover:text-white">
            <Icon name="check" size={34} />
            <span className="flex items-center gap-1 text-xs text-slate-300"><Icon name="rotate-ccw" size={12} />Again</span>
          </button>
        ) : (
          <button type="button" onClick={onStart} className="rounded-full px-5 py-3 text-lg font-semibold text-white transition hover:scale-105">Start</button>
        )}
      </div>
      <style>{`
        @keyframes breath-idle { 0%, 100% { transform: scale(0.94) } 50% { transform: scale(1.04) } }
        @keyframes breath-buzz { 0% { transform: rotate(0deg) scale(1) } 50% { transform: rotate(2deg) scale(1.012) } 100% { transform: rotate(4deg) scale(1) } }
        @keyframes breath-air { 0% { transform: scale(1); opacity: 0.6 } 100% { transform: scale(1.18); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { [class*="animate-[breath-"] { animation: none !important } }
      `}</style>
    </div>
  );
}

/** Every phase as a bar sized by its length: the ones gone dim, the one playing filling up, the ones to come faint. */
function Strip({ plan, t }: { plan: ReturnType<typeof breathPlan>; t: number }) {
  return (
    <div data-tour="breath-strip" className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
      {plan.map((b, i) => {
        const p = t < 0 ? 0 : Math.min(1, Math.max(0, (t - b.at) / b.seconds));
        const tone = TONE[b.kind];
        return (
          <span key={i} className={`relative h-full min-w-[2px] overflow-hidden first:rounded-l-full last:rounded-r-full ${tone.soft}`} style={{ flexGrow: b.seconds, flexBasis: 0 }}>
            <span className={`absolute inset-y-0 left-0 ${tone.bar} ${p > 0 && p < 1 ? "opacity-100" : "opacity-60"}`} style={{ width: `${p * 100}%` }} />
          </span>
        );
      })}
    </div>
  );
}
