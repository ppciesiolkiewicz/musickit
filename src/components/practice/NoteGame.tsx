"use client";

import type { ReactNode } from "react";
import Icon from "@/components/Icon";
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
import { GameChoice, SetupTag, Stage, Stat, Target, btn, btnBig, panel, readBest, useGameKeys, writeBest, writeQuery } from "./shared";
import { Chip, ChipRow, Hint, Stepper } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { useLevelAtLeast } from "@/features/guide/Tier";
import InputChip, { micStatusMessage } from "@/components/InputChip";

const STRING_LETTERS = ["E", "A", "D", "G", "B", "e"];
const MODES: { id: NoteMode; title: string; about: string }[] = [
  { id: "find", title: "Find it on a string", about: "Get a note and a string, and find the fret." },
  { id: "every", title: "Find every one", about: "Find one note everywhere it sits on your strings." },
  { id: "name", title: "Name the dot", about: "A dot lights up on the neck. Say which note it is." },
];
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const BEST_KEY = "musickit.noteGame.best";
const SPRINT_MS = 60_000;

type Feedback = { ok: boolean; text: string } | null;

/** The fretboard note game: find a named note (tap or play it), find every instance, or name a lit dot. */
export default function NoteGame({ initial, syncUrl = true, bare = false }: { initial: NoteSettings; /** write the settings to the address bar (off when embedded in another page) */ syncUrl?: boolean; /** settings fixed by the host: only how to answer stays */ bare?: boolean }) {
  useCoverage({ hints: 1 });
  const [s, setS] = useState(initial);
  const [q, setQ] = useState<NoteQuestion | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [streak, setStreak] = useState(0);
  const [heat, setHeat] = useState<Heat>({});
  const [heatOn, setShowHeat] = useState(false);
  // the sprint and weak spots are a Standard control in an exercise (`bare`); on the notes page they always show.
  // Hidden, the weak spots are off.
  const extras = useLevelAtLeast("standard", !bare);
  const showHeat = extras && heatOn;
  const [mic, setMic] = useState(false);
  const [sprint, setSprint] = useState<{ ends: number; count: number } | null>(null);
  const [now, setNow] = useState(0);
  const [best, setBest] = useState(0);
  const asked = useRef(0);
  const gate = useRef(micGate.initial);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => setBest(readBest(BEST_KEY)), []); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage is only readable after mount

  const update = (patch: Partial<NoteSettings>) => {
    const next = { ...s, ...patch };
    if (!next.strings.length) return;
    setS(next);
    if (syncUrl) writeQuery(noteSettingsQuery(next));
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

  // name the dot from the keyboard: a letter key answers with that natural note
  useGameKeys((e) => {
    const pc = LETTER_PC[e.key.toUpperCase()];
    if (!q || s.mode !== "name" || pc === undefined) return;
    e.stopImmediatePropagation(); // the letter is an answer here, not the notes panel's shortcut
    name(pc);
  }, !bare);

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

  /** Starting a game on a short screen: bring the whole neck into view, since the low strings can sit below the fold. */
  const showNeck = () => {
    const el = stage.current;
    if (!el || el.getBoundingClientRect().bottom <= window.innerHeight) return;
    el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const startSprint = () => {
    showNeck();
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
  const prompt: ReactNode = !q ? "Press Start to begin" : s.mode === "name" ? "Name the lit note" : s.mode === "every"
    ? <>Find every<Target>{pcName(q.pc, s.flats)}</Target><span className="text-base text-slate-400">frets {s.from}–{s.to}</span></>
    : <>Find<Target>{pcName(q.pc, s.flats)}</Target>on the {STRING_LETTERS[q.string]} string</>;
  const choices = answerChoices(s.naturals, q?.pc ?? 0);
  const micText = micStatusMessage(status);
  // only offer what works right now: playing the note does nothing until the mic is on
  const hint = !q ? (bare ? "Press Start." : "Pick a game above, then press Start.")
    : s.mode === "name" ? `Pick its name below${bare ? "" : " or press its letter key"}${mic ? ", or play it on your guitar" : ""}.`
    : mic && s.mode !== "every" ? "Play it on your guitar, or tap the neck."
    : "Tap the neck.";
  const answerBy = (
    <div data-tour="note-finder-answer-by" className="flex flex-col gap-2">
      <ChipRow label="Answer by" info="Tap the note on the neck, or play it on your guitar and let the mic hear it. With the mic, any octave counts.">
        <Chip on={!mic} onClick={() => setMic(false)}>Tapping the neck</Chip>
        <Chip on={mic} onClick={() => setMic(true)}>Playing it (mic)</Chip>
        {mic && <InputChip status={status} />}
      </ChipRow>
      {mic && (
        <p className="text-xs text-slate-400">
          {s.mode === "every" ? "The mic can't tell which string you used, so “find every one” is answered by tapping." : micText ? (status === "asking" ? micText : `${micText} Or answer by tapping.`) : status === "on" ? `Listening${heard !== null ? `: hearing ${pcName(heard, s.flats)}` : "…"} Any octave counts.` : "Press Start, then play the note."}
        </p>
      )}
    </div>
  );

  const setup = !bare && (
    <section data-tour="notes-settings" className={`${panel} flex flex-col gap-2`}>
        <h2 className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Set up the game</h2>
        <ChipRow label="Strings" info="Which strings the questions use. Start with E and A, the roots of most chords, then add the others. The small e is the thin top string.">
          {STRING_LETTERS.map((l, i) => (
            <Chip key={l} on={s.strings.includes(i)} onClick={() => update({ strings: s.strings.includes(i) ? s.strings.filter((x) => x !== i) : [...s.strings, i].sort((a, b) => a - b) })}>{l}</Chip>
          ))}
        </ChipRow>
        <ChipRow label="Frets" info="The part of the neck the questions use. Frets outside it are dimmed. Keep it small at first, then widen it as it gets easy.">
          <Stepper label="From fret" value={`from ${s.from}`} onDec={() => update({ from: Math.max(0, s.from - 1) })} onInc={() => update({ from: Math.min(s.to, s.from + 1) })} decDisabled={s.from <= 0} incDisabled={s.from >= s.to} />
          <Stepper label="To fret" value={`to ${s.to}`} onDec={() => update({ to: Math.max(s.from, s.to - 1) })} onInc={() => update({ to: Math.min(15, s.to + 1) })} decDisabled={s.to <= s.from} incDisabled={s.to >= 15} />
        </ChipRow>
        <ChipRow label="Notes" info="Natural notes have no sharp or flat: A B C D E F G. Flat names call a note B♭ instead of A♯. It is the same note with another name.">
          <Chip on={s.naturals} onClick={() => update({ naturals: !s.naturals })}>Natural notes only</Chip>
          <Chip on={s.flats} onClick={() => update({ flats: !s.flats })}>Flat names</Chip>
        </ChipRow>
        <p className="mt-1 text-xs text-slate-400">These settings are in the page address. Copy the link to give a student the same exercise.</p>
    </section>
  );

  return (
    <div className="flex flex-col gap-4">
      {!bare && <div data-tour="notes-setup"><GameChoice label="Game" options={MODES} value={s.mode} onChange={(mode) => update({ mode })} tone="amber" /></div>}
      <div ref={stage} className="scroll-mt-4">
      <Stage tone="amber">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {bare && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5" aria-label="Set up as">
                <SetupTag tone="sky">{MODES.find((m) => m.id === s.mode)!.title}</SetupTag>
                <SetupTag tone="amber">Strings {s.strings.map((i) => STRING_LETTERS[i]).join(" ")}</SetupTag>
                <SetupTag tone="teal">Frets {s.from}–{s.to}</SetupTag>
                {s.naturals && <SetupTag tone="violet">Natural notes</SetupTag>}
                {s.flats && <SetupTag tone="violet">Flat names</SetupTag>}
              </div>
            )}
            <p className="text-2xl leading-snug text-slate-50 sm:text-3xl" style={{ fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' }}>{prompt}</p>
          </div>
          <div className="flex gap-2">
            <Stat label="streak" value={streak} tone="text-emerald-300" />
            {extras && <Stat label="best sprint" value={best} tone="text-amber-300" />}
            {sprint && <Stat label={sprintLeft > 0 ? "sec left" : "time!"} value={sprintLeft > 0 ? sprintLeft : sprint.count} tone="text-sky-300" />}
          </div>
        </div>
        <div data-tour="note-finder-start" className="flex flex-wrap items-center gap-2">
          <Hint title={q ? "Skip" : "Start"} description={q ? "Moves on to the next note." : "Asks for the first note."}>
            {!q ? <button type="button" className={btnBig} onClick={() => { showNeck(); ask(null); }}><Icon name="play" size={16} />Start</button> : <button type="button" className={btnBig} onClick={() => ask(q)}>Skip</button>}
          </Hint>
          {q && <button type="button" className={`${btn} inline-flex items-center gap-1.5 py-2`} onClick={() => { const p = positionsOf(q.pc, s).find((x) => x.string === q.string) ?? positionsOf(q.pc, s)[0]; if (p) playMelody([OPEN_MIDI[p.string] + p.fret], 700); }}><Icon name="volume-2" size={14} />Hear the note</button>}
          {extras && <span data-tour="note-finder-extras" className="ml-auto flex flex-wrap items-center gap-2">
            <button type="button" className={`${btn} py-2`} onClick={startSprint} disabled={!!sprint && sprintLeft > 0}>60-second sprint</button>
            <Chip on={showHeat} onClick={() => setShowHeat((v) => !v)}>Show weak spots</Chip>
          </span>}
        </div>
        {sprint && sprintLeft === 0 && <p className="text-sm text-slate-300">Time! You found <b className="text-slate-50">{sprint.count}</b>.</p>}
        <div role="status" className="flex min-h-9 items-center">
          {feedback ? (
            <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${feedback.ok ? "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30" : "bg-rose-400/15 text-rose-200 ring-rose-400/30"}`}>
              <Icon name={feedback.ok ? "check" : "x"} size={14} />{feedback.text}
            </p>
          ) : <p className="text-sm text-slate-400">{hint}</p>}
        </div>
        <div data-tour="note-finder-neck" className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
          <NoteNeck fill from={0} to={15} dots={dots} onCell={q && s.mode !== "name" ? tap : undefined} cellFill={(st, fr) => (showHeat ? heatFill(st, fr) : undefined) ?? dim(st, fr)} />
        </div>
        {q && s.mode === "name" && (
          <div className="flex flex-wrap gap-2">{choices.map((pc) => <button key={pc} type="button" onClick={() => name(pc)} className="min-w-14 cursor-pointer rounded-xl border-2 border-slate-600 bg-slate-800 px-4 py-2 text-base font-semibold text-slate-50 transition hover:border-amber-400 hover:bg-slate-700 active:scale-[0.96]">{pcName(pc, s.flats)}</button>)}</div>
        )}
        {showHeat && <p className="text-xs text-slate-400">Red cells are where you missed, amber where you were slow. Practise those next: narrow the strings and frets in the setup.</p>}
        {answerBy}
      </Stage>
      </div>
      {setup}
    </div>
  );
}
