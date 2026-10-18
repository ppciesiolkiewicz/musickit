"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import TuneButton from "@/components/chordKit/TuneButton";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { FAMILIES, modeSteps, spell } from "@/features/theory/theory";
import { DOT_INK, degreeColour } from "@/features/theory/scales";
import { generateMelody, melodyTiming, scalePool } from "@/lib/chordKit/melody";

/** Six moods from brightest to darkest. Each step lowers exactly one note, which is the whole point of the picture. */
const MOODS = [
  { mode: 3, name: "Dreamy", feel: "floating, like a film score", dot: "bg-sky-400" },
  { mode: 0, name: "Bright", feel: "happy and settled", dot: "bg-amber-400" },
  { mode: 4, name: "Bluesy", feel: "bright, with a swagger", dot: "bg-emerald-400" },
  { mode: 1, name: "Soulful", feel: "minor, but warm", dot: "bg-teal-400" },
  { mode: 5, name: "Sad", feel: "heartfelt and serious", dot: "bg-violet-400" },
  { mode: 2, name: "Dark", feel: "tense, with Spanish fire", dot: "bg-rose-400" },
];
const NOTE_WORD = ["home", "2nd", "3rd", "4th", "5th", "6th", "7th"];
const CHROMATIC = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const ROOT = 60;

