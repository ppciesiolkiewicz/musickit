"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { NOTE_NAMES, RHYTHM_RATIOS, SCALES, degreeMidi, findScale, interference, invert, makeChallenge, noteName, permutations, retrograde, rotations, type Challenge } from "@/lib/improv/schillinger";
import { playMelody, silence, startDrone, startLoop, type Hit, type Loop } from "./sound";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const field = "h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const card = "flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3";
const H2 = ({ icon, children }: { icon: Parameters<typeof Icon>[0]["name"]; children: string }) => <h2 className="flex items-center gap-2 text-sm font-medium text-slate-100"><Icon name={icon} className="text-sky-300" />{children}</h2>;

/** Hits for a rhythm: the two generators and the resultant on three pitches, quietest generators first. */
function hitsFor(a: number, b: number, parts: { a: boolean; b: boolean; r: boolean }): Hit[] {
  const it = interference(a, b);
  const at = (p: number) => p / it.length;
  return [
    ...(parts.a ? it.a.map((p) => ({ at: at(p), freq: 196, gain: 0.25 })) : []),
    ...(parts.b ? it.b.map((p) => ({ at: at(p), freq: 294, gain: 0.25 })) : []),
    ...(parts.r ? it.r.map((p) => ({ at: at(p), freq: 880, gain: 0.3 })) : []),
  ];
}

export default function ImprovApp() {
  return (
    <div className="flex flex-col gap-3">
      <Intro />
      <RhythmLab />
      <MotiveLab />
      <Games />
    </div>
  );
}

function Intro() {
  return (
    <section className={card} aria-label="About the system">
      <H2 icon="info">Schillinger in two ideas</H2>
      <p className="text-sm text-slate-300">Joseph Schillinger (1895–1943) taught composition as arithmetic on rhythm and pitch, and his students included jazz and film composers such as George Gershwin. Two of his ideas turn straight into improvising exercises:</p>
      <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <li className="rounded-lg border border-slate-800 p-2"><b className="text-slate-100">Interference.</b> Two pulses, one repeating <i>a</i> times and one <i>b</i> times in the same bar, create a third rhythm where either one sounds. 3 against 2 gives 2+1+1+2: a rhythm you could not easily make up, and it always fits the bar.</li>
        <li className="rounded-lg border border-slate-800 p-2"><b className="text-slate-100">Permutation.</b> Take a short motive and play every ordering, rotation, mirror image and reverse of it. Three or four notes give dozens of phrases that all belong together.</li>
      </ul>
    </section>
  );
}

function useLoop() {
  const loop = useRef<Loop | null>(null);
  const [on, setOn] = useState(false);
  const stop = () => { loop.current?.stop(); loop.current = null; setOn(false); };
  const start = (cycleSeconds: number, hits: Hit[]) => { loop.current?.stop(); loop.current = startLoop(cycleSeconds, hits); setOn(true); };
  useEffect(() => () => loop.current?.stop(), []);
  return { loop, on, start, stop };
}

