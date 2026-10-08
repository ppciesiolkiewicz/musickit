"use client";

import { useRef } from "react";
import { HUES, swatchFor } from "./palette";
import { Chip, Info } from "./ui";
import { FAMILIES, shortModeName, type DegreeChord, type KeyContext, type TriadQuality } from "@/lib/chordKit/theory";
import { chordMidi } from "@/lib/chordKit/scales";
import { strum } from "@/lib/chordKit/playback";

const HUE_OF: Record<TriadQuality, keyof typeof HUES> = { maj: "amber", min: "blue", dim: "coral", aug: "purple", other: "blue" };
const ANGLES = [0, 90, 180, 270];
const cellW = 420, cellH = 490, cx = 210, cy = 282, hubR = 44, nodeR = 30, leafR = 34, R1 = 88, R2 = 170, spread = 16;
const polar = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
};
const fontFor = (t: string) => (t.length > 9 ? 8.5 : t.length > 7 ? 9.5 : t.length > 5 ? 10.5 : 11.5);

function Bubble({ ctx, ch, onPlay }: { ctx: KeyContext; ch: DegreeChord; onPlay: () => void }) {
  const hue = HUES[HUE_OF[ch.tri]];
  const degMode = shortModeName(FAMILIES[ctx.familyIndex].names[(ctx.modeIndex + ch.degree) % 7]);
  const lineCol = hue.line;
  return (
    <svg viewBox={`0 0 ${cellW} ${cellH}`} width="100%" role="img" aria-label={`${ch.seventhName}: sus and extension chords reachable from ${ch.triadName}`}>
      <text x={cx} y={20} textAnchor="middle" fontSize={13} fontWeight={500} fill="#cbd5e1">{ch.root} {degMode}</text>
      {ch.formula.map((lab, i) => {
        const sw = swatchFor(lab);
        const px = cx + (i - 1.5) * 32;
        return (
          <g key={i}>
            <title>{`${lab} = ${ctx.names[(ch.degree + [0, 2, 4, 6][i]) % 7]}`}</title>
            <circle cx={px} cy={44} r={13} fill={sw.fill} stroke={sw.line} strokeWidth={1.2} />
            <text x={px} y={44} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} fill={sw.text}>{lab}</text>
          </g>
        );
      })}
      <text x={cx} y={68} textAnchor="middle" fontSize={11} fill="#94a3b8">scale degrees {ch.degrees.join(" · ")}</text>

      {ch.slots.map((b, i) => {
        if (!b) return null;
        const [nx, ny] = polar(R1, ANGLES[i]);
        const n = b.kids.length;
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={lineCol} strokeWidth={1} opacity={0.6} />
            {b.kids.map((_, j) => {
              const [lx, ly] = polar(R2, n === 1 ? ANGLES[i] : ANGLES[i] + (j === 0 ? -spread : spread));
              return <line key={j} x1={nx} y1={ny} x2={lx} y2={ly} stroke={lineCol} strokeWidth={1} opacity={0.6} />;
            })}
          </g>
        );
      })}

      <g onClick={onPlay} style={{ cursor: "pointer" }}>
        <title>{`${ch.roman}: ${ch.triadName}, built on scale degrees ${ch.degrees.slice(0, 3).join("-")}. Tap to hear it.`}</title>
        <circle cx={cx} cy={cy} r={hubR} fill={hue.hub} stroke={lineCol} strokeWidth={1.5} />
        <text x={cx} y={cy - 7} textAnchor="middle" dominantBaseline="central" fontSize={ch.roman.length > 4 ? 13 : 16} fontWeight={600} fill={hue.onHub}>{ch.roman}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={500} fill={hue.onHub}>{ch.triadName}</text>
      </g>

      {ch.slots.map((b, i) => {
        if (!b) return null;
        const [nx, ny] = polar(R1, ANGLES[i]);
        const n = b.kids.length;
        return (
          <g key={i}>
            <g>
              <title>{`${b.label} above the root = ${b.note}`}</title>
              <circle cx={nx} cy={ny} r={nodeR} fill={hue.leaf} stroke={lineCol} strokeWidth={1.2} />
              <text x={nx} y={ny - 5} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} fill={hue.text}>{b.label}</text>
              <text x={nx} y={ny + 10} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={hue.text} opacity={0.8}>{b.note}</text>
            </g>
            {b.kids.map((kid, j) => {
              const [lx, ly] = polar(R2, n === 1 ? ANGLES[i] : ANGLES[i] + (j === 0 ? -spread : spread));
              return (
                <g key={j}>
                  <circle cx={lx} cy={ly} r={leafR} fill="#0f172a" stroke={lineCol} strokeWidth={1.2} strokeDasharray={kid.dashed ? "4 3" : undefined} />
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={fontFor(kid.text)} fontWeight={500} fill={hue.text}>{kid.text}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * For every chord of the selected mode: the chord, the notes of the scale that sit 2, 4, 6 and 7 above its root, and the
 * sus and extension chords each of them makes. For example Em: its M2 (F♯) gives Esus2 and Em9.
 */
export default function ChordBubbles({ ctx }: { ctx: KeyContext }) {
  const strip = useRef<HTMLDivElement>(null);
  const jump = (d: number) => {
    const card = strip.current?.children[d] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">Jump to</span>
        {ctx.chords.map((c) => <Chip key={c.degree} onClick={() => jump(c.degree)}>{c.roman}</Chip>)}
        <Info label="How do I read the bubbles?">
          The big circle is the chord with its Roman numeral. The four small circles above it are its own notes: 1, 3, 5 and 7, with the scale degrees they come from underneath. Around it, each inner circle is another note of the scale: the 2nd (top), 4th (right), 6th (bottom) and 7th (left) above the chord&rsquo;s root, with the note name. The outer circles are the chords you reach by using that note. The 2nd gives a sus2 (it replaces the 3rd) and a 9th chord (it is stacked on top). The 4th gives sus4 and 11, the 6th gives 6 and 13, the 7th gives the seventh chord. A dashed outline marks a note that clashes with the chord (for example a natural 11 on a major chord) so use it with care. Tap the middle to hear the chord.
        </Info>
      </div>
      <div ref={strip} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2">
        {ctx.chords.map((ch) => (
          <div key={ch.degree} className="w-[19rem] shrink-0 snap-center rounded-xl border border-slate-800 bg-slate-950/50 p-1">
            <Bubble ctx={ctx} ch={ch} onPlay={() => strum(chordMidi(ctx, ch.degree, 4), { gapMs: 70, holdMs: 1600 })} />
          </div>
        ))}
      </div>
    </div>
  );
}