const SIZE = 400;
const C = SIZE / 2;
const R = 132;
/** where a note sits on the clock: C at the top, a half step every 30° */
const at = (semis: number, r = R) => {
  const a = ((semis * 30 - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
};
const ease = (t: number) => 1 - (1 - t) ** 3;

/**
 * The home page's picture of sound: the twelve notes as a clock, a scale as a coloured shape on it. Pick a mood and the shape
 * shifts, one dot sliding a notch, and you hear the difference. Tap a dot to hear that note.
 */
export default function SoundWheel() {
  const [mood, setMood] = useState(1);
  const steps = modeSteps(FAMILIES[0], MOODS[mood].mode);
  const names = spell(0, 0, steps);
  const player = useNotePlayer();

  // the shape glides from the last mood's notes to this one's
  const [shown, setShown] = useState<number[]>(steps);
  const from = useRef<number[]>(steps);
  const [moved, setMoved] = useState<{ degree: number; down: boolean }[]>([]);
  useEffect(() => {
    const start = from.current;
    const target = modeSteps(FAMILIES[0], MOODS[mood].mode);
    if (start.every((s, i) => s === target[i])) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 650);
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

  const pick = (i: number) => {
    if (i === mood) return;
    const before = modeSteps(FAMILIES[0], MOODS[mood].mode);
    const after = modeSteps(FAMILIES[0], MOODS[i].mode);
    setMoved(after.flatMap((s, d) => (s === before[d] ? [] : [{ degree: d, down: s < before[d] }])));
    setMood(i);
    playScale(after);
  };
  const playScale = (st = steps) => player.play([...st.map((s, d) => ({ key: `d${d}`, midi: ROOT + s })), { key: "d0", midi: ROOT + 12 }], 210);
  const playTune = (tuneId: string) =>
    player.playTimed(melodyTiming(generateMelody(scalePool(ROOT, steps), steps)).map((n) => ({ key: `d${n.note.degree}`, midi: n.note.midi, ms: n.ms, velocity: n.velocity })), tuneId);

  const points = shown.map((s) => at(s));
  const activeDeg = player.active?.startsWith("d") ? Number(player.active.slice(1)) : null;
  const movedSet = new Set(moved.map((m) => m.degree));

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-full max-w-104">
        {/* a slow halo in the mood's colours */}
        <div aria-hidden className="wheel-halo pointer-events-none absolute inset-[8%] rounded-full opacity-40 blur-3xl" style={{ background: `conic-gradient(${[0, 2, 4, 6, 1, 3, 5, 0].map(degreeColour).join(",")})` }} />
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative w-full select-none" role="img" aria-label={`The ${MOODS[mood].name.toLowerCase()} scale as a shape on the circle of twelve notes: ${names.join(", ")}. Tap a note to hear it.`}>
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-slate-700)" strokeOpacity={0.6} strokeDasharray="2 6" />
          {CHROMATIC.map((n, k) => {
            const p = at(k, R + 40);
            const inScale = steps.includes(k);
            return (
              <text key={n} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={13} fill={inScale ? "var(--color-slate-300)" : "var(--color-slate-600)"} className="transition-colors duration-500">
                {n}
              </text>
            );
          })}
          {Array.from({ length: 12 }, (_, k) => {
            const p = at(k);
            return <circle key={k} cx={p.x} cy={p.y} r={3} fill="var(--color-slate-700)" />;
          })}
          <defs>
            <linearGradient id="wheel-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--color-sky-400)" stopOpacity={0.28} />
              <stop offset="1" stopColor="var(--color-violet-500)" stopOpacity={0.16} />
            </linearGradient>
          </defs>
          <polygon points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="url(#wheel-fill)" stroke="var(--color-sky-300)" strokeOpacity={0.55} strokeWidth={1.5} strokeLinejoin="round" />
          {activeDeg !== null && (
            <line x1={C} y1={C} x2={points[activeDeg].x} y2={points[activeDeg].y} stroke={degreeColour(activeDeg)} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
          )}
          {points.map((p, d) => {
            const on = activeDeg === d;
            return (
              <g key={d} className="cursor-sound" onClick={() => player.tap(`d${d}`, ROOT + steps[d])}>
                <title>{`${names[d]}: tap to hear it`}</title>
                {on && <circle key={player.active} cx={p.x} cy={p.y} r={22} fill="none" stroke={degreeColour(d)} strokeWidth={3} className="wheel-ripple" />}
                {movedSet.has(d) && !on && <circle cx={p.x} cy={p.y} r={27} fill="none" stroke={degreeColour(d)} strokeWidth={2} strokeDasharray="3 4" className="wheel-spin" />}
                <circle cx={p.x} cy={p.y} r={on ? 24 : 20} fill={degreeColour(d)} stroke={d === 0 ? "var(--color-slate-50)" : "var(--color-slate-950)"} strokeWidth={d === 0 ? 3 : 2} className="transition-[r] duration-150" />
                <text x={p.x} y={p.y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={names[d].length > 1 ? 13 : 15} fontWeight={700} fill={DOT_INK} pointerEvents="none">
                  {names[d]}
                </text>
              </g>
            );
          })}
          <text key={mood} x={C} y={C - 8} textAnchor="middle" fontSize={34} fill="var(--color-slate-50)" className="landing-fade" style={{ fontFamily: "var(--font-display), serif", fontStyle: "italic" }}>
            {MOODS[mood].name}
          </text>
          <text x={C} y={C + 20} textAnchor="middle" fontSize={12.5} fill="var(--color-slate-400)">{MOODS[mood].feel}</text>
        </svg>
      </div>

      <p className="min-h-6 text-center text-sm text-slate-300" aria-live="polite">
        {moved.length === 0 ? (
          <>Pick a mood. Watch which note moves, and listen.</>
        ) : (
          <>
            {/* along the ladder every moved note goes the same way */}
            The{" "}
            {moved.map((m, i) => (
              <span key={m.degree}>
                {i > 0 && (i === moved.length - 1 ? " and " : ", ")}
                <b style={{ color: degreeColour(m.degree) }}>{NOTE_WORD[m.degree]}</b>
              </span>
            ))}{" "}
            {moved.length > 1 ? "notes" : "note"} slid {moved[0].down ? "down" : "up"}. That&apos;s the difference you hear.
          </>
        )}
      </p>

      <div role="radiogroup" aria-label="Mood" className="flex w-full flex-wrap justify-center gap-1.5">
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
      <p className="-mt-2 flex w-full max-w-sm items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500" aria-hidden>
        <span>Brighter</span>
        <span className="h-px flex-1 bg-linear-to-r from-amber-400/60 via-slate-600 to-violet-500/60" />
        <span>Darker</span>
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => playScale()} className="cursor-sound inline-flex items-center gap-2 rounded-full border border-emerald-500 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-50 hover:bg-emerald-500/25">
          <Icon name="play" size={13} fill /> Hear the notes
        </button>
        <TuneButton onPlay={playTune} title="A short tune in this mood, new every time" className="rounded-full border border-emerald-500 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-50 hover:bg-emerald-500/25" />
      </div>
    </div>
  );
}
