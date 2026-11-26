"use client";

import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { Button } from "@/components/ui";
import Icon from "@/components/Icon";
import { DOT_INK, degreeColour } from "@/features/theory/scales";
import { intervalName, solfege } from "@/features/theory/labels";
import { INTERVALS } from "@/lib/chordKit/intervals";

/** Do on the piano: middle C for one octave; for more, the C an octave lower, so three octaves stay in a singer's hearing. */
const doOf = (octaves: number) => (octaves > 1 ? 48 : 60);
const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }; // semitones -> the white key it sits after
const KW = 44, KH = 150, BW = 28, BH = 92;

/**
 * One note `semis` above Do, named as the necks name it: its interval (`intervalName`), its solfège from that interval (so
 * ♭5 is Se, as a ♭5 on a neck), the interval's full name, and its colour, the colour of its degree on a neck.
 */
function named(semis: number, octaves: number) {
  const interval = intervalName(semis);
  const degree = interval === "R" ? "R" : interval.replace(/^p/, "");
  const step = interval === "R" ? 0 : Number(degree.replace(/^b/, "")) - 1;
  const name = semis === 0 ? "the root" : semis > 12 && semis % 12 === 0 ? `${semis / 12} octaves` : INTERVALS.find((i) => i.semis === (semis > 12 ? semis % 12 : semis))!.name;
  return { semis, midi: doOf(octaves) + semis, interval, solfege: solfege(degree), name, colour: degreeColour(step), key: `names-${octaves}-${semis}` };
}

/**
 * The `names` block: a piano from Do, each key with its solfège name and interval. One octave (the default) also lists the
 * notes as a table with each interval's name; more octaves show that the names come round again from each Do, with no table.
 * Tap a key or a row to hear it; Play runs up the piano.
 */
export default function NamesChart({ octaves = 1 }: { octaves?: number }) {
  const { active, running, play, tap, stop } = useNotePlayer();
  const NOTES = Array.from({ length: 12 * octaves + 1 }, (_, s) => named(s, octaves));
  const whites = NOTES.filter((n) => WHITE.includes(n.semis % 12));
  const blacks = NOTES.filter((n) => n.semis % 12 in BLACK);
  const keyOf = (n: (typeof NOTES)[number], black: boolean) => {
    const oct = Math.floor(n.semis / 12), pc = n.semis % 12;
    const x = black ? (oct * 7 + BLACK[pc] + 1) * KW - BW / 2 : (oct * 7 + WHITE.indexOf(pc)) * KW;
    const w = black ? BW : KW, h = black ? BH : KH, lit = active === n.key, cx = x + w / 2;
    return (
      <g key={n.key} role="button" aria-label={`${n.solfege}, ${n.name}, tap to hear`} onPointerDown={() => tap(n.key, n.midi)} className="cursor-pointer">
        <rect x={x} y={0} width={w} height={h} rx={3} fill={lit ? "var(--color-sky-300)" : black ? "var(--color-slate-950)" : "var(--color-slate-200)"} stroke={black ? "var(--color-slate-700)" : "var(--color-slate-500)"} />
        <circle cx={cx} cy={h - (black ? 34 : 40)} r={black ? 11 : 14} fill={n.colour} stroke={n.semis % 12 === 0 ? "var(--color-slate-50)" : DOT_INK} strokeWidth={n.semis % 12 === 0 ? 2.4 : 1.2} />
        <text x={cx} y={h - (black ? 34 : 40) + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={black ? 9 : 11} fontWeight={700} fill={DOT_INK}>{n.interval}</text>
        <text x={cx} y={h - (black ? 12 : 14)} textAnchor="middle" dominantBaseline="central" fontSize={black ? 10 : 12} fontWeight={600} fill={black ? "var(--color-slate-100)" : DOT_INK}>{n.solfege}</text>
      </g>
    );
  };
  const playing = running === "names";
  const width = (7 * octaves + 1) * KW;
  return (
    <figure className="flex flex-col gap-3">
      <div className={octaves > 1 ? "-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" : undefined}>
        <svg viewBox={`0 0 ${width} ${KH}`} className={`select-none ${octaves > 1 ? "w-full min-w-[40rem]" : "w-full max-w-lg"}`} role="group" aria-label={octaves > 1 ? `${octaves} octaves of a piano from Do` : "One octave of a piano from Do"}>
          {whites.map((n) => keyOf(n, false))}
          {blacks.map((n) => keyOf(n, true))}
        </svg>
      </div>
      <div>
        <Button size="sm" onClick={() => (playing ? stop() : play(NOTES.map((n) => ({ key: n.key, midi: n.midi })), octaves > 1 ? 300 : 500, "names"))}>
          <Icon name={playing ? "square" : "play"} size={14} /> {playing ? "Stop" : "Play"}
        </Button>
      </div>
      {octaves === 1 && <table className="w-full max-w-lg text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-slate-400">
          <tr><th className="py-1.5 pr-3 font-medium">Solfège</th><th className="py-1.5 pr-3 font-medium">Interval</th><th className="py-1.5 font-medium">Name</th></tr>
        </thead>
        <tbody>
          {NOTES.map((n) => (
            <tr key={n.key} onClick={() => tap(n.key, n.midi)} className={`cursor-pointer border-t border-slate-800 ${active === n.key ? "bg-sky-500/15" : "hover:bg-slate-800/50"}`}>
              <td className="py-1.5 pr-3 font-semibold text-slate-100">{n.solfege}</td>
              <td className="py-1.5 pr-3">
                <span className="inline-flex size-7 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: n.colour, color: DOT_INK }}>{n.interval}</span>
              </td>
              <td className="py-1.5 text-slate-300">{n.name}</td>
            </tr>
          ))}
        </tbody>
      </table>}
    </figure>
  );
}