function RhythmLab() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [bpm, setBpm] = useState(90);
  const [parts, setParts] = useState({ a: true, b: true, r: true });
  const it = useMemo(() => interference(a, b), [a, b]);
  const cycleSeconds = (4 * 60) / bpm;
  const { loop, on, start, stop } = useLoop();
  const head = useRef<HTMLDivElement>(null);

  // restart with the new settings while it plays
  useEffect(() => {
    if (on) start(cycleSeconds, hitsFor(a, b, parts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b, bpm, parts]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = loop.current?.position();
      if (head.current) head.current.style.left = p === undefined ? "0%" : `${p * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loop]);

  const rows: { label: string; pts: number[]; col: string; key: keyof typeof parts }[] = [
    { label: `${a}`, pts: it.a, col: "#38bdf8", key: "a" },
    { label: `${b}`, pts: it.b, col: "#fbbf24", key: "b" },
    { label: "=", pts: it.r, col: "#f472b6", key: "r" },
  ];
  return (
    <section className={card} aria-label="Rhythm lab">
      <H2 icon="timer">Rhythm by interference</H2>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <select className={field} value={a} onChange={(e) => setA(Number(e.target.value))} aria-label="First pulse">{[2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n}>{n}</option>)}</select>
        <span>against</span>
        <select className={field} value={b} onChange={(e) => setB(Number(e.target.value))} aria-label="Second pulse">{[2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n}>{n}</option>)}</select>
        <span className="ml-2">one bar of 4 beats at</span>
        <input type="range" min={50} max={160} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-28 accent-sky-400" aria-label="Tempo" />
        <span className="w-14 tabular-nums">{bpm} bpm</span>
        <button type="button" className={`${ibtn} ml-auto`} onClick={() => (on ? stop() : start(cycleSeconds, hitsFor(a, b, parts)))} aria-pressed={on} title={on ? "Stop" : "Play"} aria-label={on ? "Stop" : "Play"}><Icon name={on ? "square" : "play"} fill /></button>
      </div>
      <div className="relative flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <button type="button" className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-[11px] ${parts[r.key] ? "border-slate-500 text-slate-100" : "border-slate-800 text-slate-600 line-through"}`} aria-pressed={parts[r.key]} onClick={() => setParts((p) => ({ ...p, [r.key]: !p[r.key] }))} title="Hear this line" aria-label={`Hear ${r.key === "r" ? "the resultant" : `the ${r.label} pulse`}`}>{r.label}</button>
            <div className="relative h-6 flex-1">
              <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800" />
              {r.pts.map((p) => <span key={p} className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${(p / it.length) * 100}%`, background: r.col, opacity: parts[r.key] ? 1 : 0.25 }} />)}
            </div>
          </div>
        ))}
        <div className="pointer-events-none absolute inset-y-1 left-[2.5rem] right-2"><div ref={head} className="absolute inset-y-0 w-px bg-white/60" /></div>
      </div>
      <p className="text-sm text-slate-300">Resultant: <b className="tabular-nums text-pink-300">{it.durations.join(" + ")}</b> <span className="text-slate-500">(in 1/{it.length}s of the bar)</span></p>
      <p className="text-xs text-slate-500">Improvise on it: play only on the pink dots, or tap the long and short notes in a scale you know. Mute a pulse to feel it from inside the resultant.</p>
    </section>
  );
}

function MotiveLab() {
  const [root, setRoot] = useState(0);
  const [scaleId, setScaleId] = useState("major");
  const scale = findScale(scaleId);
  const [motive, setMotive] = useState([0, 2, 1, 4]);
  const midi = (degs: number[]) => degs.map((d) => degreeMidi(root, scale, d, 4));
  const label = (degs: number[]) => degs.map((d) => noteName(degreeMidi(root, scale, d, 4))).join(" ");
  const toggle = (d: number) => setMotive((m) => (m.includes(d) ? (m.length > 2 ? m.filter((x) => x !== d) : m) : m.length < 4 ? [...m, d] : m));
  useEffect(() => () => silence(), []);
  const perms = useMemo(() => permutations(motive), [motive]);
  const rows: { name: string; degs: number[] }[] = [
    { name: "Motive", degs: motive },
    ...rotations(motive).slice(1).map((d, i) => ({ name: `Rotation ${i + 2}`, degs: d })),
    { name: "Retrograde", degs: retrograde(motive) },
    { name: "Inversion", degs: invert(motive) },
  ];
  const play = (degs: number[]) => playMelody(midi(degs), 280);
  return (
    <section className={card} aria-label="Motive lab">
      <H2 icon="repeat">Permuting a motive</H2>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <select className={field} value={root} onChange={(e) => setRoot(Number(e.target.value))} aria-label="Key">{NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
        <select className={field} value={scaleId} onChange={(e) => { setScaleId(e.target.value); setMotive((m) => m.filter((d) => d < findScale(e.target.value).steps.length).slice(0, 4)); }} aria-label="Scale">{SCALES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <span>Choose 2 to 4 degrees (in the order you click):</span>
        <div className="flex gap-1">
          {scale.steps.map((_, d) => {
            const at = motive.indexOf(d);
            return <button key={d} type="button" onClick={() => toggle(d)} aria-pressed={at >= 0} className={`grid h-9 w-9 place-items-center rounded-lg border leading-none ${at >= 0 ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 bg-slate-900 text-slate-300"}`} title={`Degree ${d + 1}`}><span className="text-[10px] text-slate-500">{d + 1}</span><span className="text-xs font-medium">{noteName(degreeMidi(root, scale, d, 4))}</span></button>;
          })}
        </div>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.name}>
            <button type="button" onClick={() => play(r.degs)} className="flex w-full items-center gap-2 rounded-lg border border-slate-800 px-2 py-1.5 text-left hover:border-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" aria-label={`Play ${r.name}`}>
              <Icon name="play" size={12} fill className="text-sky-300" />
              <span className="w-24 text-xs text-slate-400">{r.name}</span>
              <span className="text-sm text-slate-100">{label(r.degs)}</span>
            </button>
          </li>
        ))}
      </ul>
      <details>
        <summary className="cursor-pointer text-xs text-slate-400">All {perms.length} orderings</summary>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {perms.map((p) => <li key={p.join()}><button type="button" onClick={() => play(p)} className="rounded-md border border-slate-800 px-2 py-1 text-xs text-slate-200 hover:border-slate-500">{label(p)}</button></li>)}
        </ul>
      </details>
      <p className="text-xs text-slate-500">Improvise with it: choose one ordering, play it in time, then move to the next without stopping. Inversion mirrors the shape around the first note, inside the scale.</p>
    </section>
  );
}

