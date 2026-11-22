"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import InputChip, { micStatusMessage } from "@/components/InputChip";
import SingingStaff from "@/components/theory/singing/SingingStaff";
import { SetupTag, Stage, btn, btnBig } from "@/components/practice/shared";
import { useToolKeys } from "@/components/practice/toolKeys";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { Chip, ChipRow, KeyCap } from "@/components/ui";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import type { Ladder } from "@/features/theory/singing";
import { micGate } from "@/lib/practice/mic";
import { pcName } from "@/lib/practice/noteGame";
import { LETTERS, answerLine, isAnswer, isHeard, nextNote, notesOf, withAsked, type Letter, type ReadingClef, type ReadingNote, type ReadingSet } from "./reading";

const CLEF_TAG: Record<ReadingClef, string> = { treble: "Treble clef", bass: "Bass clef" };
const SET_TAG: Record<ReadingSet, string> = { lines: "Lines", spaces: "Spaces", staff: "Lines and spaces", ledger: "Ledger lines", all: "Every note" };
/** how long a note the tool plays sounds, and how long the mic then ignores what it hears, so the tool never answers itself */
const NOTE_MS = 700;
const DEAF_MS = 1500;

/**
 * Name the note on the staff. One note at a time is drawn with "?" under it on the singing staff (`SingingStaff`, no
 * second renderer); the student presses its letter, or with the mic on sings or plays it, any octave. The game says
 * what the note was and where it sits, the note keeps its place with its name under it, and the next one is asked to
 * its right. No score and no round: the game goes on until the student stops. The pure game is `reading.ts`.
 */
export function View(props: { clef: ReadingClef; notes: ReadingSet; mic?: boolean }) {
  // other notes or another clef is another game: it starts again
  return <Game key={`${props.clef}:${props.notes}`} {...props} />;
}

