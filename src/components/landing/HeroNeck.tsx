"use client";

import { useState } from "react";
import Link from "next/link";
import usePhone from "@/components/usePhone";
import Icon from "@/components/Icon";
import TuneButton from "@/components/chordKit/TuneButton";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { FAMILIES, TONICS, modeSteps, spell } from "@/features/theory/theory";
import { DOT_INK, MODE_PAGES, degreeColour, degreeLabels } from "@/features/theory/scales";
import { scaleHref } from "@/features/theory/keySlug";
import { generateMelody, melodyTiming, scalePool } from "@/lib/chordKit/melody";

const MAJOR_FAMILY = FAMILIES[0];
/** the seven major modes, named the way a beginner would ask for them */
const MODES = ["Major", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Minor", "Locrian"];
/** high e at the top, as a player looks down at the neck */
const OPEN = [64, 59, 55, 50, 45, 40];
const KEYS = TONICS.filter((t) => [0, 2, 4, 5, 7, 9, 11].includes(t.pc) || t.name === "B♭" || t.name === "E♭");

const NUT_X = 40;
const TOP = 24;
const GAP = 30;
const INLAYS = [3, 5, 7, 9];

/**
 * The landing page's hero: one key and one mode on the neck, every note coloured by its degree.
 * Switch the mode and the dots that change are the notes that give it its mood; tap any dot, play the scale, or hear a short tune in it.
 */
export default function HeroNeck() {
  const [mode, setMode] = useState(1);
  const [tonicIdx, setTonicIdx] = useState(KEYS.findIndex((t) => t.name === "A"));
  const tonic = KEYS[tonicIdx];
  const player = useNotePlayer();
  const phone = usePhone();

  const steps = modeSteps(MAJOR_FAMILY, mode);
  const labels = degreeLabels(steps);
  const names = spell(tonic.letter, tonic.pc, steps);
  const info = MAJOR_FAMILY.info[mode];
  const page = MODE_PAGES.find((m) => m.familyIndex === 0 && m.modeIndex === mode)!;
  // the lowest root on a guitar is around A2; scales and taps start from there
  const root = 45 + ((tonic.pc - 9 + 12) % 12);

  const to = phone ? 7 : 12;
  const fw = phone ? 52 : 58;
  const width = NUT_X + to * fw + 10;
  const boardBottom = TOP + 5 * GAP;
  const height = boardBottom + 44;
  const fretX = (f: number) => (f === 0 ? NUT_X / 2 : NUT_X + (f - 0.5) * fw);
  const r = phone ? 13 : 12.5;

  const dots = OPEN.flatMap((open, row) =>
    Array.from({ length: to + 1 }, (_, f) => {
      const midi = open + f;
      const degree = steps.indexOf((((midi - tonic.pc) % 12) + 12) % 12);
      return degree < 0 ? [] : [{ row, f, midi, degree }];
    }).flat(),
  );
  const lit = (d: { row: number; f: number; degree: number }) => player.active === `${d.row}-${d.f}` || player.active === `d${d.degree}`;

  const playScale = () => player.play([...steps.map((s, d) => ({ key: `d${d}`, midi: root + s })), { key: "d0", midi: root + 12 }], 230);
  const playTune = (tuneId: string) =>
    player.playTimed(melodyTiming(generateMelody(scalePool(root + 12, steps), steps)).map((n) => ({ key: `d${n.note.degree}`, midi: n.note.midi, ms: n.ms, velocity: n.velocity })), tuneId);

  return (
    <div className="landing-rise relative flex flex-col gap-4 rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-5" style={{ animationDelay: "120ms" }}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Key
          <select
            value={tonicIdx}
            onChange={(e) => setTonicIdx(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm font-semibold text-slate-100"
          >
            {KEYS.map((t, i) => (
              <option key={t.name} value={i}>{t.name}</option>
            ))}
          </select>
        </label>
        <div role="tablist" aria-label="Mode" className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 pb-0.5 scrollbar-none">
          {MODES.map((m, i) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={i === mode}
              onClick={() => setMode(i)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs transition desk:py-1 ${i === mode ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div key={mode} className="landing-fade flex flex-col gap-1">
        <p className="text-2xl leading-tight text-slate-100 sm:text-[1.7rem]" style={{ fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100' }}>
          {tonic.name} {mode === 0 || mode === 5 ? MODES[mode].toLowerCase() : MODES[mode]} <span className="italic text-sky-300">feels {info.mood.split(/[:;.]/)[0].replace(/^./, (c) => c.toLowerCase())}</span>
        </p>
        <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-400">
          {info.char}
          <span className="inline-flex items-center gap-1.5 text-sky-300"><Icon name="headphones" size={13} /> Tap any note to hear it</span>
        </p>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full select-none" role="img" aria-label={`${tonic.name} ${MODES[mode]} on the guitar neck, frets 0 to ${to}, each note coloured by its scale degree. Tap a note to hear it.`}>
        <defs>
          <linearGradient id="hero-board" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-slate-800)" />
            <stop offset="1" stopColor="var(--color-slate-900)" />
          </linearGradient>
        </defs>
        <rect x={NUT_X} y={TOP - 12} width={to * fw} height={5 * GAP + 24} rx={6} fill="url(#hero-board)" />
        {INLAYS.filter((f) => f <= to).map((f) => (
          <circle key={f} cx={fretX(f)} cy={TOP + 2.5 * GAP} r={5} fill="var(--color-slate-700)" />
        ))}
        {to >= 12 && [1.5, 3.5].map((k) => <circle key={k} cx={fretX(12)} cy={TOP + k * GAP} r={5} fill="var(--color-slate-700)" />)}
        {Array.from({ length: to }, (_, i) => (
          <line key={i} x1={NUT_X + (i + 1) * fw} x2={NUT_X + (i + 1) * fw} y1={TOP - 12} y2={boardBottom + 12} stroke="var(--color-slate-600)" strokeWidth={2} />
        ))}
        <rect x={NUT_X - 3} y={TOP - 12} width={6} height={5 * GAP + 24} rx={2} fill="var(--color-slate-300)" />
        {OPEN.map((_, row) => (
          <line key={row} x1={NUT_X / 2 - 6} x2={NUT_X + to * fw} y1={TOP + row * GAP} y2={TOP + row * GAP} stroke="var(--color-slate-400)" strokeOpacity={0.75} strokeWidth={0.9 + row * 0.38} />
        ))}
        {Array.from({ length: to + 1 }, (_, f) => (
          <text key={f} x={fretX(f)} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--color-slate-500)">{f}</text>
        ))}
        {dots.map((d) => {
          const on = lit(d);
          return (
            <g
              key={`${mode}-${tonic.pc}-${d.row}-${d.f}`}
              className="dot-pop cursor-sound"
              style={{ animationDelay: `${d.f * 22 + d.row * 8}ms` }}
              onClick={() => player.tap(`${d.row}-${d.f}`, d.midi)}
            >
              <title>{`${names[d.degree]} · ${labels[d.degree]}`}</title>
              {on && <circle cx={fretX(d.f)} cy={TOP + d.row * GAP} r={r + 6} fill={degreeColour(d.degree)} opacity={0.35} />}
              <circle
                cx={fretX(d.f)}
                cy={TOP + d.row * GAP}
                r={on ? r + 2 : r}
                fill={degreeColour(d.degree)}
                stroke={on ? "var(--color-sky-300)" : d.degree === 0 ? "var(--color-slate-50)" : "var(--color-slate-950)"}
                strokeWidth={on ? 3 : d.degree === 0 ? 2.4 : 1.4}
              />
              <text x={fretX(d.f)} y={TOP + d.row * GAP + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={labels[d.degree].length > 1 ? 10 : 12} fontWeight={700} fill={DOT_INK} pointerEvents="none">
                {labels[d.degree]}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((_, d) => (
          <button
            key={d}
            type="button"
            onClick={() => player.tap(`d${d}`, root + steps[d])}
            title={`${names[d]}: tap to hear it`}
            className={`cursor-sound flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-xs font-bold transition ${player.active === `d${d}` ? "scale-110 ring-2 ring-sky-300" : ""}`}
            style={{ background: degreeColour(d), color: DOT_INK }}
          >
            {names[d]}
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-slate-700 sm:block" />
        <button type="button" onClick={playScale} className="cursor-sound inline-flex items-center gap-1.5 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/25">
          <Icon name="play" size={12} fill /> Play scale
        </button>
        <TuneButton onPlay={playTune} title="A short tune in this mode, new every time" className="rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/25" />
        <Link href={scaleHref(page.slug, tonic.pc)} className="ml-auto text-xs text-sky-300 hover:text-sky-200">
          Open {tonic.name} {page.name} <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
