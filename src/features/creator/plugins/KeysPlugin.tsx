"use client";

import { degreeColour, scaleToneLabel } from "@/features/theory";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { playSequence } from "@/features/sound";
import { useCreatorKey } from "../KeyProvider";
import { Body, Hint } from "./common";

const START = 48; // C3
const OCTAVES = 3;
const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }; // semitone -> white key it sits after

const KW = 22, KH = 100, BW = 13, BH = 62;

/** A piano with the scale marked on it: each note of the key in its degree colour. Click a key to hear it. */
export default function KeysPlugin() {
  const { ctx, title } = useCreatorKey();
  const [system] = useLabelSystem();
  const whites: { midi: number; x: number }[] = [];
  const blacks: { midi: number; x: number }[] = [];
  for (let o = 0; o < OCTAVES; o++) {
    WHITE.forEach((s, i) => whites.push({ midi: START + o * 12 + s, x: (o * 7 + i) * KW }));
    Object.entries(BLACK).forEach(([s, w]) => blacks.push({ midi: START + o * 12 + Number(s), x: (o * 7 + w) * KW + KW - BW / 2 }));
  }
  const width = OCTAVES * 7 * KW;
  const degreeOf = (midi: number) => {
    if (!ctx) return -1;
    const rel = (((midi - ctx.tonic.pc) % 12) + 12) % 12;
    return ctx.steps.indexOf(rel);
  };
  const nameOf = (midi: number, deg: number) => (ctx && deg >= 0 ? ctx.names[deg] : ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][midi % 12]);
  const play = (midi: number) => playSequence([{ note: midi, at: 0, hold: 700 }]);
  const key = (k: { midi: number; x: number }, black: boolean) => {
    const deg = degreeOf(k.midi);
    const w = black ? BW : KW, h = black ? BH : KH;
    return (
      <g key={k.midi} role="button" tabIndex={0} aria-label={nameOf(k.midi, deg)} onPointerDown={() => play(k.midi)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && play(k.midi)} className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-sky-400">
        <rect x={k.x} y={0} width={w} height={h} rx={2} fill={black ? "#0b1220" : "#e2e8f0"} stroke={black ? "#334155" : "#64748b"} strokeWidth={1} />
        {deg >= 0 && <circle cx={k.x + w / 2} cy={h - 12} r={black ? 4.5 : 6.5} fill={degreeColour(deg)} stroke="#0f172a" />}
        {deg >= 0 && !black && <text x={k.x + w / 2} y={h - 26} textAnchor="middle" fontSize="7.5" fill="#334155">{ctx ? scaleToneLabel(system, ctx, deg) : nameOf(k.midi, deg)}</text>}
        {!ctx && !black && k.midi % 12 === 0 && <text x={k.x + w / 2} y={h - 8} textAnchor="middle" fontSize="8" fill="#475569">C{Math.floor(k.midi / 12) - 1}</text>}
      </g>
    );
  };
  return (
    <Body title={ctx ? `Keys · ${title}` : "Keys"} general={!ctx}>
      {!ctx && <Hint>Pick a key above to mark its scale on the keyboard. Click any key to hear it.</Hint>}
      <svg viewBox={`0 0 ${width} ${KH}`} className="w-full" role="group" aria-label="Piano keyboard">
        {whites.map((k) => key(k, false))}
        {blacks.map((k) => key(k, true))}
      </svg>
    </Body>
  );
}
