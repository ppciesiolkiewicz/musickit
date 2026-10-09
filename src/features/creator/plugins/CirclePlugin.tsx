"use client";

import { TONICS, tonicName } from "@/features/theory";
import { strum } from "@/features/sound";
import { useCreatorKey } from "../KeyProvider";
import { CIRCLE, fifthsPosition, keySignature } from "../model/key";
import { voice } from "../model/voicing";
import { Body, Hint } from "./common";

const R_OUT = 118, R_IN = 78, R_MID = 98;
const at = (pos: number, r: number) => {
  const a = (pos / 12) * Math.PI * 2 - Math.PI / 2;
  return { x: 150 + r * Math.cos(a), y: 150 + r * Math.sin(a) };
};

/**
 * The circle of fifths: majors outside, their relative minors inside. Click a key to choose it. With a key chosen, the three keys
 * next to its parent major (IV, I, V) and their relative minors (ii, vi, iii) are the chords of the key.
 */
export default function CirclePlugin() {
  const { ctx, choice, title, setKey } = useCreatorKey();
  const sig = keySignature(choice);
  const parentPos = ctx && choice.family === 0 ? fifthsPosition(TONICS.find((t) => t.name === ctx.parentTonic)?.pc ?? 0) : null;
  const minorish = !!ctx && ctx.steps[2] === 3;
  const near = (pos: number) => parentPos !== null && [0, 1, 11].includes((pos - parentPos + 12) % 12);

  const pick = (pc: number, minor: boolean) => {
    setKey({ tonicPc: pc, family: 0, mode: minor ? 5 : 0 });
    strum(voice(pc, minor ? "m" : ""), { gapMs: 60, holdMs: 1200 });
  };

  return (
    <Body title={ctx ? `Circle of fifths · ${title}` : "Circle of fifths"} general={!ctx}>
      {!ctx && <Hint>Click a key to choose it. Neighbours share almost all their notes.</Hint>}
      <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-[26rem] flex-1" role="group" aria-label="Circle of fifths">
        <circle cx="150" cy="150" r={R_OUT + 20} fill="none" stroke="#1e293b" />
        <circle cx="150" cy="150" r={R_IN - 22} fill="none" stroke="#1e293b" />
        {CIRCLE.map((t, pos) => {
          const out = at(pos, R_MID + 20), inn = at(pos, R_IN - 2 + 0);
          const minorPc = (t.pc + 9) % 12;
          const isTonicOut = ctx && !minorish && choice.tonicPc === t.pc;
          const isTonicIn = ctx && minorish && choice.tonicPc === minorPc;
          const hot = near(pos);
          return (
            <g key={t.pc}>
              <g role="button" tabIndex={0} aria-label={`${t.name} major`} aria-pressed={!!isTonicOut} onClick={() => pick(t.pc, false)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick(t.pc, false)} className="cursor-pointer outline-none focus-visible:[&>circle]:stroke-sky-400">
                <circle cx={out.x} cy={out.y} r={17} fill={isTonicOut ? "#0ea5e9" : hot ? "#1e3a5f" : "#0f172a"} stroke={isTonicOut ? "#e0f2fe" : hot ? "#38bdf8" : "#334155"} strokeWidth={isTonicOut ? 2 : 1} />
                <text x={out.x} y={out.y} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight={600} fill={isTonicOut ? "#082f49" : "#e2e8f0"}>{t.name}</text>
              </g>
              <g role="button" tabIndex={0} aria-label={`${tonicName(minorPc)} minor`} aria-pressed={!!isTonicIn} onClick={() => pick(minorPc, true)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick(minorPc, true)} className="cursor-pointer outline-none focus-visible:[&>circle]:stroke-sky-400">
                <circle cx={inn.x} cy={inn.y} r={13.5} fill={isTonicIn ? "#0ea5e9" : hot ? "#1e3a5f" : "#0f172a"} stroke={isTonicIn ? "#e0f2fe" : hot ? "#38bdf8" : "#334155"} strokeWidth={isTonicIn ? 2 : 1} />
                <text x={inn.x} y={inn.y} textAnchor="middle" dominantBaseline="central" fontSize="9.5" fill={isTonicIn ? "#082f49" : "#94a3b8"}>{tonicName(minorPc)}m</text>
              </g>
            </g>
          );
        })}
        <text x="150" y="146" textAnchor="middle" fontSize="13" fontWeight={600} fill="#e2e8f0">{ctx ? ctx.tonic.name : "Key"}</text>
        <text x="150" y="163" textAnchor="middle" fontSize="9" fill="#94a3b8">{sig ? (sig.kind === "none" ? "no ♯ ♭" : `${sig.count}${sig.kind === "sharps" ? "♯" : "♭"}`) : ctx ? ctx.modeName : "of fifths"}</text>
      </svg>
    </Body>
  );
}