const SEED_KEY = "musickit.improv.stats";

function Games() {
  return (
    <section className={card} aria-label="Games">
      <H2 icon="drum">Games</H2>
      <div className="grid gap-3 lg:grid-cols-2">
        <Roulette />
        <NameThatRhythm />
      </div>
    </section>
  );
}

function loadStats(): { done: number; best: number; streak: number } {
  try {
    const j = JSON.parse(window.localStorage.getItem(SEED_KEY) ?? "{}");
    return { done: Number(j.done) || 0, best: Number(j.best) || 0, streak: 0 };
  } catch {
    return { done: 0, best: 0, streak: 0 };
  }
}

/** Improv roulette: a random key, scale, rhythm, motive and rule, a timer, and an optional drone and click to play over. */
function Roulette() {
  const [seed, setSeed] = useState(1);
  const [c, setC] = useState<Challenge>(() => makeChallenge(1));
  const [left, setLeft] = useState<number | null>(null);
  const [drone, setDrone] = useState(false);
  const [click, setClick] = useState(false);
  const [stats, setStats] = useState({ done: 0, best: 0, streak: 0 });
  const stopDrone = useRef<(() => void) | null>(null);
  const loop = useRef<Loop | null>(null);

  useEffect(() => { setSeed(Math.floor(Math.random() * 1e6)); setStats(loadStats()); }, []);
  useEffect(() => { setC(makeChallenge(seed)); setLeft(null); }, [seed]);
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) { setLeft(null); return; }
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  useEffect(() => {
    stopDrone.current?.();
    stopDrone.current = drone ? startDrone(48 + c.root) : null;
    return () => { stopDrone.current?.(); stopDrone.current = null; };
  }, [drone, c.root]);
  useEffect(() => {
    loop.current?.stop();
    loop.current = null;
    if (click) loop.current = startLoop(2.4, hitsFor(c.ratio[0], c.ratio[1], { a: false, b: false, r: true }));
    return () => { loop.current?.stop(); loop.current = null; };
  }, [click, c]);

  const it = interference(c.ratio[0], c.ratio[1]);
  const done = () => {
    const next = { ...stats, done: stats.done + 1, streak: stats.streak + 1 };
    next.best = Math.max(stats.best, next.streak);
    setStats(next);
    try { window.localStorage.setItem(SEED_KEY, JSON.stringify({ done: next.done, best: next.best })); } catch { /* ignore */ }
    setSeed(Math.floor(Math.random() * 1e6));
  };
  const key = `${NOTE_NAMES[c.root]} ${c.scale.name}`;
  const notes = c.motive.map((d) => noteName(degreeMidi(c.root, c.scale, d, 4))).join(" ");
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-800 p-3">
      <h3 className="text-sm font-medium text-slate-100">Improv roulette</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">Key</dt><dd className="text-slate-100">{key}</dd>
        <dt className="text-slate-500">Rhythm</dt><dd className="text-slate-100">{c.ratio[0]}:{c.ratio[1]} <span className="text-pink-300">({it.durations.join("+")})</span></dd>
        <dt className="text-slate-500">Motive</dt><dd className="text-slate-100">{notes} <button type="button" className="ml-1 text-xs text-sky-300 underline" onClick={() => playMelody(c.motive.map((d) => degreeMidi(c.root, c.scale, d, 4)), 280)}>hear</button></dd>
        <dt className="text-slate-500">Rule</dt><dd className="text-slate-100">{c.constraint}</dd>
      </dl>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={`${ibtn} gap-1`} onClick={() => setLeft(left === null ? c.seconds : null)} aria-pressed={left !== null}><Icon name={left === null ? "timer" : "square"} fill={left !== null} />{left === null ? `${c.seconds} s` : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}</button>
        <button type="button" className={`${ibtn} ${drone ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={drone} onClick={() => setDrone(!drone)} title="Hold the root note"><Icon name="audio-lines" />drone</button>
        <button type="button" className={`${ibtn} ${click ? "!border-pink-400 !text-pink-200" : ""}`} aria-pressed={click} onClick={() => setClick(!click)} title="Click the resultant rhythm"><Icon name="metronome" />rhythm</button>
        <button type="button" className={`${ibtn} ml-auto gap-1 !border-emerald-500/70 !text-emerald-200`} onClick={done}><Icon name="check" />Did it</button>
        <button type="button" className={ibtn} onClick={() => setSeed(Math.floor(Math.random() * 1e6))} title="Skip to another challenge" aria-label="New challenge"><Icon name="repeat" /></button>
      </div>
      <p className="text-xs text-slate-500">Done {stats.done} · streak {stats.streak} · best streak {stats.best} · challenge #{seed}</p>
    </div>
  );
}

/** Ear game: listen to a one-bar rhythm made of the resultant and say which two pulses made it. */
function NameThatRhythm() {
  const [target, setTarget] = useState<[number, number]>(RHYTHM_RATIOS[0]);
  const [choices, setChoices] = useState<[number, number][]>(RHYTHM_RATIOS.slice(0, 3));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, tries: 0 });
  const loop = useRef<Loop | null>(null);
  const hear = (t: [number, number]) => { loop.current?.stop(); loop.current = startLoop(2, hitsFor(t[0], t[1], { a: false, b: false, r: true }), 2); };
  const next = () => {
    const t = RHYTHM_RATIOS[Math.floor(Math.random() * RHYTHM_RATIOS.length)];
    const others = RHYTHM_RATIOS.filter((r) => r !== t).sort(() => Math.random() - 0.5).slice(0, 2);
    setTarget(t);
    setChoices([t, ...others].sort(() => Math.random() - 0.5));
    setPicked(null);
    hear(t);
  };
  useEffect(() => { next(); return () => loop.current?.stop(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const key = (r: [number, number]) => `${r[0]}:${r[1]}`;
  const answer = (r: [number, number]) => {
    if (picked) return;
    setPicked(key(r));
    setScore((s) => ({ right: s.right + (key(r) === key(target) ? 1 : 0), tries: s.tries + 1 }));
  };
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-800 p-3">
      <h3 className="text-sm font-medium text-slate-100">Name that rhythm</h3>
      <p className="text-xs text-slate-400">Listen to the bar, count its long and short notes, and say which two pulses made it.</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={`${ibtn} gap-1`} onClick={() => hear(target)}><Icon name="play" fill />Again</button>
        {choices.map((r) => {
          const right = picked !== null && key(r) === key(target);
          const wrong = picked === key(r) && !right;
          return <button key={key(r)} type="button" disabled={picked !== null && !right && !wrong} onClick={() => answer(r)} className={`${ibtn} ${right ? "!border-emerald-400 !text-emerald-200" : wrong ? "!border-rose-400 !text-rose-200" : ""}`}>{key(r)}</button>;
        })}
        <button type="button" className={`${ibtn} ml-auto`} onClick={next} disabled={picked === null} aria-label="Next rhythm" title="Next"><Icon name="chevron-right" /></button>
      </div>
      {picked && <p className="text-sm text-slate-300">It was {key(target)}: <span className="text-pink-300">{interference(target[0], target[1]).durations.join(" + ")}</span></p>}
      <p className="text-xs text-slate-500">{score.right} of {score.tries} right</p>
    </div>
  );
}

