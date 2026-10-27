"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import {
  CIRCLE, MAJOR, chordsInScaleOrder, circleChords, fifthsPosition, keyName, majorSignature, neighbours, relativeMajor, relativeMinor,
  rotate, signatureNotes, signatureText, tonicName, type CircleChord, type CircleKey,
} from "@/features/theory";
import { playMelody, strum } from "@/features/sound";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { Info } from "@/components/ui";

const C = 200;
const R_MAJ = 160, R_MIN = 118, R_DIM = 80, R_SIG = 192;
const at = (pos: number, r: number) => {
  const a = (pos / 12) * Math.PI * 2 - Math.PI / 2;
  // rounded so the server and the browser print the same numbers (hydration)
  return { x: Math.round((C + r * Math.cos(a)) * 100) / 100, y: Math.round((C + r * Math.sin(a)) * 100) / 100 };
};
/** A ring slice covering positions from-to (in twelfths), between two radii. */
function slice(from: number, to: number, r0: number, r1: number) {
  const a = at(from, r1), b = at(to, r1), c = at(to, r0), d = at(from, r0);
  const big = to - from > 6 ? 1 : 0;
  return `M${a.x} ${a.y} A${r1} ${r1} 0 ${big} 1 ${b.x} ${b.y} L${c.x} ${c.y} A${r0} ${r0} 0 ${big} 0 ${d.x} ${d.y} Z`;
}

const THIRDS = { maj: [4, 7], min: [3, 7], dim: [3, 6] } as const;
/** Root in the octave below middle C, then the third, fifth and the root on top. */
export function playChord(rootPc: number, quality: CircleChord["quality"]) {
  const r = 48 + rootPc;
  strum([r, r + THIRDS[quality][0], r + THIRDS[quality][1], r + 12], { gapMs: 60, holdMs: 1300 });
}
function playScale(k: CircleKey) {
  const steps = k.minor ? rotate(MAJOR, 5) : MAJOR;
  const r = 60 + k.pc - (k.pc > 6 ? 12 : 0);
  playMelody([...steps.map((s) => r + s), r + 12], 300);
}

const btn = "rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/**
 * The circle of fifths in full: majors outside with their key signatures, relative minors inside, diminished chords in the middle.
 * Choosing a key lights its seven chords and lists its signature, relatives and neighbours. Controlled: the caller keeps the key.
 */
