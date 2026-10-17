"use client";

import { useState } from "react";
import MiniPiano from "./MiniPiano";
import NoteNeck, { type NeckDot } from "./NoteNeck";
import { INTERVALS, describeMove, intervalPositions, pianoFrom } from "@/lib/chordKit/intervals";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { playMelody, strum } from "@/features/sound";
import { Chip, ChipRow, Stepper } from "@/components/ui";

const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const STRINGS = ["E", "A", "D", "G", "B"];
const ROOT = "#f8fafc", TARGET = "#f59e0b", OTHER = "#38bdf8";
const NATURALS = [0, 2, 4, 5, 7, 9, 11];

const card = "rounded-2xl border border-slate-800 bg-slate-900/40 p-4";

/** Natural notes on the low E string next to the white keys of a piano. */
function Naturals() {
  const dots: NeckDot[] = [];
  for (let f = 0; f <= 12; f++) {
    const pc = (OPEN_MIDI[0] + f) % 12;
    if (NATURALS.includes(pc)) dots.push({ string: 0, fret: f, label: NAMES[pc], fill: pc === 4 ? ROOT : OTHER });
  }
  return (
    <section className={card}>
      <h2 className="mb-2 text-base font-medium text-slate-100">Strings, frets and notes</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 text-sm text-slate-300">
          <p>The six strings, low to high, are <b className="text-slate-100">E A D G B e</b>. A common memory line: <i>Eddie Ate Dynamite, Good Bye Eddie</i>.</p>
          <p><b className="text-slate-100">One fret is one semitone</b>, the same step as one key to the next on a piano (white or black). Twelve frets up, the string plays its own note an octave higher, which is why the 12th fret has two dots.</p>
          <p>The natural notes are the white keys: C D E F G A B. Between most of them there is a sharp (a black key, one fret). Between <b className="text-slate-100">E–F</b> and <b className="text-slate-100">B–C</b> there is none: they sit one fret apart. Learn that and you can name every fret by counting from the open string.</p>
        </div>
        <div className="space-y-2">
          <MiniPiano lit={NATURALS.map((pc) => ({ midi: 48 + pc, label: NAMES[pc], colour: pc === 4 ? ROOT : OTHER }))} octaves={1} />
          <NoteNeck to={12} dots={dots} compact />
          <p className="text-xs text-slate-500">The natural notes on the low E string. E–F and B–C are next to each other; every other pair has a fret between.</p>
        </div>
      </div>
    </section>
  );
}

/** Pick an interval and a start note: see it on the piano, then every way to play it on the guitar. */
function IntervalViewer({ semis, setSemis }: { semis: number; setSemis: (n: number) => void }) {
  const [string, setString] = useState(1);
  const [fret, setFret] = useState(3);
  const info = INTERVALS.find((i) => i.semis === semis)!;
  const startMidi = OPEN_MIDI[string] + fret;
  const pos = intervalPositions(string, fret, semis, 15);
  const crossesGB = pos.some((p) => p.gb);
  const play = () => {
    playMelody([startMidi, startMidi + semis], 450);
    setTimeout(() => strum([startMidi, startMidi + semis], { gapMs: 0, holdMs: 1200 }), 1000);
  };
  const dots: NeckDot[] = [
    { string, fret, label: "R", fill: ROOT, big: true },
    ...pos.map((p): NeckDot => ({ string: p.string, fret: p.fret, label: info.short, fill: TARGET, outline: p.strings > 0 })),
  ];
  return (
    <section className={card} id="intervals">
      <h2 className="mb-2 text-base font-medium text-slate-100">Intervals: piano → guitar</h2>
      <div className="flex flex-col gap-2">
        <ChipRow label="Interval">
          {INTERVALS.map((i) => <Chip key={i.semis} on={i.semis === semis} onClick={() => setSemis(i.semis)} title={i.name}>{i.short}</Chip>)}
        </ChipRow>
        <ChipRow label="Start string">
          {STRINGS.map((s, i) => <Chip key={s} on={i === string} onClick={() => setString(i)}>{s}</Chip>)}
        </ChipRow>
        <div className="flex flex-wrap items-center gap-3">
          <Stepper label="Start fret" value={`fret ${fret} · ${NAMES[startMidi % 12]}`} onDec={() => setFret((f) => Math.max(0, f - 1))} onInc={() => setFret((f) => Math.min(7, f + 1))} decDisabled={fret <= 0} incDisabled={fret >= 7} />
          <button type="button" onClick={play} className="rounded-lg border border-sky-500/60 px-3 py-1 text-sm text-sky-200 hover:bg-sky-500/10">▶ Hear it</button>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        <b className="text-slate-100">{info.name}</b> = {semis} semitone{semis === 1 ? "" : "s"} = {semis} fret{semis === 1 ? "" : "s"} up the same string. Sounds like the start of <i>{info.song}</i>.
      </p>
      <div className="mt-2 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <MiniPiano from={pianoFrom([startMidi, startMidi + semis])} lit={[{ midi: startMidi, label: "R", colour: ROOT }, { midi: startMidi + semis, label: info.short, colour: TARGET }]} />
        <div className="overflow-x-auto"><NoteNeck to={15} dots={dots} /></div>
      </div>
      <ul className="mt-2 space-y-0.5 text-sm text-slate-300">
        {pos.map((p) => (
          <li key={`${p.string}-${p.fret}`} className="flex flex-wrap gap-x-3"><span className="w-36 shrink-0 whitespace-nowrap text-slate-500">{STRINGS[p.string] ?? "e"} string, fret {p.fret}</span><span>{describeMove(p)}</span></li>
        ))}
      </ul>
      {crossesGB && (
        <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">
          The G and B strings are tuned a major 3rd apart (4 frets), every other pair a perfect 4th (5 frets). So any shape that crosses from G to B moves one fret further up than the same shape lower down.
        </p>
      )}
    </section>
  );
}

const JUMPS = [
  { semis: 2, title: "Major 2nd: the step", text: "Two frets on one string. It is the distance between most neighbouring notes of a scale, so scale runs are mostly 2-fret steps with the odd 1-fret one. Across strings it is three frets back on the next string, which you rarely need." },
  { semis: 7, title: "Perfect 5th: the power chord", text: "Seven frets on one string, or the next string up and two frets up. That second shape is the power chord (root plus 5th). It works from any string except across G–B, where it becomes the next string and three frets up." },
  { semis: 12, title: "Octave: the same note higher", text: "Twelve frets on one string. Across strings there are two shapes to know: two strings over and two frets up (from the E, A strings), or three strings over and three frets back. Crossing G–B shifts either shape up one fret. Octave shapes are how you find a note everywhere on the neck." },
];

/** The Guitar basics article. `initialInterval` comes from ?interval= so the ear trainer can link straight to an interval. */
export default function BasicsArticle({ initialInterval = 7 }: { initialInterval?: number }) {
  const [semis, setSemis] = useState(initialInterval);
  const show = (n: number) => {
    setSemis(n);
    document.getElementById("intervals")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="flex flex-col gap-4">
      <Naturals />
      <IntervalViewer semis={semis} setSemis={setSemis} />
      <section className={card}>
        <h2 className="mb-2 text-base font-medium text-slate-100">Jumps worth knowing</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {JUMPS.map((j) => (
            <div key={j.semis} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">
              <h3 className="mb-1 font-medium text-slate-100">{j.title}</h3>
              <p>{j.text}</p>
              <button type="button" onClick={() => show(j.semis)} className="mt-2 text-xs text-sky-300 hover:underline">Show it on the neck →</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