function Game({ clef, notes, mic: micFirst = false }: { clef: ReadingClef; notes: ReadingSet; mic?: boolean }) {
  const pool = useMemo(() => notesOf(clef, notes), [clef, notes]);
  const [asked, setAsked] = useState<ReadingNote | null>(null);
  const [trail, setTrail] = useState<ReadingNote[]>([]);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const [mic, setMic] = useState(micFirst);
  const [played, setPlayed] = useState<number | null>(null);
  const pitch = useRef<number | null>(null);
  const gate = useRef(micGate.initial);
  const deafUntil = useRef(0);

  const sound = useCallback((midi: number) => {
    deafUntil.current = performance.now() + DEAF_MS;
    void wakeAudio().then(() => {
      const piano = getSharedPiano();
      piano.noteOn(midi);
      setTimeout(() => piano.noteOff(midi), NOTE_MS);
    });
  }, []);

  const start = () => {
    setTrail([]);
    setSaid(null);
    setAsked(nextNote(pool, Math.random));
  };

  /** Any answer moves on: the note is named, sounded and kept on the staff, and the next one is asked. */
  const answer = useCallback((note: ReadingNote, by: Letter | "heard" | null) => {
    setSaid({ ok: by === "heard" || (by !== null && isAnswer(note, by)), text: answerLine(note, by) });
    sound(note.midi);
    setTrail((t) => withAsked(t, note));
    setAsked(nextNote(pool, Math.random, note));
  }, [pool, sound]);

  const onHeard = useCallback((pc: number | null) => {
    if (!asked || performance.now() < deafUntil.current) return;
    // the gate scores a note once: one still ringing from the last answer cannot answer this one too
    const r = micGate.step(gate.current, pc, asked.midi % 12);
    gate.current = r.state;
    if (r.score && isHeard(asked, pc)) answer(asked, "heard");
  }, [asked, answer]);
  const { status, heard } = useMicPitch(mic && !!asked, onHeard);

  // Space presses Start; a letter key answers with that note. Skip has no key, so a note is never thrown away by a slip
  const { ref: keysRef, armed } = useToolKeys((e, onControl) => {
    if (e.key === " ") {
      if (onControl || asked) return;
      start();
      return true;
    }
    const letter = LETTERS.find((l) => l === e.key.toUpperCase());
    if (!asked || !letter) return;
    e.stopImmediatePropagation();
    answer(asked, letter);
    return true;
  });

  const shown = useMemo(() => (asked ? withAsked(trail, asked) : trail), [trail, asked]);
  const ladder: Ladder = useMemo(() => ({
    notes: shown.map((n) => ({ midi: n.midi, spelled: n.spelled, degree: 0, label: "R" })),
    signature: 0,
    pcs: new Set<number>(),
    title: `${CLEF_TAG[clef]}, notes to name`,
  }), [shown, clef]);
  const askedAt = asked ? shown.length - 1 : -1;
  /** an answered note sounds again on a tap; the asked one stays silent */
  const tap = (i: number) => {
    if (i === askedAt) return;
    sound(shown[i].midi);
    setPlayed(i);
    setTimeout(() => setPlayed((p) => (p === i ? null : p)), NOTE_MS);
  };

  const micText = micStatusMessage(status);
  const hint = !asked ? "Press Start." : `Press its letter below${armed ? ", or its letter key" : ""}${mic ? ", or sing or play the note" : ""}.`;

  return (
    <div ref={keysRef}>
      <Stage tone="sky">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5" aria-label="Set up as">
            <SetupTag tone="sky">{CLEF_TAG[clef]}</SetupTag>
            <SetupTag tone="amber">{SET_TAG[notes]}</SetupTag>
          </div>
          <p className="text-2xl leading-snug text-slate-50 sm:text-3xl" style={{ fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' }}>
            {asked ? "Name the note with the ? under it" : "Press Start to begin"}
          </p>
        </div>
        <div data-tour="staff-reading-start" className="flex flex-wrap items-center gap-2">
          {!asked
            ? <button type="button" className={btnBig} onClick={start}><Icon name="play" size={16} />Start{armed && <KeyCap className="hidden md:inline">Space</KeyCap>}</button>
            : <button type="button" className={`${btn} py-2`} onClick={() => answer(asked, null)}>Skip</button>}
        </div>
        <div role="status" className="flex min-h-9 items-center">
          {said ? (
            <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${said.ok ? "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30" : "bg-slate-400/15 text-slate-200 ring-slate-400/30"}`}>
              {said.ok && <Icon name="check" size={14} />}{said.text}
            </p>
          ) : <p className="text-sm text-slate-400">{hint}</p>}
        </div>
        <div data-tour="staff-reading-staff" className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
          <SingingStaff ladder={ladder} clef={clef} pitch={pitch} played={played} onNote={tap} labels="note" unnamed={(i) => i === askedAt} />
        </div>
        <div data-tour="staff-reading-answers" role="group" aria-label="The note's name" className="flex flex-wrap gap-2">
          {LETTERS.map((l) => (
            <button key={l} type="button" disabled={!asked} onClick={() => asked && answer(asked, l)} className="min-w-12 cursor-pointer rounded-xl border-2 border-slate-600 bg-slate-800 px-4 py-2 text-base font-semibold text-slate-50 transition hover:border-sky-400 hover:bg-slate-700 active:scale-[0.96] disabled:cursor-default disabled:opacity-40">{l}</button>
          ))}
        </div>
        <div data-tour="staff-reading-mic" className="flex flex-col gap-2">
          <ChipRow label="Also answer by" info="Sing the note, or play it on your instrument, and the mic hears it. Any octave counts. The letter buttons keep working.">
            <Chip on={mic} onClick={() => setMic((v) => !v)}>Singing or playing it (mic)</Chip>
            {mic && <InputChip status={status} />}
          </ChipRow>
          {mic && (
            <p className="text-xs text-slate-400">
              {micText ? (status === "asking" ? micText : `${micText} Or press the note's letter.`) : status === "on" ? `Listening${heard !== null ? `: hearing ${pcName(heard, false)}` : "…"} Any octave counts.` : "Press Start, then sing or play the note."}
            </p>
          )}
        </div>
      </Stage>
    </div>
  );
}
