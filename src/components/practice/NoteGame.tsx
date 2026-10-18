"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NoteNeck, { type NeckDot } from "@/components/theory/NoteNeck";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { playMelody } from "@/features/sound";
import {
  answerChoices, isCorrect, nextNoteQuestion, noteSettingsQuery, pcName, positionsOf, recordHeat,
  type Heat, type NoteMode, type NoteQuestion, type NoteSettings,
} from "@/lib/practice/noteGame";
import { useMicPitch } from "./useMicPitch";
import { micGate } from "@/lib/practice/mic";
import { btn, btnPrimary, panel, readBest, writeBest, writeQuery } from "./shared";
import { Chip, ChipRow, Stepper } from "@/components/ui";

const STRING_LETTERS = ["E", "A", "D", "G", "B", "e"];
const MODES: { id: NoteMode; label: string }[] = [
  { id: "find", label: "Find it on a string" },
  { id: "every", label: "Find every one" },
  { id: "name", label: "Name the dot" },
];
const BEST_KEY = "musickit.noteGame.best";
const SPRINT_MS = 60_000;

type Feedback = { ok: boolean; text: string } | null;

/** The fretboard note game: find a named note (tap or play it), find every instance, or name a lit dot. */
export default function NoteGame({ initial }: { initial: NoteSettings }) {
  const [s, setS] = useState(initial);
  const [q, setQ] = useState<NoteQuestion | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [streak, setStreak] = useState(0);
  const [heat, setHeat] = useState<Heat>({});
  const [showHeat, setShowHeat] = useState(false);
  const [mic, setMic] = useState(false);
  const [sprint, setSprint] = useState<{ ends: number; count: number } | null>(null);
  const [now, setNow] = useState(0);
  const [best, setBest] = useState(0);
  const asked = useRef(0);
  const gate = useRef(micGate.initial);

  useEffect(() => setBest(readBest(BEST_KEY)), []); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage is only readable after mount

  const update = (patch: Partial<NoteSettings>) => {
    const next = { ...s, ...patch };
    if (!next.strings.length) return;
    setS(next);
    writeQuery(noteSettingsQuery(next));
    setQ(null);
    setFound([]);
    setFeedback(null);
  };

  const ask = useCallback((prev?: NoteQuestion | null) => {
    const n = nextNoteQuestion(s, Math.random, prev ?? undefined);
    setQ(n);
    setFound([]);
    asked.current = performance.now();
  }, [s]);

  const hit = useCallback((string: number, fret: number, cur: NoteQuestion) => {
    const ms = performance.now() - asked.current;
    setHeat((h) => recordHeat(h, string, fret, true, ms));
    setStreak((n) => n + 1);
    setSprint((sp) => (sp && performance.now() < sp.ends ? { ...sp, count: sp.count + 1 } : sp));
    setFeedback({ ok: true, text: `Yes: ${pcName(cur.pc, s.flats)}` });
    playMelody([OPEN_MIDI[string] + fret], 600);
    ask(cur);
  }, [ask, s.flats]);

  const tap = (string: number, fret: number) => {
    if (!q || s.mode === "name") return;
    if (!isCorrect(q, s, string, fret)) {
      setHeat((h) => recordHeat(h, string, fret, false, performance.now() - asked.current));
      setStreak(0);
      setFeedback({ ok: false, text: `That was ${pcName((OPEN_MIDI[string] + fret) % 12, s.flats)} (string ${STRING_LETTERS[string]}, fret ${fret})` });
      // the note you hit, then the one you were asked for
      const target = positionsOf(q.pc, s).find((p) => p.string === q.string) ?? positionsOf(q.pc, s)[0];
      playMelody(target ? [OPEN_MIDI[string] + fret, OPEN_MIDI[target.string] + target.fret] : [OPEN_MIDI[string] + fret], 550);
      return;
    }
    if (s.mode === "every") {
      const key = `${string}:${fret}`;
      const nextFound = found.includes(key) ? found : [...found, key];
      setFound(nextFound);
      playMelody([OPEN_MIDI[string] + fret], 500);
      if (nextFound.length >= positionsOf(q.pc, s).length) hit(string, fret, q);
      else setFeedback({ ok: true, text: `${nextFound.length} of ${positionsOf(q.pc, s).length} found` });
      return;
    }
    hit(string, fret, q);
  };

  const name = (pc: number) => {
    if (!q || q.fret === undefined) return;
    if (pc === q.pc) hit(q.string, q.fret, q);
    else {
      setHeat((h) => recordHeat(h, q.string, q.fret!, false, performance.now() - asked.current));
      setStreak(0);
      setFeedback({ ok: false, text: `Not ${pcName(pc, s.flats)}. Count up from the open string or the nearest dot.` });
    }
  };

  const onPlayed = useCallback((pc: number | null) => {
    if (!q || s.mode === "every") return;
    const r = micGate.step(gate.current, pc, q.pc);
    gate.current = r.state;
    if (!r.score) return;
    const pos = q.fret !== undefined ? { string: q.string, fret: q.fret } : positionsOf(q.pc, s).find((p) => p.string === q.string)!;
    hit(pos.string, pos.fret, q);
  }, [q, s, hit]);
  const { status, heard } = useMicPitch(mic && !!q && s.mode !== "every", onPlayed);

  useEffect(() => {
    if (!sprint) return;
    const id = setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t >= sprint.ends) {
        clearInterval(id);
        if (sprint.count > best) {
          setBest(sprint.count);
          writeBest(BEST_KEY, sprint.count);
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [sprint, best]);

  const startSprint = () => {
    const t = performance.now();
    setSprint({ ends: t + SPRINT_MS, count: 0 });
    setNow(t);
    setStreak(0);
    ask(null);
  };
  const sprintLeft = sprint ? Math.max(0, Math.ceil((sprint.ends - now) / 1000)) : 0;

  const dots: NeckDot[] = [];
  if (q && s.mode === "name" && q.fret !== undefined) dots.push({ string: q.string, fret: q.fret, label: "?", fill: "#f59e0b", big: true });
  if (q && s.mode === "every") found.forEach((k) => {
    const [st, fr] = k.split(":").map(Number);
    dots.push({ string: st, fret: fr, label: pcName(q.pc, s.flats), fill: "#34d399" });
  });
  const heatFill = (string: number, fret: number) => {
    const h = heat[`${string}:${fret}`];
    if (!h) return undefined;
    const miss = h.misses / h.tries, slow = Math.min(1, h.ms / h.tries / 6000);
    return miss > 0 ? `rgba(244,63,94,${0.2 + 0.5 * miss})` : `rgba(245,158,11,${0.1 + 0.4 * slow})`;
  };
  const dim = (string: number, fret: number) => (!s.strings.includes(string) || fret < s.from || fret > s.to ? "rgba(148,163,184,0.06)" : undefined);
  const prompt = !q ? "Press Start" : s.mode === "name" ? "Name the lit note" : s.mode === "every" ? `Find every ${pcName(q.pc, s.flats)} (frets ${s.from}–${s.to})` : `Find ${pcName(q.pc, s.flats)} on the ${STRING_LETTERS[q.string]} string`;
  const choices = answerChoices(s.naturals, q?.pc ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <section className={`${panel} flex flex-col gap-2`}>
        <ChipRow label="Game">{MODES.map((m) => <Chip key={m.id} on={s.mode === m.id} onClick={() => update({ mode: m.id })}>{m.label}</Chip>)}</ChipRow>
        <ChipRow label="Strings">
          {STRING_LETTERS.map((l, i) => (
            <Chip key={l} on={s.strings.includes(i)} onClick={() => update({ strings: s.strings.includes(i) ? s.strings.filter((x) => x !== i) : [...s.strings, i].sort((a, b) => a - b) })}>{l}</Chip>
          ))}
        </ChipRow>
        <div className="flex flex-wrap items-center gap-3">
          <Stepper label="From fret" value={`from ${s.from}`} onDec={() => update({ from: Math.max(0, s.from - 1) })} onInc={() => update({ from: Math.min(s.to, s.from + 1) })} decDisabled={s.from <= 0} incDisabled={s.from >= s.to} />
          <Stepper label="To fret" value={`to ${s.to}`} onDec={() => update({ to: Math.max(s.from, s.to - 1) })} onInc={() => update({ to: Math.min(15, s.to + 1) })} decDisabled={s.to <= s.from} incDisabled={s.to >= 15} />
          <Chip on={s.naturals} onClick={() => update({ naturals: !s.naturals })}>Natural notes only</Chip>
          <Chip on={s.flats} onClick={() => update({ flats: !s.flats })}>Flat names</Chip>
        </div>
        <ChipRow label="Answer by">
          <Chip on={!mic} onClick={() => setMic(false)}>Tapping the neck</Chip>
          <Chip on={mic} onClick={() => setMic(true)}>Playing it (mic)</Chip>
        </ChipRow>
        {mic && (
          <p className="text-xs text-slate-400">
            {s.mode === "every" ? "The mic can't tell which string you used, so “find every one” is answered by tapping." : status === "asking" ? "Allow the microphone in your browser…" : status === "denied" ? "Microphone blocked. Allow it in the browser's site settings, or answer by tapping." : status === "insecure" ? "The browser only allows the microphone on a secure (https) page. Answer by tapping here." : status === "error" ? "No microphone found. Answer by tapping." : status === "on" ? `Listening${heard !== null ? `: hearing ${pcName(heard, s.flats)}` : "…"} Any octave counts.` : "Press Start, then play the note."}
          </p>
        )}
      </section>

      <section className={panel}>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="text-lg text-slate-100">{prompt}</span>
          {!q ? <button type="button" className={btnPrimary} onClick={() => ask(null)}>Start</button> : <button type="button" className={btn} onClick={() => ask(q)}>Skip</button>}
          {q && <button type="button" className={`cursor-sound ${btn}`} onClick={() => { const p = positionsOf(q.pc, s).find((x) => x.string === q.string) ?? positionsOf(q.pc, s)[0]; if (p) playMelody([OPEN_MIDI[p.string] + p.fret], 700); }}>Hear the note</button>}
          <span className="ml-auto text-sm text-slate-400">streak <b className="text-slate-100">{streak}</b></span>
        </div>
        {feedback && <p className={`mb-2 text-sm ${feedback.ok ? "text-emerald-300" : "text-rose-300"}`}>{feedback.text}</p>}
        <div className="min-w-0">
          <NoteNeck from={0} to={15} dots={dots} onCell={q && s.mode !== "name" ? tap : undefined} cellFill={(st, fr) => (showHeat ? heatFill(st, fr) : undefined) ?? dim(st, fr)} />
        </div>
        {q && s.mode === "name" && (
          <div className="mt-2 flex flex-wrap gap-1.5">{choices.map((pc) => <Chip key={pc} onClick={() => name(pc)}>{pcName(pc, s.flats)}</Chip>)}</div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <button type="button" className={btn} onClick={startSprint} disabled={!!sprint && sprintLeft > 0}>60-second sprint</button>
          {sprint && <span>{sprintLeft > 0 ? `${sprintLeft}s left · ` : "Time! "}<b className="text-slate-100">{sprint.count}</b> found</span>}
          <span>best <b className="text-slate-100">{best}</b></span>
          <Chip on={showHeat} onClick={() => setShowHeat((v) => !v)}>Show weak spots</Chip>
        </div>
        {showHeat && <p className="mt-1 text-xs text-slate-500">Red cells are where you missed, amber where you were slow. Practise those next: narrow the strings and frets above.</p>}
      </section>
    </div>
  );
}
