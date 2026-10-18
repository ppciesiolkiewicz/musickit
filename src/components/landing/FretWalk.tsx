"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Icon from "@/components/Icon";
import { DISPLAY } from "./Display";
import usePhone from "@/components/usePhone";
import TuneButton from "@/components/chordKit/TuneButton";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { FAMILIES, modeSteps, spell } from "@/features/theory/theory";
import { DOT_INK, degreeColour } from "@/features/theory/scales";
import { generateMelody, melodyTiming, scalePool } from "@/lib/chordKit/melody";

/** Six moods from brightest to darkest; each step down lowers one note by a fret. */
const MOODS = [
  { mode: 3, name: "Dreamy", feel: "floating, like a film score", dot: "bg-sky-400" },
  { mode: 0, name: "Bright", feel: "happy and settled", dot: "bg-amber-400" },
  { mode: 4, name: "Bluesy", feel: "bright, with a swagger", dot: "bg-emerald-400" },
  { mode: 1, name: "Soulful", feel: "minor, but warm", dot: "bg-teal-400" },
  { mode: 5, name: "Sad", feel: "heartfelt and serious", dot: "bg-violet-400" },
  { mode: 2, name: "Dark", feel: "tense, with Spanish fire", dot: "bg-rose-400" },
];
const ORDINAL = ["home", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/** Key of A: the open A string walks the whole scale from fret 0 to the octave at 12. */
const TONIC = { pc: 9, letter: 5 };
const OPEN = [64, 59, 55, 50, 45, 40];
const WALK_ROW = 4;
/** played an octave up from the A string, where the piano sounds best */
const LIFT = 12;
const FRETS = 12;

const ease = (t: number) => 1 - (1 - t) ** 3;
const stepsOf = (mood: number) => modeSteps(FAMILIES[0], MOODS[mood].mode);

/**
 * The home page's moving picture of sound. The A string walks the scale step by step, big hops and small, while it plays; every
 * other place the sounding note lives on the neck pulses with it. Change the mood and the notes that change slide a fret.
 * Until someone touches it, a silent walk runs now and then so the page is never still.
 */
export default function FretWalk() {
  const [mood, setMood] = useState(1);
  const steps = stepsOf(mood);
  const names = spell(TONIC.letter, TONIC.pc, steps);
  const player = useNotePlayer();
  const phone = usePhone();

  // the scale's steps glide when the mood changes, so a changed note visibly slides along the string
  const [shown, setShown] = useState<number[]>(steps);
  const from = useRef<number[]>(steps);
  useEffect(() => {
    const start = from.current;
    const target = stepsOf(mood);
    if (start.every((s, i) => s === target[i])) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 600);
      setShown(start.map((s, i) => s + (target[i] - s) * ease(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = target;
    };
  }, [mood]);

  // a silent walk every few seconds until the first touch
  const [touched, setTouched] = useState(false);
  const [ghost, setGhost] = useState<number | null>(null);
  useEffect(() => {
    if (touched || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = -6;
    const id = setInterval(() => {
      i = i >= 7 + 10 ? 0 : i + 1;
      setGhost(i >= 0 && i <= 7 ? i : null);
    }, 300);
    return () => {
      clearInterval(id);
      setGhost(null);
    };
  }, [touched]);

  const [moved, setMoved] = useState<{ degree: number; down: boolean }[]>([]);
  const walk = (st: number[]) => player.play([...st.map((s, d) => ({ key: `w${d}`, midi: 45 + LIFT + s })), { key: "w7", midi: 45 + LIFT + 12 }], 300);
  const pick = (i: number) => {
    setTouched(true);
    if (i === mood) return walk(steps);
    const before = steps;
    const after = stepsOf(i);
    setMoved(after.flatMap((s, d) => (s === before[d] ? [] : [{ degree: d, down: s < before[d] }])));
    setMood(i);
    walk(after);
  };
  const playTune = (tuneId: string) => {
    setTouched(true);
    player.playTimed(melodyTiming(generateMelody(scalePool(45 + LIFT, steps), steps)).map((n) => ({ key: `d${n.note.degree}`, midi: n.note.midi, ms: n.ms, velocity: n.velocity })), tuneId);
  };

  // what is sounding: a walk step (moves the glow along the string) or a degree (a tune, a tap)
  const a = player.active;
  const walkAt = a?.startsWith("w") ? Number(a.slice(1)) : touched ? null : ghost;
  const soundingDeg = a?.startsWith("w") ? Number(a.slice(1)) % 7 : a?.startsWith("d") ? Number(a.slice(1)) : null;
  const glowDeg = soundingDeg ?? (walkAt !== null ? walkAt % 7 : null);
  const silent = !a;

  // geometry
  const fw = phone ? 40 : 58;
  const gap = phone ? 30 : 32;
  const NUT = 34;
  const TOP = 46;
  const width = NUT + FRETS * fw + 14;
  const height = TOP + 5 * gap + 34;
  const fx = (f: number) => (f <= 0 ? NUT / 2 + f * fw : NUT + (f - 0.5) * fw);
  const sy = (row: number) => TOP + row * gap;
  const r = phone ? 13 : 13.5;

  // every place each degree sits on the neck, at its gliding position
  const dots = OPEN.flatMap((open, row) =>
    shown.flatMap((s, d) => {
      const target = (((TONIC.pc + steps[d] - open) % 12) + 12) % 12;
      const delta = shown[d] - steps[d];
      return [target, target + 12].map((t, k) => ({ row, d, k, f: t + delta })).filter((p) => p.f > -0.6 && p.f < FRETS + 0.6);
    }),
  );
  // the walk along the A string: root, the seven steps, the octave
  const walkFrets = [...shown, 12];
  const arcs = walkFrets.slice(1).map((f, i) => ({ i, a: walkFrets[i], b: f }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p key={mood} className="landing-fade text-3xl text-slate-50 sm:text-4xl" style={{ ...DISPLAY, fontStyle: "var(--style-italic, italic)" as CSSProperties["fontStyle"], fontVariationSettings: 'var(--style-display-variation, "SOFT" 100)' }}>
          {MOODS[mood].name}
        </p>
        <p className="text-sm text-slate-400">{MOODS[mood].feel}</p>
      </div>

      <div className="relative">
        <div aria-hidden className="wheel-halo pointer-events-none absolute -inset-6 rounded-[40%] opacity-25 blur-3xl" style={{ background: `conic-gradient(${[0, 2, 4, 6, 1, 3, 5, 0].map(degreeColour).join(",")})` }} />
        <svg viewBox={`0 0 ${width} ${height}`} className="relative w-full select-none overflow-visible" role="img" aria-label={`The ${MOODS[mood].name.toLowerCase()} sound in A on the guitar neck: ${names.join(", ")}. The A string walks the scale step by step. Tap a note to hear it.`}>
          <defs>
            <linearGradient id="walk-board" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--color-slate-800)" />
              <stop offset="1" stopColor="var(--color-slate-900)" />
            </linearGradient>
            <radialGradient id="walk-glow">
              <stop offset="0" stopColor="white" stopOpacity={0.9} />
              <stop offset="0.35" stopColor="var(--color-sky-300)" stopOpacity={0.55} />
              <stop offset="1" stopColor="var(--color-sky-400)" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect x={NUT} y={TOP - 14} width={FRETS * fw} height={5 * gap + 28} rx={8} fill="url(#walk-board)" />
          {[3, 5, 7, 9].map((f) => <circle key={f} cx={fx(f)} cy={sy(2.5)} r={5} fill="var(--color-slate-700)" />)}
          {[1.5, 3.5].map((k) => <circle key={k} cx={fx(12)} cy={sy(k)} r={5} fill="var(--color-slate-700)" />)}
          {Array.from({ length: FRETS }, (_, i) => <line key={i} x1={NUT + (i + 1) * fw} x2={NUT + (i + 1) * fw} y1={TOP - 14} y2={sy(5) + 14} stroke="var(--color-slate-600)" strokeWidth={2} />)}
          <rect x={NUT - 3} y={TOP - 14} width={6} height={5 * gap + 28} rx={2} fill="var(--color-slate-300)" />
          {OPEN.map((_, row) => (
            <line key={row} x1={4} x2={NUT + FRETS * fw} y1={sy(row)} y2={sy(row)} stroke={row === WALK_ROW ? "var(--color-sky-300)" : "var(--color-slate-400)"} strokeOpacity={row === WALK_ROW ? 0.9 : 0.6} strokeWidth={0.9 + row * 0.38} />
          ))}

          {/* the hops of the walk: a high arc for a whole step (two frets), a low one for a half step (one fret) */}
          {arcs.map(({ i, a: fa, b: fb }) => {
            const x1 = fx(fa), x2 = fx(fb);
            const h = (fb - fa) * 14;
            const done = walkAt !== null && walkAt > i;
            const mid = (x1 + x2) / 2;
            return (
              <path
                key={i}
                d={`M${x1},${sy(WALK_ROW) - r - 2} Q${mid},${sy(WALK_ROW) - r - 2 - h * 2} ${x2},${sy(WALK_ROW) - r - 2}`}
                fill="none"
                stroke={done ? degreeColour((i + 1) % 7) : "var(--color-slate-600)"}
                strokeWidth={done ? 3 : 1.5}
                strokeDasharray={done ? undefined : "3 4"}
                strokeLinecap="round"
                opacity={done ? (silent ? 0.55 : 1) : 0.7}
                className="transition-[stroke,opacity] duration-200"
                transform={`translate(0 ${-(sy(WALK_ROW) - TOP) - 6})`}
              />
            );
          })}

          {dots.map((p) => {
            const on = glowDeg === p.d;
            const loud = on && !silent;
            const isWalk = p.row === WALK_ROW;
            const dim = !isWalk && glowDeg !== null && !on && !silent;
            return (
              <g
                key={`${p.row}-${p.d}-${p.k}`}
                className="cursor-sound"
                opacity={dim ? 0.35 : 1}
                onClick={() => {
                  setTouched(true);
                  player.tap(`d${p.d}`, OPEN[p.row] + Math.round(p.f) + LIFT);
                }}
              >
                <title>{`${names[p.d]}: tap to hear it`}</title>
                {loud && <circle key={a} cx={fx(p.f)} cy={sy(p.row)} r={r} fill="none" stroke={degreeColour(p.d)} strokeWidth={3} className="wheel-ripple" />}
                {/* a rect drawn round, so a style can square it into a diamond (landing-styles.css .fret-dot) */}
                <rect className="fret-dot" x={fx(p.f) - (loud ? r + 2 : r)} y={sy(p.row) - (loud ? r + 2 : r)} width={2 * (loud ? r + 2 : r)} height={2 * (loud ? r + 2 : r)} rx={loud ? r + 2 : r} fill={degreeColour(p.d)} stroke={p.d === 0 ? "var(--color-slate-50)" : "var(--color-slate-950)"} strokeWidth={p.d === 0 ? 2.6 : 1.4} />
                <text x={fx(p.f)} y={sy(p.row) + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={names[p.d].length > 1 ? 10 : 12} fontWeight={700} fill={DOT_INK} pointerEvents="none">
                  {names[p.d]}
                </text>
              </g>
            );
          })}

          {/* the glow that walks the string */}
          {walkAt !== null && (
            <g style={{ transform: `translate(${fx(walkFrets[walkAt])}px, ${sy(WALK_ROW)}px)`, transition: "transform 260ms cubic-bezier(0.3, 0.8, 0.3, 1)" }} opacity={silent ? 0.6 : 1} pointerEvents="none">
              <circle r={r * 2.6} fill="url(#walk-glow)" />
            </g>
          )}

          {Array.from({ length: FRETS + 1 }, (_, f) => (
            <text key={f} x={fx(f)} y={height - 6} textAnchor="middle" fontSize={11} fill={f === 0 || f === 12 ? "var(--color-slate-300)" : "var(--color-slate-500)"}>{f}</text>
          ))}
        </svg>
      </div>

      <p className="min-h-6 text-sm text-slate-300" aria-live="polite">
        {moved.length === 0 ? (
          <>Pick a feeling and listen. Tap any note to hear it.</>
        ) : (
          <>
            The{" "}
            {moved.map((m, i) => (
              <span key={m.degree}>
                {i > 0 && (i === moved.length - 1 ? " and " : ", ")}
                <b style={{ color: degreeColour(m.degree) }}>{ORDINAL[m.degree]}</b>
              </span>
            ))}{" "}
            {moved.length > 1 ? "notes" : "note"} moved {moved[0].down ? "down" : "up"} a fret. That&apos;s the difference you hear.
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Feeling" className="flex flex-wrap gap-1.5">
          {MOODS.map((m, i) => (
            <button
              key={m.name}
              type="button"
              role="radio"
              aria-checked={i === mood}
              onClick={() => pick(i)}
              className={`cursor-sound inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${i === mood ? "border-slate-300 bg-slate-100 font-semibold text-slate-950" : "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100"}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} />
              {m.name}
            </button>
          ))}
        </div>
        <span className="mx-1 hidden h-6 w-px bg-slate-700 md:block" />
        <button type="button" onClick={() => { setTouched(true); walk(steps); }} className="cursor-sound inline-flex items-center gap-2 rounded-full border border-emerald-500 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-50 hover:bg-emerald-500/25">
          <Icon name="play" size={13} fill /> Walk it
        </button>
        <TuneButton onPlay={playTune} title="A short tune with this feeling, new every time" className="rounded-full border border-emerald-500 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-50 hover:bg-emerald-500/25" />
      </div>
    </div>
  );
}
