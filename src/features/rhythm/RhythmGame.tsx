"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext, getOutputBus } from "@/features/sound";
import { Button, Chip, ChipRow, NumberField, Slider } from "@/components/ui";
import { MAX_BPM, MIN_BPM, PATTERNS, buildRound, patternById, type Round } from "./patterns";
import { createJudge, type Grade, type Judge, type Judged, type Summary } from "./judge";
import { DEFAULT_RISE_DB } from "./onset";
import { heardAt, heardNow } from "./clock";
import { listenForStrums, type StrumListener } from "./mic";

type Input = "keys" | "mic";
type Click = "on" | "count-in";

interface Settings { bpm: number; pattern: string; bars: number; input: Input; click: Record<Input, Click>; offset: Record<Input, number>; riseDb: number }

const STORE = "musickit.rhythm";
const DEFAULTS: Settings = { bpm: 90, pattern: "quarters", bars: 8, input: "keys", click: { keys: "on", mic: "count-in" }, offset: { keys: 0, mic: 0 }, riseDb: DEFAULT_RISE_DB };
const BAR_CHOICES = [4, 8, 16];
const OFFSET_LIMIT = 0.25;
const AHEAD_BARS = 2; // how much of what is coming the lane shows (one bar on a narrow lane, where two would crowd the notes)
const HIT_AT = 0.18; // the hit line, as a share of the lane's width

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function load(): Settings {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORE) ?? "null") as Partial<Settings> | null;
    if (!raw) return DEFAULTS;
    const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : d);
    const click = (v: unknown, d: Click): Click => (v === "on" || v === "count-in" ? v : d);
    return {
      bpm: Math.round(num(raw.bpm, DEFAULTS.bpm, MIN_BPM, MAX_BPM)),
      pattern: patternById(String(raw.pattern)).id,
      bars: BAR_CHOICES.includes(raw.bars as number) ? (raw.bars as number) : DEFAULTS.bars,
      input: raw.input === "mic" ? "mic" : "keys",
      click: { keys: click(raw.click?.keys, "on"), mic: click(raw.click?.mic, "count-in") },
      offset: { keys: num(raw.offset?.keys, 0, -OFFSET_LIMIT, OFFSET_LIMIT), mic: num(raw.offset?.mic, 0, -OFFSET_LIMIT, OFFSET_LIMIT) },
      riseDb: num(raw.riseDb, DEFAULT_RISE_DB, 4, 16),
    };
  } catch { return DEFAULTS; }
}

/** A metronome blip on the app's output: higher on beat 1. Returns the node so a stopped round can silence what is still to come. */
function click(ctx: AudioContext, time: number, accent: boolean) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.frequency.value = accent ? 1760 : 1175;
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(accent ? 0.5 : 0.32, time + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  osc.connect(env).connect(getOutputBus());
  osc.start(time);
  osc.stop(time + 0.06);
  return osc;
}

/** How lit the hit line is: fully at a hit, fading out over 150 ms. */
const flashFor = (now: number, at: number | undefined) => (at === undefined ? 0 : clamp(1 - (now - at) / 0.15, 0, 1));

const ms = (s: number) => `${Math.abs(Math.round(s * 1000))} ms`;
const early = (s: number) => (Math.round(s * 1000) === 0 ? "on the beat" : `${ms(s)} ${s < 0 ? "early" : "late"}`);

const GRADE_LABEL: Record<Grade, string> = { perfect: "Perfect", good: "Good", ok: "OK", miss: "Miss" };
const GRADE_TOKEN: Record<Grade, string> = { perfect: "--color-emerald-400", good: "--color-sky-300", ok: "--color-amber-400", miss: "--color-rose-500" };

type Palette = Record<Grade | "pending" | "line" | "beat" | "bar" | "text" | "dim", string>;

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (t: string, d: string) => css.getPropertyValue(t).trim() || d;
  return {
    perfect: v(GRADE_TOKEN.perfect, "#34d399"), good: v(GRADE_TOKEN.good, "#7dd3fc"), ok: v(GRADE_TOKEN.ok, "#fbbf24"), miss: v(GRADE_TOKEN.miss, "#f43f5e"),
    pending: v("--color-sky-400", "#38bdf8"), line: v("--color-slate-200", "#e2e8f0"), beat: v("--color-slate-800", "#1e293b"),
    bar: v("--color-slate-600", "#475569"), text: v("--color-slate-100", "#f1f5f9"), dim: v("--color-slate-500", "#64748b"),
  };
}

interface Live {
  round: Round;
  judge: Judge;
  hits: { t: number; grade: Grade | null }[]; // every tap or strum, for the ticks on the lane
  last: { judged: Judged | null; at: number } | null; // the latest feedback, and when (heard time) it came
  nodes: OscillatorNode[];
}

