"use client";

import { useCallback, useMemo, useState } from "react";
import ExerciseTool from "@/features/plan/ui/ExerciseTool";
import { parseTool } from "@/features/plan/model/tools";
import { makeKeyContext } from "@/features/theory/theory";
import { BOOK } from "@/features/theory/singingMelodies";

type Kind = "interval" | "melody" | "arpeggio";
type Level = 0 | 1 | 2;

const KINDS: { id: Kind; label: string }[] = [
  { id: "interval", label: "Intervals" },
  { id: "melody", label: "Tunes" },
  { id: "arpeggio", label: "Arpeggios" },
];
const LEVELS = ["Easy", "Medium", "Hard"];
/** the shape's key spelling, with the name shown on the chip and the pitch class */
const KEYS = [
  { id: "c", name: "C", pc: 0 }, { id: "d-flat", name: "D♭", pc: 1 }, { id: "d", name: "D", pc: 2 }, { id: "e-flat", name: "E♭", pc: 3 },
  { id: "e", name: "E", pc: 4 }, { id: "f", name: "F", pc: 5 }, { id: "f-sharp", name: "F♯", pc: 6 }, { id: "g", name: "G", pc: 7 },
  { id: "a-flat", name: "A♭", pc: 8 }, { id: "a", name: "A", pc: 9 }, { id: "b-flat", name: "B♭", pc: 10 }, { id: "b", name: "B", pc: 11 },
];
/** the keys an easy exercise picks from: open-string keys */
const EASY_KEYS = ["c", "g", "d", "a", "e"];

type IntervalName = "2nd" | "3rd" | "4th" | "5th" | "6th" | "7th" | "octave";
const NEXT = ["65", "54", "43", "21"];
const TWO_OVER = ["64", "53", "42", "31"];
const ONE = ["66", "55", "44", "33", "22", "11"];
/** per level: the intervals and the string pairs each may sit on */
const INTERVALS: Record<Level, { iv: IntervalName; strings: string[] }[]> = {
  0: [{ iv: "octave", strings: ["64", "53"] }, { iv: "5th", strings: NEXT.slice(0, 3) }],
  1: [{ iv: "3rd", strings: [...NEXT, ...ONE] }, { iv: "4th", strings: NEXT }, { iv: "6th", strings: TWO_OVER }, { iv: "5th", strings: TWO_OVER }, { iv: "octave", strings: ["63", "52", "41"] }],
  2: [{ iv: "2nd", strings: [...NEXT, ...ONE] }, { iv: "7th", strings: TWO_OVER }, { iv: "6th", strings: NEXT }, { iv: "3rd", strings: ONE }, { iv: "4th", strings: ["42", "31"] }],
};
/** progressions as scale degrees (0 = I) */
const PROGRESSIONS: Record<Level, number[][]> = {
  0: [[0, 4], [0, 3], [0, 5, 3, 4]],
  1: [[0, 5, 3, 4], [0, 4, 5, 3], [5, 3, 0, 4], [0, 3, 4, 0]],
  2: [[1, 4, 0, 0], [0, 5, 1, 4], [0, 2, 5, 3], [3, 4, 2, 5]],
};
const BPM: Record<Level, number> = { 0: 60, 1: 72, 2: 90 };

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const ascii = (s: string) => s.replace(/♯/g, "#").replace(/♭/g, "b");

interface Made { label: string; props: Record<string, unknown> }

