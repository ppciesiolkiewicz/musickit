"use client";

import { useMemo } from "react";
import ClefGlyph from "@/components/theory/singing/ClefGlyph";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import { makeKey, spellAs, spellNote, type KeyContext, type Spelled } from "@/features/theory/piano/key";
import { place, signatureGlyphs, type Placed } from "@/features/theory/piano/staff";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import type { Cue } from "../../cues/cues";
import { BEATS_PER_BAR } from "../../timeline/timeline";
import { isNow, shade, type ViewProps } from "./common";

const HALF = 5; // px per staff step
const UNIT = 48; // px a beat
const MARKS_H = 16;
const LETTERS: Spelled["letter"][] = ["C", "D", "E", "F", "G", "A", "B"];
/** semitones above a chord root to the letters above it: ♭5 stays a 5th, ♭7 a 7th */
const LETTER_STEPS = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];
const GLYPH: Record<number, string> = { [-2]: "𝄫", [-1]: "♭", 0: "♮", 1: "♯", 2: "𝄪" };
const mod = (n: number, m: number) => ((n % m) + m) % m;

interface Head { midi: number; placed: Placed; accidental: string | null; shift: boolean }

/** Each cue's noteheads, low to high: spelled in the key, placed on the staff, with the accidentals the bar needs. */
function headsOf(cues: Cue[], key: KeyContext): Head[][] {
  // the alteration each letter and octave carries so far in the bar, against the signature
  let bar = -1;
  let carried = new Map<string, number>();
  return cues.map((c): Head[] => {
    const b = Math.floor(c.at / BEATS_PER_BAR);
    if (b !== bar) { bar = b; carried = new Map(); }
    const q = c.chord ? parseChordQuery(c.chord) : null;
    const rootLetter = q ? spellNote(key, q.rootPc + 60).letter : undefined;
    const out = [...c.midi].sort((x, y) => x - y).map((midi) => {
      const inKey = key.scalePcs.has(mod(midi, 12));
      const s = inKey || !q || !rootLetter ? spellNote(key, midi) : spellAs(key, midi, LETTERS[mod(LETTERS.indexOf(rootLetter) + LETTER_STEPS[mod(midi - q.rootPc, 12)], 7)]);
      const placed = place(s, key.signature, "treble8");
      const slot = `${s.letter}${s.octave}`;
      const was = carried.get(slot) ?? signatureAlter(s.letter, key.signature);
      carried.set(slot, s.alter);
      return { midi, placed, accidental: was === s.alter ? null : GLYPH[s.alter], shift: false };
    });
    // a second in a chord: the upper note sits to the right
    for (let i = 1; i < out.length; i++) if (out[i].placed.step - out[i - 1].placed.step === 1 && !out[i - 1].shift) out[i].shift = true;
    return out;
  });
}

/**
 * The cues on one staff in the guitar's clef (treble, an octave up), spaced by beat like the tab and with the same
 * playhead: a strum is its notes stacked, a single note a notehead. Notes are spelled in the key (chord tones outside it
 * from the chord's root), the key signature up front and accidentals carried through the bar. The chord is named above
 * each new chord; the cue sounding now is lit, the ones not enabled dimmed. Tap a column to hear it.
 */
export default function NotesView({ cues, pos, length, keyPc }: ViewProps) {
  const key = makeKey(keyPc ?? 0, "major");
  const heads = useMemo(() => headsOf(cues, key), [cues, key]);

  const steps = heads.flat().map((h) => h.placed.step);
  const top = Math.max(8, ...steps) + 2;
  const bottom = Math.min(0, ...steps) - 2;
  const marks = cues.map((c, i) => (c.chord && c.chord !== cues[i - 1]?.chord ? c.chord : undefined));
  const yOf = (step: number) => 6 + MARKS_H + (top - step) * HALF;
  const sig = signatureGlyphs(key.signature, "treble8");
  const x0 = 50 + sig.length * 9 + 24;
  const x = (at: number) => x0 + at * UNIT;
  const W = x(length) + 6, H = yOf(bottom) + 8;

  const tap = async (c: Cue) => {
    await wakeAudio();
    const piano = getSharedPiano();
    c.midi.forEach((m) => piano.noteOn(m));
    setTimeout(() => c.midi.forEach((m) => piano.noteOff(m)), 700);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label="The notes on the staff">
      <g stroke="var(--color-slate-500)" strokeWidth={1}>
        {[0, 2, 4, 6, 8].map((s) => <line key={s} x1={8} x2={W - 4} y1={yOf(s)} y2={yOf(s)} />)}
        <line x1={8} x2={8} y1={yOf(8)} y2={yOf(0)} strokeWidth={1.5} />
        {Array.from({ length: length / BEATS_PER_BAR }, (_, b) => <line key={b} x1={x((b + 1) * BEATS_PER_BAR) - 12} x2={x((b + 1) * BEATS_PER_BAR) - 12} y1={yOf(8)} y2={yOf(0)} />)}
      </g>
      <g fill="var(--color-slate-300)" textAnchor="middle">
        <ClefGlyph clef="treble8" yOf={yOf} />
        {sig.map((g, i) => <text key={i} x={56 + i * 9} y={yOf(g.step) + 6} fontSize={20}>{g.glyph}</text>)}
      </g>
      {cues.map((c, i) => {
        const now = isNow(c, pos);
        const fill = shade(c, now);
        const cx = x(c.at);
        return (
          <g key={`${c.at}-${i}`} role="button" aria-label={`Play ${c.chord || "note"}`} className="cursor-pointer" onClick={() => void tap(c)}>
            <rect x={cx - 12} y={0} width={Math.max(24, c.beats * UNIT - 4)} height={H} rx={5} fill={now ? "var(--color-sky-300)" : "transparent"} fillOpacity={now ? 0.1 : 0} />
            {marks[i] && <text x={cx} y={12} fontSize={11} fontWeight={600} fill="var(--color-slate-200)">{marks[i]}</text>}
            {heads[i].map((h, j) => {
              const hx = cx + (h.shift ? 11 : 0);
              const y = yOf(h.placed.step);
              return (
                <g key={j}>
                  {h.placed.ledgers.map((l) => <line key={l} x1={hx - 10} x2={hx + 10} y1={yOf(l)} y2={yOf(l)} stroke="var(--color-slate-500)" />)}
                  {h.accidental && <text x={cx - 9 - (j % 2) * 8} y={y + 5} textAnchor="end" fontSize={14} fill={fill}>{h.accidental}</text>}
                  <ellipse cx={hx} cy={y} rx={6} ry={4.6} fill={fill} transform={`rotate(-20 ${hx} ${y})`} />
                </g>
              );
            })}
          </g>
        );
      })}
      {pos >= 0 && <line x1={x(pos) - 12} x2={x(pos) - 12} y1={yOf(top - 1)} y2={yOf(bottom + 1)} stroke="var(--color-sky-400)" strokeWidth={2} pointerEvents="none" />}
    </svg>
  );
}

const SHARPS = "FCGDAEB", FLATS = "BEADGCF";
/** what a signature does to a letter: +1 sharp, -1 flat, 0 natural */
const signatureAlter = (letter: string, sig: number) => (sig > 0 ? (SHARPS.indexOf(letter) < sig ? 1 : 0) : sig < 0 ? (FLATS.indexOf(letter) < -sig ? -1 : 0) : 0);