/** Draws the lane: beats and bar lines scrolling left into the hit line, the notes to play on them, and each hit where it landed. */
function draw(canvas: HTMLCanvasElement, pal: Palette, round: Round, now: number, live: Live | null, flash: number) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const hitX = w * HIT_AT;
  const pps = (w - hitX) / (round.beat * 4 * (w < 600 ? 1 : AHEAD_BARS));
  const x = (t: number) => hitX + (t - now) * pps;
  const mid = h / 2;

  // beats; the count-in's are faint
  for (const c of round.clicks) {
    const cx = x(c.time);
    if (cx < -2 || cx > w + 2) continue;
    g.strokeStyle = c.accent ? pal.bar : pal.beat;
    g.globalAlpha = c.countIn ? 0.4 : 1;
    g.lineWidth = c.accent ? 2 : 1;
    g.beginPath();
    g.moveTo(cx, 14);
    g.lineTo(cx, h - 14);
    g.stroke();
  }
  g.globalAlpha = 1;

  // the hit line, brighter just after a hit
  g.strokeStyle = pal.line;
  g.globalAlpha = 0.5 + 0.5 * flash;
  g.lineWidth = 2 + 2 * flash;
  g.beginPath();
  g.moveTo(hitX, 6);
  g.lineTo(hitX, h - 6);
  g.stroke();
  g.globalAlpha = 1;

  // notes: coloured by how they went once judged
  const results = live?.judge.results() ?? [];
  const r = clamp(h * 0.12, 7, 14);
  round.targets.forEach((t, i) => {
    const cx = x(t);
    if (cx < -r || cx > w + r) return;
    const res = results[i];
    g.fillStyle = res ? pal[res.grade] : pal.pending;
    g.globalAlpha = res?.grade === "miss" ? 0.45 : 1;
    g.beginPath();
    g.arc(cx, mid, res && res.grade !== "miss" ? r * 0.75 : r, 0, Math.PI * 2);
    g.fill();
  });
  g.globalAlpha = 1;

  // where each hit landed: a short tick, grey when it belonged to no note
  for (const hit of live?.hits ?? []) {
    const cx = x(hit.t);
    if (cx < 0 || cx > w) continue;
    g.strokeStyle = hit.grade ? pal[hit.grade] : pal.dim;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx, mid + r + 4);
    g.lineTo(cx, mid + r + 14);
    g.stroke();
  }

  // count-in numbers, then the latest grade over the hit line
  g.textAlign = "center";
  g.textBaseline = "middle";
  const first = round.targets.length ? round.clicks[4]?.time ?? round.end : round.end;
  if (live && now < first && now > round.clicks[0].time - round.beat) {
    const n = Math.floor((now - round.clicks[0].time) / round.beat) + 1;
    if (n >= 1) {
      g.fillStyle = pal.text;
      g.font = `300 ${Math.round(h * 0.4)}px var(--font-geist-sans), system-ui, sans-serif`;
      g.fillText(String(n), w / 2, mid);
    }
  } else if (live?.last && now - live.last.at < 0.6) {
    const j = live.last.judged;
    g.globalAlpha = clamp(1 - (now - live.last.at) / 0.6, 0, 1);
    g.fillStyle = j ? pal[j.grade] : pal.dim;
    g.font = `500 ${Math.round(clamp(h * 0.13, 12, 18))}px var(--font-geist-sans), system-ui, sans-serif`;
    g.fillText(j ? `${GRADE_LABEL[j.grade]}${j.offset !== null && j.grade !== "perfect" ? ` · ${j.offset < 0 ? "early" : "late"}` : ""}` : "Extra", hitX, 16);
    g.globalAlpha = 1;
  }
}

/**
 * The rhythm game: a metronome counts in one bar, then notes scroll into the hit line and the player hits each one as it gets
 * there, with Space (or a tap on the lane) or by strumming a guitar into the microphone. Each hit is graded by how far it lands
 * from the beat; a round ends with a score and the average early/late, which can be kept as the player's offset (taking out the
 * delay of their speakers, keyboard or microphone).
 */
