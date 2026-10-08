"use client";

import { useMemo, useState, type ReactNode } from "react";
import { HUES, swatchFor } from "./palette";
import { Info } from "./ui";
import { type DegreeChord, type KeyContext, type TriadQuality } from "@/lib/chordKit/theory";
import { chordMidi } from "@/lib/chordKit/scales";
import { strum, strumShape } from "@/lib/chordKit/playback";
import { shapesForTones } from "@/lib/chordKit/chordShapes";
import ChordDiagram from "./ChordDiagram";

const HUE_OF: Record<TriadQuality, keyof typeof HUES> = { maj: "amber", min: "blue", dim: "coral", aug: "purple", other: "blue" };
const ANGLES = [0, 90, 180, 270];
const cellW = 420, cellH = 490, cx = 210, cy = 282, hubR = 44, nodeR = 30, leafR = 34, R1 = 88, R2 = 170, spread = 16;
const polar = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
};
const fontFor = (t: string) => (t.length > 9 ? 8.5 : t.length > 7 ? 9.5 : t.length > 5 ? 10.5 : 11.5);

/* ---------------------------------------------------------------- what each small bubble explains */

interface Pop {
  x: number;
  y: number;
  title: string;
  notes?: string[];
  text: string;
  warn?: boolean;
  /** the chord this bubble stands for, so its guitar fingering can be drawn */
  rootPc?: number;
  semis?: number[];
}

const ORD = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/** Words for a popover: one entry per small bubble of one chord, keyed by "pip-i", "node-i" and "leaf-i-j". */
function popovers(ctx: KeyContext, ch: DegreeChord): Record<string, Pop> {
  const at = (off: number) => ctx.names[(ch.degree + off) % 7];
  const out: Record<string, Pop> = {};
  const rootPc = (ctx.tonic.pc + ctx.steps[ch.degree]) % 12;
  const semisOf = (offs: number[]) => offs.map((o) => (ctx.steps[(ch.degree + o) % 7] - ctx.steps[ch.degree] + 12) % 12);
  out.hub = { x: cx, y: cy, title: `${ch.roman} ${ch.seventhName}`, notes: [0, 2, 4, 6].map(at), text: `Click to hear it. Below: ways to finger it on guitar.`, rootPc, semis: semisOf([0, 2, 4, 6]) };
  const roleName = ["root", "3rd", "5th", "7th"];
  ch.formula.forEach((lab, i) => {
    const off = [0, 2, 4, 6][i];
    out[`pip-${i}`] = {
      x: cx + (i - 1.5) * 32, y: 44,
      title: `${lab} = ${at(off)}`,
      text: `The ${roleName[i]} of ${ch.triadName}${i === 3 ? " (as a seventh chord)" : ""}. It is the ${ORD[off]} note of the scale counting from ${ch.root}, which is scale degree ${((ch.degree + off) % 7) + 1} of the mode.`,
    };
  });
  const slotOffset = [1, 3, 5, 6];
  ch.slots.forEach((slot, i) => {
    if (!slot) return;
    const off = slotOffset[i];
    const [nx, ny] = polar(R1, ANGLES[i]);
    const dashedAny = slot.kids.some((k) => k.dashed);
    out[`node-${i}`] = {
      x: nx, y: ny,
      title: `${slot.label} above ${ch.root} = ${slot.note}`,
      notes: [at(off)],
      text: i === 3
        ? `The note a ${slot.label} above the root completes the seventh chord: ${ch.seventhName}.`
        : `${slot.note} is the ${ORD[off]} of the scale above ${ch.root}. Use it to make ${slot.kids.map((k) => k.text).join(" or ")}.${dashedAny ? " A dashed outline means a clash, so use it with care." : ""}`,
    };
    const n = slot.kids.length;
    slot.kids.forEach((kid, j) => {
      const [lx, ly] = polar(R2, n === 1 ? ANGLES[i] : ANGLES[i] + (j === 0 ? -spread : spread));
      const sus = /sus/.test(kid.text);
      const six = i === 2 && /6$/.test(kid.text) && !/13|\(/.test(kid.text);
      let notes: string[];
      let text: string;
      let offs: number[] = [0, 2, 4, 6];
      if (i === 3) {
        notes = [0, 2, 4, 6].map(at);
        text = `The full seventh chord: root, 3rd, 5th and 7th.`;
      } else if (sus) {
        notes = [at(0), at(off), at(4)];
        offs = [0, off, 4];
        text = `A suspended chord: the ${ORD[off]} (${slot.note}) replaces the 3rd, so it sounds neither major nor minor and wants to resolve.`;
      } else if (six) {
        notes = [at(0), at(2), at(4), at(5)];
        offs = [0, 2, 4, 5];
        text = `The triad with the 6th (${slot.note}) added. It stays a triad-sized chord with no 7th.`;
      } else {
        notes = [0, 2, 4, 6].map(at).concat(at(off));
        offs = [0, 2, 4, 6, off];
        text = `A full ${ch.seventhName} with the ${["", "9th", "", "11th", "", "13th"][off]} (${slot.note}) stacked on top. It is the same note as the ${ORD[off]}, one octave up.`;
      }
      out[`leaf-${i}-${j}`] = {
        x: lx, y: ly,
        title: kid.text,
        notes,
        text: text + (kid.dashed ? " It clashes with the chord (for example a half step against a chord tone), so use it with care." : ""),
        warn: kid.dashed,
        rootPc,
        semis: semisOf(offs),
      };
    });
  });
  return out;
}

function Hot({ id, label, active, onHover, onPin, children }: { id: string; label: string; active: boolean; onHover: (id: string | null) => void; onPin: (id: string) => void; children: ReactNode }) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-expanded={active}
      style={{ cursor: "pointer", outline: "none" }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(id)}
      onBlur={() => onHover(null)}
      onClick={() => onPin(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPin(id);
        }
      }}
    >
      {children}
    </g>
  );
}