function make(kind: Kind, level: Level, keyId: string | null): Made {
  const key = KEYS.find((k) => k.id === (keyId ?? pick(level === 0 ? EASY_KEYS : KEYS.map((k) => k.id))))!;
  const bpm = BPM[level];
  if (kind === "interval") {
    const ivs = level === 2 ? [pick(INTERVALS[2]), pick(INTERVALS[1])] : [pick(INTERVALS[level])];
    const strings = pick(ivs[0].strings);
    const shape = {
      shape: "interval", key: key.id, intervals: [...new Set(ivs.map((i) => i.iv))], strings,
      direction: level === 0 ? "up" : "both", to: level === 0 ? 7 : 12,
    };
    return { label: `${ivs.map((i) => i.iv).join(" and ")} in ${key.name}, strings ${strings[0]} and ${strings[1]}`, props: { shape, bpm } };
  }
  if (kind === "melody") {
    const tunes = BOOK.filter((t) => t.difficulty === level && !t.stage.title.toLowerCase().includes("run"));
    const tune = pick(tunes.length ? tunes : BOOK);
    return { label: `Tune ${tune.n} in ${key.name}`, props: { shape: { shape: "melody", tune: tune.n, key: key.id }, bpm } };
  }
  const ctx = makeKeyContext(key.pc, 0, 0);
  const degs = pick(PROGRESSIONS[level]);
  const chords = degs.map((d) => ascii(level === 2 ? ctx.chords[d].seventhName : ctx.chords[d].triadName));
  const degrees = level === 0 ? ["1", "3"] : level === 1 ? ["1", "3", "5"] : ["1", "3", "5", "7"];
  return {
    label: `${chords.join(" ")} arpeggios`,
    props: { shape: { shape: "arpeggio-part", key: key.id, chords, degrees, bars: chords.length * (level === 0 ? 2 : 1) }, bpm },
  };
}

/** Tries a few times: a generated set-up that doesn't parse (an interval that doesn't fit its strings) is drawn again. */
function generate(kind: Kind, level: Level, keyId: string | null): { label: string; tool: NonNullable<ReturnType<typeof parseTool>> } | null {
  for (let i = 0; i < 30; i++) {
    const m = make(kind, level, keyId);
    const tool = parseTool({ type: "guitar-play-along", ...m.props });
    if (tool) return { label: m.label, tool };
  }
  return null;
}

function Chips<T extends string | number>({ label, items, value, onPick }: { label: string; items: { id: T; label: string }[]; value: T; onPick: (id: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-16 text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <button
            key={String(it.id)}
            type="button"
            role="radio"
            aria-checked={it.id === value}
            onClick={() => onPick(it.id)}
            className={`rounded-full border px-3 py-1 text-sm transition ${it.id === value ? "border-sky-400 bg-sky-500/15 text-sky-100" : "border-slate-600 text-slate-300 hover:border-slate-400"}`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The play-along page's own set-up: pick what to play, a level and a key (or any key), and the app draws a new exercise
 * each time New exercise is pressed. Any choice change draws a new one straight away.
 */
export default function PlayAlongGenerator() {
  const [kind, setKind] = useState<Kind>("interval");
  const [level, setLevel] = useState<Level>(0);
  const [keyId, setKeyId] = useState<string>("any");
  const [seed, setSeed] = useState(0);

  // seed is in the deps so New exercise draws again
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const made = useMemo(() => generate(kind, level, keyId === "any" ? null : keyId), [kind, level, keyId, seed]);
  const tool = made?.tool;
  const again = useCallback(() => setSeed((s) => s + 1), []);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
        <Chips label="Play" items={KINDS} value={kind} onPick={setKind} />
        <Chips label="Level" items={LEVELS.map((l, i) => ({ id: i as Level, label: l }))} value={level} onPick={setLevel} />
        <Chips label="Key" items={[{ id: "any", label: "Any" }, ...KEYS.map((k) => ({ id: k.id, label: k.name }))]} value={keyId} onPick={setKeyId} />
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" onClick={again} className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-medium text-slate-950 hover:bg-sky-400">
            New exercise
          </button>
          {made && <span className="text-sm text-slate-300">{made.label}</span>}
        </div>
      </div>
      {tool ? (
        <ExerciseTool key={`${kind}:${level}:${keyId}:${seed}`} tool={tool} />
      ) : (
        <p className="text-sm text-amber-300">No exercise fits these choices. Pick another key or level.</p>
      )}
    </section>
  );
}