export default function CircleOfFifths({ value, onChange }: { value: CircleKey | null; onChange: (k: CircleKey) => void }) {
  const chords = useMemo(() => (value ? circleChords(value) : []), [value]);
  const inKey = (ring: CircleChord["ring"], pos: number) => chords.find((c) => c.ring === ring && c.pos === pos);
  const majorPc = value ? (value.minor ? relativeMajor(value.pc) : value.pc) : null;
  const centrePos = majorPc === null ? null : fifthsPosition(majorPc);
  const sig = majorPc === null ? 0 : majorSignature(majorPc);
  const pick = (k: CircleKey) => {
    onChange(k);
    playChord(k.pc, k.minor ? "min" : "maj");
  };

  const node = (key: string, x: number, y: number, r: number, label: string, sub: string | undefined, chord: CircleChord | undefined, tonic: boolean, onPick: (() => void) | null, aria: string, size: number) => (
    <g key={key} role={onPick ? "button" : undefined} tabIndex={onPick ? 0 : undefined} aria-label={aria} aria-pressed={onPick ? tonic : undefined}
      onClick={onPick ?? (chord ? () => playChord(chord.rootPc, chord.quality) : undefined)}
      onKeyDown={(e) => onPick && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick())}
      className={`${onPick || chord ? "cursor-pointer" : ""} outline-none focus-visible:[&>circle]:stroke-sky-400`}>
      <circle cx={x} cy={y} r={r} fill={tonic ? "var(--color-sky-500)" : chord ? "#1e3a5f" : "var(--color-slate-900)"} stroke={tonic ? "var(--color-sky-100)" : chord ? "var(--color-sky-400)" : "var(--color-slate-700)"} strokeWidth={tonic ? 2 : 1} />
      <text x={x} y={sub ? y - size * 0.35 : y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={600} fill={tonic ? "#082f49" : "var(--color-slate-100)"}>{label}</text>
      {sub && <text x={x} y={y + size * 0.65} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.7} fill={tonic ? "#082f49" : "var(--color-sky-200)"}>{sub}</text>}
    </g>
  );

  return (
    <div className="@container">
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <svg viewBox="0 0 400 400" className="mx-auto w-full max-w-[36rem]" role="group" aria-label="Circle of fifths">
          {[R_MAJ + 22, R_MIN + 20, R_DIM + 16].map((r) => <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="var(--color-slate-800)" />)}
          {centrePos !== null && <path d={slice(centrePos - 1.5, centrePos + 1.5, R_DIM - 16, R_MAJ + 22)} fill="var(--color-sky-500)" fillOpacity={0.08} stroke="var(--color-sky-500)" strokeOpacity={0.35} />}
          {CIRCLE.map((t, pos) => {
            const minorPc = relativeMinor(t.pc), dimPc = (t.pc + 11) % 12;
            const o = at(pos, R_MAJ), m = at(pos, R_MIN), d = at(pos, R_DIM), s = at(pos, R_SIG);
            const n = majorSignature(t.pc);
            const cMaj = inKey("major", pos), cMin = inKey("minor", pos), cDim = inKey("dim", pos);
            return (
              <g key={t.pc}>
                <text x={s.x} y={s.y} textAnchor="middle" dominantBaseline="central" fontSize="10" fill={n === sig && centrePos === pos ? "var(--color-sky-200)" : "var(--color-slate-500)"}>{n === 0 ? "–" : signatureText(n)}</text>
                {node(`M${t.pc}`, o.x, o.y, 20, t.name, cMaj?.roman, cMaj, !!value && !value.minor && value.pc === t.pc, () => pick({ pc: t.pc, minor: false }), `${t.name} major`, 13)}
                {node(`m${t.pc}`, m.x, m.y, 17, `${tonicName(minorPc)}m`, cMin?.roman, cMin, !!value && value.minor && value.pc === minorPc, () => pick({ pc: minorPc, minor: true }), `${tonicName(minorPc)} minor`, 10)}
                {node(`d${t.pc}`, d.x, d.y, 12, `${tonicName(dimPc)}°`, undefined, cDim, false, null, `${tonicName(dimPc)} diminished${cDim ? `, ${cDim.roman}` : ""}`, 8)}
              </g>
            );
          })}
          <text x={C} y={C - 8} textAnchor="middle" fontSize="15" fontWeight={600} fill="var(--color-slate-100)">{value ? `${tonicName(value.pc)}${value.minor ? "m" : ""}` : "Pick a key"}</text>
          <text x={C} y={C + 12} textAnchor="middle" fontSize="10" fill="var(--color-slate-400)">{value ? signatureText(sig) : "majors outside, minors inside"}</text>
        </svg>

        <div className="flex flex-col gap-3 text-sm text-slate-300">
          {value ? <KeyDetails value={value} sig={sig} onChange={pick} /> : <p className="text-slate-400">Click a key on the circle: a major on the outer ring or a minor on the inner one.</p>}
          <section className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-400">
            <h3 className="text-sm font-medium text-slate-100">How to read it</h3>
            <p><b className="text-slate-200">Clockwise</b> each key is a fifth higher and adds one sharp (or drops a flat). <b className="text-slate-200">Anticlockwise</b> is a fourth higher and adds a flat.</p>
            <p><b className="text-slate-200">Rings.</b> Each major shares its notes with the minor inside it (its relative minor) and the diminished chord on its 7th.</p>
            <p><b className="text-slate-200">The chords of a key</b> are the lit slice: three majors side by side (IV I V), the three minors under them (ii vi iii) and one diminished (vii°).</p>
            <p><b className="text-slate-200">Neighbours</b> differ by one note, so modulating one step round sounds smooth. Moving anticlockwise is resolving: V to I, and ii V I walks two steps home.</p>
            <p><b className="text-slate-200">Secondary dominants.</b> The major one step clockwise of any chord is its dominant (V of V: D to G in C major).</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function KeyDetails({ value, sig, onChange }: { value: CircleKey; sig: number; onChange: (k: CircleKey) => void }) {
  const chords = chordsInScaleOrder(value);
  const nb = neighbours(value);
  const relative: CircleKey = value.minor ? { pc: relativeMajor(value.pc), minor: false } : { pc: relativeMinor(value.pc), minor: true };
  const parallel: CircleKey = { pc: value.pc, minor: !value.minor };
  const notes = signatureNotes(sig);
  const go = (label: string, k: CircleKey) => (
    <button type="button" className={btn} onClick={() => onChange(k)}><span className="text-slate-500">{label}</span> {keyName(k)}</button>
  );
  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-medium text-slate-100">{keyName(value)}</h3>
        <button type="button" className={`cursor-pointer ${btn} ml-auto inline-flex items-center gap-1`} onClick={() => playScale(value)} aria-label={`Play the ${keyName(value)} scale`}><Icon name="play" size={12} fill />Scale</button>
      </div>
      <p className="text-xs text-slate-400">
        <b className="text-slate-200">Key signature</b> {sig === 0 ? "no sharps or flats" : `${Math.abs(sig)} ${sig > 0 ? "sharp" : "flat"}${Math.abs(sig) === 1 ? "" : "s"}: ${notes.join(" ")}`}
        <Info label="Order of sharps and flats">Sharps are always added in the order F C G D A E B (each a fifth above the last); flats in the reverse order B E A D G C F. A key with three sharps has the first three: F♯ C♯ G♯.</Info>
      </p>
      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">Chords of the key · click to hear</div>
        <ul className="grid grid-cols-4 gap-1 sm:grid-cols-7 @3xl:grid-cols-4">
          {chords.map((c) => (
            <li key={c.roman}>
              <button type="button" onClick={() => playChord(c.rootPc, c.quality)} className={`cursor-pointer flex w-full flex-col items-center rounded-lg border px-1 py-1 ${c.roman === "I" || c.roman === "i" ? "border-sky-500/60 bg-sky-500/10" : "border-slate-800 bg-slate-950/50"} hover:border-sky-500/60`}>
                <span className="text-[11px] text-slate-500">{c.roman}</span>
                <span className="text-sm font-medium text-slate-100">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {go(value.minor ? "Relative major" : "Relative minor", relative)}
        {go("Parallel", parallel)}
        {go("Dominant (V)", nb.dominant)}
        {go("Subdominant (IV)", nb.subdominant)}
      </div>
    </section>
  );
}

/** The circle page: the circle holding its own key, starting on C major. */
export function CircleOfFifthsPage() {
  const [k, setK] = useState<CircleKey | null>({ pc: DEFAULT_KEY_PC, minor: false });
  return <CircleOfFifths value={k} onChange={setK} />;
}
