import { signatureGlyphs } from "@/features/theory/piano/staff";
import { signatureNotes, signatureText } from "@/features/theory/circle";
import { scaleSignature } from "@/features/theory/signature";
import type { KeyContext } from "@/features/theory/theory";

const HALF = 3.5; // px per staff step
const TOP = 12; // room above the top line for the clef's curl
const yOf = (step: number) => TOP + (8 - step) * HALF;

/** A small treble staff with just the clef and the sharps or flats, drawn like the theory piano's grand staff. */
function Staff({ count }: { count: number }) {
  const glyphs = signatureGlyphs(count, "treble");
  const w = 34 + Math.max(1, glyphs.length) * 8 + 6;
  return (
    <svg viewBox={`0 0 ${w} ${TOP + 8 * HALF + 10}`} width={w} height={TOP + 8 * HALF + 10} aria-hidden className="shrink-0">
      <g stroke="var(--color-slate-500)" strokeWidth={1}>
        {[0, 2, 4, 6, 8].map((s) => <line key={s} x1={1} x2={w - 1} y1={yOf(s)} y2={yOf(s)} />)}
      </g>
      <g fill="var(--color-slate-300)" textAnchor="middle">
        <text x={13} y={yOf(1) + 2} fontSize={36}>𝄞</text>
        {glyphs.map((g, i) => <text key={i} x={36 + i * 8} y={yOf(g.step) + 4} fontSize={13}>{g.glyph}</text>)}
      </g>
    </svg>
  );
}

/** The key signature a scale is written with, the keys that share it, and the notes written in as accidentals. */
export default function KeySignature({ ctx, className = "" }: { ctx: KeyContext; className?: string }) {
  const s = scaleSignature(ctx);
  const notes = signatureNotes(s.count);
  return (
    <div className={`flex items-center gap-2.5 ${className}`} aria-label={`Key signature: ${signatureText(s.count)}`}>
      <Staff count={s.count} />
      <div className="flex min-w-0 flex-col text-xs leading-snug text-slate-400">
        <span>
          Key signature <b className="text-slate-200">{signatureText(s.count)}</b>
          {notes.length > 0 && <span className="text-slate-500"> ({notes.join(" ")})</span>}
        </span>
        <span className="text-slate-500">
          as {s.major} major / {s.minor} minor
          {s.extras.length > 0 && <>, plus <b className="font-medium text-slate-300">{s.extras.join(" ")}</b> written in</>}
        </span>
      </div>
    </div>
  );
}