export default function RhythmGame() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<Live | null>(null);
  const mic = useRef<StrumListener | null>(null);
  const settings = useRef(s);
  const pal = useRef<Palette | null>(null);
  const idleFlash = useRef(-Infinity); // heard time of the latest hit while no round is on: the line still answers, so a strum shows the mic hears it

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring saved settings after hydration
    setS(load());
  }, []);
  useEffect(() => {
    settings.current = s;
  });

  const update = (patch: Partial<Settings>) => setS((prev) => {
    const next = { ...prev, ...patch };
    try { window.localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* storage blocked */ }
    return next;
  });

  const pattern = patternById(s.pattern);

  /** A tap or strum at heard time `t` (before the player's offset). */
  const hit = useCallback((t: number) => {
    const l = live.current;
    if (!l) { idleFlash.current = t; return; }
    const at = t - settings.current.offset[settings.current.input];
    const judged = l.judge.hit(at);
    l.hits.push({ t: at, grade: judged?.grade ?? null });
    l.last = { judged, at: heardNow(getAudioContext()) };
    setStreak(l.judge.streak);
  }, []);

  const finish = useCallback(() => {
    const l = live.current;
    if (!l) return;
    l.judge.expire(Infinity);
    setSummary(l.judge.summary());
    setPhase("done");
    live.current = null;
  }, []);

  const stop = useCallback(() => {
    live.current?.nodes.forEach((n) => { try { n.stop(); } catch { /* already done */ } });
    live.current = null;
    setPhase("idle");
  }, []);

  const closeMic = useCallback(() => {
    mic.current?.stop();
    mic.current = null;
    setMicOn(false);
  }, []);

  useEffect(() => () => { stop(); closeMic(); }, [stop, closeMic]);

  const start = async () => {
    setError(null);
    const ctx = getAudioContext();
    await ctx.resume().catch(() => undefined);
    if (s.input === "mic" && !mic.current) {
      try {
        mic.current = await listenForStrums(ctx, (t) => hit(t), { riseDb: s.riseDb });
        setMicOn(true);
      } catch {
        setError("The microphone could not be opened. Allow microphone access for this site and try again, or play with Space.");
        return;
      }
    }
    pal.current = readPalette();
    const round = buildRound(pattern, s.bpm, s.bars, ctx.currentTime + 0.4);
    const nodes = round.clicks.filter((c) => s.click[s.input] === "on" || c.countIn).map((c) => click(ctx, c.time, c.accent));
    live.current = { round, judge: createJudge(round.targets), hits: [], last: null, nodes };
    setSummary(null);
    setStreak(0);
    setPhase("playing");
  };

  // the mic follows the sensitivity
  useEffect(() => {
    mic.current?.setOptions({ riseDb: s.riseDb });
  }, [s.riseDb, micOn]);

  // Space hits in keys mode; Escape stops a round
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && live.current) { stop(); return; }
      if (e.code !== "Space" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, [contenteditable=true]")) return;
      e.preventDefault();
      if (settings.current.input !== "keys") return;
      hit(heardAt(getAudioContext(), e.timeStamp));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hit, stop]);

  // the lane: animated during a round, a still preview of the pattern otherwise
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    pal.current ??= readPalette();
    let raf = 0;
    const frame = () => {
      const l = live.current;
      if (l) {
        const ctx = getAudioContext();
        const now = heardNow(ctx);
        const missed = l.judge.expire(now);
        if (missed.length) setStreak(l.judge.streak);
        draw(el, pal.current!, l.round, now, l, flashFor(now, l.last?.at));
        if (now > l.round.end + 0.3) finish();
      } else {
        const preview = buildRound(pattern, s.bpm, AHEAD_BARS + 1, 0);
        draw(el, pal.current!, preview, preview.clicks[4].time - preview.beat * 0.5, null, Number.isFinite(idleFlash.current) ? flashFor(heardNow(getAudioContext()), idleFlash.current) : 0);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pattern, s.bpm, phase, finish]);

  const playing = phase === "playing";
  const offset = s.offset[s.input];
  const canKeep = summary && summary.meanOffset !== null && summary.perfect + summary.good + summary.ok >= 4 && Math.abs(summary.meanOffset) >= 0.005;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Lane" className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-400">
            {pattern.name} · {s.bpm} BPM · <span className="text-slate-500">{pattern.hint}</span>
          </span>
          <span className="tabular-nums text-slate-300" aria-live="polite">{playing && streak > 1 ? `Streak ${streak}` : ""}</span>
        </div>
        <canvas
          ref={canvas}
          aria-label={s.input === "keys" ? "Rhythm lane: press Space or tap here on each note" : "Rhythm lane: strum on each note"}
          onPointerDown={(e) => { if (settings.current.input === "keys") hit(heardAt(getAudioContext(), e.timeStamp)); }}
          className="h-40 w-full touch-none select-none rounded-xl bg-slate-950/60 sm:h-48"
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={playing ? stop : start}
            className={`inline-flex min-w-48 items-center justify-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${playing ? "border-rose-500/70 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25" : "border-emerald-500/70 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"}`}>
            <span aria-hidden className={`h-2 w-2 ${playing ? "rounded-sm bg-rose-300" : "rounded-full bg-emerald-300"}`} />
            {playing ? "Stop" : phase === "done" ? "Play again" : "Start"}
          </button>
          <span className="text-xs text-slate-500">
            {s.input === "keys" ? "Press Space (or tap the lane) as each note reaches the line." : micOn ? "Listening. Strum as each note reaches the line." : "Strum as each note reaches the line. The mic opens on Start."}
          </span>
        </div>
        {error && <p role="alert" className="text-center text-xs text-rose-300">{error}</p>}

        {summary && phase === "done" && (
          <div className="flex flex-col items-center gap-3 border-t border-slate-800 pt-3 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light tabular-nums text-slate-100">{summary.score}%</span>
              <span className="text-slate-400">best streak {summary.bestStreak}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 tabular-nums">
              <span className="text-emerald-300">Perfect {summary.perfect}</span>
              <span className="text-sky-300">Good {summary.good}</span>
              <span className="text-amber-300">OK {summary.ok}</span>
              <span className="text-rose-300">Miss {summary.miss}</span>
              {summary.extra > 0 && <span className="text-slate-400">Extra {summary.extra}</span>}
            </div>
            {summary.meanOffset !== null && (
              <div className="flex flex-wrap items-center justify-center gap-2 text-slate-400">
                <span>On average {early(summary.meanOffset)}.</span>
                {canKeep && (
                  <Button size="sm" title="If you were steady but always early or late, that is likely the delay of your speakers, keyboard or microphone" onClick={() => update({ offset: { ...s.offset, [s.input]: clamp(offset + summary.meanOffset!, -OFFSET_LIMIT, OFFSET_LIMIT) } })}>
                    Use as my offset
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <aside aria-label="Setup" className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <ChipRow label="Play with">
          <Chip on={s.input === "keys"} onClick={() => { if (!playing) { closeMic(); update({ input: "keys" }); } }}>Space / tap</Chip>
          <Chip on={s.input === "mic"} onClick={() => !playing && update({ input: "mic" })}>Strum (mic)</Chip>
        </ChipRow>
        <ChipRow label="Rhythm">
          {PATTERNS.map((p) => <Chip key={p.id} on={p.id === s.pattern} title={p.hint} onClick={() => !playing && update({ pattern: p.id })}>{p.name}</Chip>)}
        </ChipRow>
        <ChipRow label="Tempo">
          <Slider aria-label="Tempo" value={s.bpm} min={MIN_BPM} max={MAX_BPM} step={1} disabled={playing} onChange={(bpm) => update({ bpm })} className="w-48 max-w-full" />
          <span className="flex w-20 items-baseline gap-1 whitespace-nowrap text-xs text-slate-300"><NumberField value={s.bpm} min={MIN_BPM} max={MAX_BPM} disabled={playing} onCommit={(bpm) => update({ bpm })} aria-label="Tempo in beats per minute" className="w-10 py-0.5" />BPM</span>
        </ChipRow>
        <ChipRow label="Bars">
          {BAR_CHOICES.map((b) => <Chip key={b} on={b === s.bars} onClick={() => !playing && update({ bars: b })}>{b}</Chip>)}
        </ChipRow>
        <ChipRow label="Click" info={s.input === "mic" ? "The microphone can hear the click from your speakers and take it for a strum. With headphones, keep the click on; on speakers, let it count you in and keep time yourself." : undefined}>
          <Chip on={s.click[s.input] === "on"} onClick={() => update({ click: { ...s.click, [s.input]: "on" } })}>All the way</Chip>
          <Chip on={s.click[s.input] === "count-in"} onClick={() => update({ click: { ...s.click, [s.input]: "count-in" } })}>Count-in only</Chip>
        </ChipRow>
        <ChipRow label="Offset" info="Speakers, keyboards and microphones add a little delay, so a hit that feels on time can show as late. Play a round as steadily as you can and press Use as my offset, or set it here. Each input keeps its own.">
          <Slider aria-label="Offset" value={Math.round(offset * 1000)} min={-OFFSET_LIMIT * 1000} max={OFFSET_LIMIT * 1000} step={1} onChange={(v) => update({ offset: { ...s.offset, [s.input]: v / 1000 } })} className="w-48 max-w-full" />
          <span className="w-16 text-xs tabular-nums text-slate-300">{Math.round(offset * 1000)} ms</span>
          {offset !== 0 && <Button size="sm" onClick={() => update({ offset: { ...s.offset, [s.input]: 0 } })}>Reset</Button>}
        </ChipRow>
        {s.input === "mic" && (
          <ChipRow label="Sensitivity" info="How loud a strum has to be, against what was ringing just before, to count. Raise it if you get hits you did not play; lower it if soft strums are missed.">
            <Slider aria-label="Sensitivity" value={20 - s.riseDb} min={4} max={16} step={0.5} onChange={(v) => update({ riseDb: 20 - v })} className="w-48 max-w-full" />
          </ChipRow>
        )}
      </aside>
    </div>
  );
}
