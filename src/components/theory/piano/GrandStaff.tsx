"use client";

import { TRAIL_LENGTH, type Step } from "@/features/theory/piano/trail";
import { place, signatureGlyphs, type Clef } from "@/features/theory/piano/staff";

/**
 * A grand staff that shows what was just played: the key signature pinned on the left, the latest step at a fixed
 * "now" spot, the steps before it trailing off to the left and fading, a dashed line with the interval between
 * neighbours, and each step's note names with their degrees underneath.
 */

const W = 640;
const HALF = 4; // px per staff step (a line to the next space)
const BOTTOM: Record<Clef, number> = { treble: 128, bass: 208 }; // room above for ledger notes up to B7
const NOW_X = 460;
const SLOT = 100; // px between steps
const NAME_Y = 274;
const DEGREE_Y = 290;
const H = 302;
const OPACITY = [1, 0.75, 0.5, 0.3];

const yOf = (clef: Clef, step: number) => BOTTOM[clef] - step * HALF;
const ink = {
  line: "var(--color-slate-500)",
  glyph: "var(--color-slate-300)",
  note: "var(--color-amber-400)",
  interval: "var(--color-sky-400)",
  name: "var(--color-slate-200)",
  degree: "var(--color-slate-400)",
};

function StaffLines() {
  return (
    <g stroke={ink.line} strokeWidth={1}>
      {(["treble", "bass"] as Clef[]).flatMap((c) => [0, 2, 4, 6, 8].map((s) => <line key={`${c}${s}`} x1={14} x2={W - 8} y1={yOf(c, s)} y2={yOf(c, s)} />))}
      <line x1={14} x2={14} y1={yOf("treble", 8)} y2={yOf("bass", 0)} strokeWidth={1.5} />
      <path d={`M10 ${yOf("treble", 8)} Q2 ${(yOf("treble", 8) + yOf("bass", 0)) / 2 - 20} 9 ${(yOf("treble", 8) + yOf("bass", 0)) / 2} Q2 ${(yOf("treble", 8) + yOf("bass", 0)) / 2 + 20} 10 ${yOf("bass", 0)}`} fill="none" strokeWidth={2} />
    </g>
  );
}

function Signature({ signature }: { signature: number }) {
  return (
    <g fill={ink.glyph} fontSize={17} textAnchor="middle">
      <text x={34} y={yOf("treble", 1) + 3} fontSize={50}>𝄞</text>
      <text x={34} y={yOf("bass", 6) + 9} fontSize={34}>𝄢</text>
      {(["treble", "bass"] as Clef[]).flatMap((c) =>
        signatureGlyphs(signature, c).map((g, i) => (
          <text key={`${c}${i}`} x={62 + i * 9} y={yOf(c, g.step) + 5}>{g.glyph}</text>
        )),
      )}
    </g>
  );
}

