"use client";

/** A small two-octave keyboard (C3 to B4 by default) that lights given keys. Used to show what an interval or a note looks like on a piano. */
export interface LitKey { midi: number; label: string; colour: string }

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }; // black pc -> index of the white key on its left

export default function MiniPiano({ lit, from = 48, octaves = 2, onKey }: { lit: LitKey[]; from?: number; octaves?: number; onKey?: (midi: number) => void }) {
  const ww = 22, wh = 84, bw = 14, bh = 52;
  const whites: number[] = [];
  const blacks: { midi: number; x: number }[] = [];
  for (let o = 0; o < octaves; o++) {
    WHITE_PCS.forEach((pc) => whites.push(from + o * 12 + pc));
    Object.entries(BLACK_AFTER).forEach(([pc, wi]) => blacks.push({ midi: from + o * 12 + Number(pc), x: (o * 7 + wi + 1) * ww - bw / 2 }));
  }
  const W = whites.length * ww + 1;
  const litAt = (m: number) => lit.find((k) => k.midi === m);
  const key = (m: number, x: number, w: number, h: number, black: boolean) => {
    const l = litAt(m);
    return (
      <g key={m} onClick={onKey ? () => onKey(m) : undefined} className={onKey ? "cursor-sound" : undefined}>
        <rect x={x} y={0} width={w} height={h} rx={3} fill={l ? l.colour : black ? "#1e293b" : "#f1f5f9"} stroke="#334155" strokeWidth={1} />
        {l && <text x={x + w / 2} y={h - 8} textAnchor="middle" fontSize={black ? 8 : 10} fontWeight={700} fill="#0f172a">{l.label}</text>}
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${wh + 1}`} width="100%" style={{ maxWidth: W * 1.6 }} role="img" aria-label="Piano keyboard">
      {whites.map((m, i) => key(m, i * ww + 0.5, ww, wh, false))}
      {blacks.map((b) => key(b.midi, b.x, bw, bh, true))}
    </svg>
  );
}