function Bubble({ ctx, ch, onPlay }: { ctx: KeyContext; ch: DegreeChord; onPlay: () => void }) {
  const hue = HUES[HUE_OF[ch.tri]];
  const lineCol = hue.line;
  const pops = useMemo(() => popovers(ctx, ch), [ctx, ch]);
  const [hover, setHover] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const shown = pin ?? hover;
  // the side panel always shows something: what is hovered or pinned, else the chord itself
  const pop = pops[shown ?? "hub"];
  const onPin = (id: string) => setPin((p) => (p === id ? null : id));
  const ring = (id: string) => (shown === id ? { stroke: "#f8fafc", strokeWidth: 2.5 } : {});

  return (
    <div className="flex flex-col items-center gap-3 md:flex-row md:items-start">
      <svg viewBox={`0 0 ${cellW} ${cellH}`} className="w-full max-w-[34rem] shrink-0 md:w-[34rem]" role="group" aria-label={`${ch.seventhName}: sus and extension chords reachable from ${ch.triadName}`}>
        <text x={cx} y={20} textAnchor="middle" fontSize={13} fontWeight={500} fill="#cbd5e1">{ch.roman} · {ch.triadName}</text>
        {ch.formula.map((lab, i) => {
          const sw = swatchFor(lab);
          const px = cx + (i - 1.5) * 32;
          const id = `pip-${i}`;
          return (
            <Hot key={i} id={id} label={pops[id].title} active={shown === id} onHover={setHover} onPin={onPin}>
              <circle cx={px} cy={44} r={13} fill={sw.fill} stroke={sw.line} strokeWidth={1.2} {...ring(id)} />
              <text x={px} y={44} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} fill={sw.text} pointerEvents="none">{lab}</text>
            </Hot>
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

        <g onClick={() => { onPlay(); onPin("hub"); }} onMouseEnter={() => setHover("hub")} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
          <title>{`${ch.roman}: ${ch.triadName}, built on scale degrees ${ch.degrees.slice(0, 3).join("-")}. Tap to hear it.`}</title>
          <circle cx={cx} cy={cy} r={hubR} fill={hue.hub} stroke={lineCol} strokeWidth={1.5} />
          <text x={cx} y={cy - 7} textAnchor="middle" dominantBaseline="central" fontSize={ch.roman.length > 4 ? 13 : 16} fontWeight={600} fill={hue.onHub}>{ch.roman}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={500} fill={hue.onHub}>{ch.triadName}</text>
        </g>

        {ch.slots.map((b, i) => {
          if (!b) return null;
          const [nx, ny] = polar(R1, ANGLES[i]);
          const n = b.kids.length;
          const nid = `node-${i}`;
          return (
            <g key={i}>
              <Hot id={nid} label={pops[nid].title} active={shown === nid} onHover={setHover} onPin={onPin}>
                <circle cx={nx} cy={ny} r={nodeR} fill={hue.leaf} stroke={lineCol} strokeWidth={1.2} {...ring(nid)} />
                <text x={nx} y={ny - 5} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} fill={hue.text} pointerEvents="none">{b.label}</text>
                <text x={nx} y={ny + 10} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={hue.text} opacity={0.8} pointerEvents="none">{b.note}</text>
              </Hot>
              {b.kids.map((kid, j) => {
                const [lx, ly] = polar(R2, n === 1 ? ANGLES[i] : ANGLES[i] + (j === 0 ? -spread : spread));
                const lid = `leaf-${i}-${j}`;
                return (
                  <Hot key={j} id={lid} label={pops[lid].title} active={shown === lid} onHover={setHover} onPin={onPin}>
                    <circle cx={lx} cy={ly} r={leafR} fill="#0f172a" stroke={lineCol} strokeWidth={1.2} strokeDasharray={kid.dashed ? "4 3" : undefined} {...ring(lid)} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={fontFor(kid.text)} fontWeight={500} fill={hue.text} pointerEvents="none">{kid.text}</text>
                  </Hot>
                );
              })}
            </g>
          );
        })}
      </svg>

      <div role="status" aria-live="polite" className={`min-w-0 w-full max-w-[34rem] flex-1 rounded-xl border bg-slate-950 p-3 text-xs text-slate-300 md:sticky md:top-3 md:max-w-none ${pop.warn ? "border-rose-500/60" : "border-slate-700"}`}>
        <div className="flex items-start gap-2">
          <b className="text-base text-slate-100">{pop.title}</b>
          {pin && <button type="button" onClick={() => setPin(null)} className="ml-auto rounded border border-slate-700 px-1.5 text-[11px] text-slate-400 hover:text-slate-200" aria-label="Release">✕ release</button>}
        </div>
        {pop.notes && <div className="mt-1 text-slate-400">Notes: <span className="text-slate-200">{pop.notes.join(" ")}</span></div>}
        {pop.warn && <p className="mt-1 text-rose-300">Clashes with the chord, use with care.</p>}
        {pop.semis && pop.rootPc !== undefined && <Fingering key={shown ?? "hub"} rootPc={pop.rootPc} semis={pop.semis} />}
        {!pin && <p className="mt-2 text-[10px] text-slate-500">Hover a bubble to see it here; click to keep it.</p>}
      </div>
    </div>
  );
}

/** Guitar fingering(s) for a chord inside a popover: the best shape as a chord box, with arrows when there are more. Click the box to hear it. */
function Fingering({ rootPc, semis }: { rootPc: number; semis: number[] }) {
  const list = useMemo(() => shapesForTones(rootPc, semis), [rootPc, semis]);
  const [i, setI] = useState(0);
  if (list.length === 0) return <p className="mt-1 text-[11px] text-slate-500">No common guitar shape for this chord in the library.</p>;
  const cur = list[i % list.length];
  const step = (d: number) => (e: { stopPropagation: () => void }) => { e.stopPropagation(); setI((v) => (v + d + list.length) % list.length); };
  return (
    <div className="mt-2 flex flex-col items-center gap-1 border-t border-slate-800 pt-2">
      <div className="w-44"><ChordDiagram shape={cur.choice.shape} rootFret={cur.choice.fret} onPlay={() => strumShape(cur.choice.shape, cur.choice.fret)} /></div>
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        {list.length > 1 && <button type="button" onClick={step(-1)} aria-label="Previous fingering" className="rounded border border-slate-700 px-1.5">‹</button>}
        <span className="tabular-nums">fret {cur.choice.fret}{list.length > 1 ? ` · ${(i % list.length) + 1}/${list.length}` : ""}</span>
        {list.length > 1 && <button type="button" onClick={step(1)} aria-label="Next fingering" className="rounded border border-slate-700 px-1.5">›</button>}
      </div>
      {!cur.full && <p className="text-center text-[10px] text-amber-300">Closest shape: leaves out a colour note.</p>}
    </div>
  );
}

/**
 * For every chord of the selected mode: the chord, the notes of the scale that sit 2, 4, 6 and 7 above its root, and the
 * sus and extension chords each of them makes. For example Em: its M2 (F♯) gives Esus2 and Em9.
 * The cards fill the width available. Hover a small bubble for an explanation; click to keep it open.
 */
export default function ChordBubbles({ ctx }: { ctx: KeyContext }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-500">
        Hover or focus a small bubble for what it is, click to keep the note open.
        <Info label="How do I read the bubbles?">
          The big circle is the chord with its Roman numeral. The four small circles above it are its own notes: 1, 3, 5 and 7, with the scale degrees they come from underneath. Around it, each inner circle is another note of the scale: the 2nd (top), 4th (right), 6th (bottom) and 7th (left) above the chord&rsquo;s root, with the note name. The outer circles are the chords you reach by using that note. The 2nd gives a sus2 (it replaces the 3rd) and a 9th chord (it is stacked on top). The 4th gives sus4 and 11, the 6th gives 6 and 13, the 7th gives the seventh chord. A dashed outline marks a note that clashes with the chord (for example a natural 11 on a major chord) so use it with care. Tap the middle to hear the chord.
        </Info>
      </p>
      <div className="flex flex-col gap-3">
        {ctx.chords.map((ch) => (
          <div key={ch.degree} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
            <Bubble ctx={ctx} ch={ch} onPlay={() => strum(chordMidi(ctx, ch.degree, 4), { gapMs: 70, holdMs: 1600 })} />
          </div>
        ))}
      </div>
    </div>
  );
}