/** One step: its noteheads (with ledger lines and accidentals), the interval line from the previous step, and its labels. */
function StepColumn({ step, pos, signature }: { step: StaffStep; pos: number; signature: number }) {
  const now = pos === 0;
  const notes = step.sounding.notes;
  const placed = notes.map((n) => place(n, signature));
  const r = now ? 6.5 : 5.5;
  // a second (two heads one step apart) puts the upper head on the other side of the stem
  const shift = placed.map((p, i) => (i > 0 && placed[i - 1].clef === p.clef && p.step - placed[i - 1].step === 1 ? 2 * r + 1 : 0));
  const lowY = yOf(placed[0].clef, placed[0].step);
  let accidentals = 0;
  return (
    <g style={{ transform: `translateX(${now ? NOW_X : NOW_X - pos * SLOT}px)`, opacity: OPACITY[pos] ?? 0.25, transition: "transform 280ms ease, opacity 280ms ease" }}>
      {step.interval && pos < TRAIL_LENGTH - 1 && (
        <g>
          <line x1={-SLOT + 8} y1={step.prevLowY ?? lowY} x2={-8} y2={lowY} stroke={ink.interval} strokeWidth={1.2} strokeDasharray="3 3" />
          <text x={-SLOT / 2} y={Math.min(step.prevLowY ?? lowY, lowY) - 8} textAnchor="middle" fontSize={now ? 13 : 11} fontWeight={now ? 700 : 500} fill={ink.interval}>{step.interval}</text>
        </g>
      )}
      {placed.map((p, i) => (
        <g key={`${notes[i].midi}`}>
          {p.ledgers.map((l) => <line key={l} x1={-r - 5} x2={r + 5 + shift[i]} y1={yOf(p.clef, l)} y2={yOf(p.clef, l)} stroke={ink.line} />)}
          {p.accidental && (
            <text x={-r - 7 - (accidentals++ % 2) * 9} y={yOf(p.clef, p.step) + 5} textAnchor="end" fontSize={15} fill={ink.note}>{p.accidental}</text>
          )}
          <ellipse cx={shift[i]} cy={yOf(p.clef, p.step)} rx={r} ry={r * 0.78} fill={ink.note} transform={`rotate(-20 ${shift[i]} ${yOf(p.clef, p.step)})`} />
        </g>
      ))}
      <text x={0} y={NAME_Y} textAnchor="middle" fontSize={now ? 13 : 11} fontWeight={now ? 700 : 400} fill={ink.name}>{notes.map((n) => n.name).join(" ")}</text>
      <text x={0} y={DEGREE_Y} textAnchor="middle" fontSize={now ? 13 : 11} fontWeight={now ? 700 : 400} fill={now ? ink.note : ink.degree}>{notes.map((n) => n.degree).join(" ")}</text>
    </g>
  );
}

export interface StaffStep extends Step {
  /** where the previous step's lowest note sits, for the interval line (set by GrandStaff) */
  prevLowY?: number;
}

export default function GrandStaff({ steps, signature, tonic, numerals }: { steps: Step[]; signature: number; tonic: string; numerals: boolean }) {
  const withPrev: StaffStep[] = steps.map((s, i) => {
    const prev = steps[i - 1];
    if (!prev) return s;
    const p = place(prev.sounding.notes[0], signature);
    return { ...s, prevLowY: yOf(p.clef, p.step) };
  });
  const now = steps[steps.length - 1];
  const chord = now?.sounding.chord;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={now ? `Now: ${now.sounding.notes.map((n) => n.name).join(", ")}${chord ? `, ${chord.symbol}` : ""}` : "Grand staff, nothing played yet"}>
      <rect x={NOW_X - 26} y={4} width={52} height={H - 8} rx={8} fill="var(--color-amber-400)" fillOpacity={0.06} stroke="var(--color-amber-400)" strokeOpacity={0.35} />
      <text x={NOW_X} y={NAME_Y - 18} textAnchor="middle" fontSize={8} letterSpacing={1} fill="var(--color-amber-300)">NOW</text>
      <StaffLines />
      <Signature signature={signature} />
      {withPrev.map((s, i) => <StepColumn key={s.id} step={s} pos={steps.length - 1 - i} signature={signature} />)}
      {!now && <text x={NOW_X} y={yOf("treble", 4) + 4} textAnchor="middle" fontSize={11} fill={ink.degree}>play a note</text>}
      {now && (chord || now.sounding.dyad) && (
        <g>
          <rect x={NOW_X + 32} y={yOf("treble", 4) - 22} width={W - NOW_X - 40} height={chord?.alt ? 62 : 46} rx={6} fill="var(--color-slate-950)" fillOpacity={0.85} />
          <text x={NOW_X + 40} y={yOf("treble", 4)} fontSize={18} fontWeight={700} fill="var(--color-slate-50)">{chord ? chord.symbol : now.sounding.notes.map((n) => n.name).join(" + ")}</text>
          <text x={NOW_X + 40} y={yOf("treble", 4) + 17} fontSize={11} fill={ink.interval}>
            {chord ? (numerals && chord.numeral ? `${chord.numeral} in ${tonic}` : "") : now.sounding.dyad}
          </text>
          {chord?.alt && <text x={NOW_X + 40} y={yOf("treble", 4) + 32} fontSize={10} fill={ink.degree}>or {chord.alt}</text>}
        </g>
      )}
    </svg>
  );
}
