"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { useStepPart } from "@/components/practice/exerciseStep";
import { useSpaceKey } from "@/components/practice/toolKeys";
import { Button, HUE_TONES, Notice, type Hue } from "@/components/ui";
import { BandMixer, PARTS, TONICS, findStyle, useBand, type Band, type Part } from "@/features/backing";
import { MAX_BPM, MIN_BPM, REST } from "@/features/backing/model";
import { useAudioFocus } from "@/features/sound";
import { BeatMeter, PlayButton, PlayerCard, TempoControl, chordHues } from "../../play-along/PlayerParts";
import { chartChords, chartNumerals, layChart, type ChartSection } from "./chart";

const prettyChord = (s: string) => s.replace(/^([A-G])b/, "$1♭").replace(/^([A-G])#/, "$1♯").replace("m7b5", "m7♭5");
const prettyNumeral = (s: string) => s.replace(/b(?=[^a-z]|$)/g, "♭").replace(/#/g, "♯");
const prettyKey = (s: string) => s.replace("b", "♭").replace("#", "♯");
/** "A", "A and B", "A, B and C" */
const listed = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const STRIPE: Record<Hue, string> = {
  sky: "bg-sky-400", teal: "bg-teal-400", violet: "bg-violet-400", emerald: "bg-emerald-400",
  amber: "bg-amber-400", pink: "bg-pink-400", rose: "bg-rose-400", red: "bg-red-400",
};

/** Where the band is, read every frame: the count-in click, or the band's chord, the beat and the time round. React re-renders only when one changes. */
interface Place { countIn: number | null; chord: number | null; beat: number | null; round: number }
function usePlace(band: Band, playing: boolean): Place | null {
  const [place, setPlace] = useState<Place | null>(null);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const count = band.countIn();
      const p = count ? null : band.position();
      const next: Place = count ? { countIn: count.count, chord: null, beat: count.count - 1, round: 0 } : { countIn: null, chord: p?.chord ?? null, beat: p?.beat ?? null, round: p?.round ?? 0 };
      const key = `${next.countIn}:${next.chord}:${next.beat}:${next.round}`;
      if (key !== last) {
        last = key;
        setPlace(next);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [band, playing]);
  return playing ? place : null;
}

/**
 * A song's chart played by the backing band (`@/features/backing`: the same `Band`, arranger and voices as the backing
 * track, set up here and never saved). `sections` are written once and `form` names them in playing order; `keyPc` is
 * the key's pitch class. The form is laid out by `chart.ts` and handed to the band as numerals, a chord the band cannot
 * voice as a rest, so the bars keep their places and the chart names what was not played. One bar of count-in, then the
 * form `repeat` times (absent: until stopped). `hide` starts with the chord names hidden. It is a "band" part of its
 * step, so "Start exercise" can start it with the rest.
 */
export function View({ keyPc, sections, form, style = "pop", bpm, repeat, parts, hide = false }: { keyPc: number; sections: ChartSection[]; form?: string[]; style?: string; bpm?: number; repeat?: number; parts?: Partial<Record<Part, "on" | "off" | "always">>; hide?: boolean }) {
  const tonic = TONICS[((keyPc % 12) + 12) % 12];
  const chart = useMemo(() => {
    const laid = layChart(sections, form);
    const all = chartChords(laid.parts);
    const hues = chordHues(all);
    const played = chartNumerals(laid.parts, tonic);
    // each band chord as the chart writes it under its name: its numeral, or null where the band rests
    const written = played.numerals.map((n) => (n.startsWith(REST) ? null : n.split(":")[0]));
    const restBars = [...new Set(played.slots.filter((_, i) => written[i] === null).map((x) => x.bar + 1))];
    return { ...laid, ...played, written, restBars, firstOf: new Map(laid.parts.flatMap((p) => p.bars).map((b) => [b.index, played.slots.findIndex((x) => x.bar === b.index)])), hueOf: new Map(all.map((c, i) => [c, hues[i]])) };
  }, [sections, form, tonic]);
  const { band, snap } = useBand({
    initial: {
      numerals: chart.numerals, tonic, style, bpm: bpm ?? findStyle(style).bpm,
      levels: Object.fromEntries(PARTS.map((p) => [p, { muted: !!parts && (!parts[p] || parts[p] === "off") }])),
    },
    storageKey: null,
  });
  // the plan moved the chart (a key or a tempo choice): the band follows, from the top
  useEffect(() => {
    band.setForm({ countIn: true, rounds: repeat ?? null });
  }, [band, repeat]);
  const numeralKey = chart.numerals.join(" ");
  useEffect(() => {
    band.stop();
    band.set({ numerals: numeralKey.split(" "), tonic, style, ...(bpm !== undefined ? { bpm } : {}) });
  }, [band, numeralKey, tonic, style, bpm]);

  const { settings, playing, arrangement } = snap;
  const group = useStepPart({ kind: "band", on: playing, start: () => band.start(), stop: () => band.stop() });
  const focus = useAudioFocus(playing, () => band.stop(), group);
  const { ref: spaceRef, armed: spaceArmed } = useSpaceKey(() => band.toggle(), focus);
  const place = usePlace(band, playing);
  const [shown, setShown] = useState(!hide);
  const [wasHidden, setWasHidden] = useState(hide);
  if (hide !== wasHidden) {
    setWasHidden(hide);
    setShown(!hide);
  }

  const slot = place?.chord != null ? chart.slots[place.chord] ?? null : null;
  const partNow = slot ? chart.parts.find((p) => p.bars.some((b) => b.index === slot.bar)) ?? null : null;
  const barNow = slot && partNow ? partNow.bars.find((b) => b.index === slot.bar)! : null;

  return (
    <div ref={spaceRef} className="flex min-w-0 flex-col gap-3">
      <PlayerCard>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <PlayButton playing={playing} onClick={() => band.toggle()} space={spaceArmed} data-tour="song-chart-play" />
          <TempoControl bpm={settings.bpm} min={MIN_BPM} max={MAX_BPM} step={5} onChange={(next) => band.set({ bpm: next })} data-tour="song-chart-tempo" />
          <BeatMeter beats={arrangement.beatsPerBar} beat={place?.beat ?? null} />
          <span className="text-xs text-slate-400" aria-live="polite">
            {place?.countIn != null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 font-medium text-amber-100">
                Count-in <b className="tabular-nums text-amber-50">{place.countIn}</b>
              </span>
            ) : partNow && barNow ? (
              <span className="font-medium text-slate-200">
                {partNow.name} · bar {barNow.inPart + 1} of {partNow.bars.length}
                {repeat && repeat > 1 ? ` · time ${Math.min(repeat, place!.round + 1)} of ${repeat}` : ""}
              </span>
            ) : playing ? null : (
              `Key of ${prettyKey(tonic)} · ${chart.bars} ${chart.bars === 1 ? "bar" : "bars"} · ${repeat ? (repeat === 1 ? "played once" : `played ${repeat} times`) : "goes round until you stop it"}`
            )}
          </span>
          {hide && (
            <Button size="sm" className="ml-auto" pressed={shown} onClick={() => setShown((s) => !s)}>
              {shown ? "Hide chords" : "Show chords"}
            </Button>
          )}
        </div>

        <div data-tour="song-chart-chart" className="flex flex-col gap-3">
          {chart.parts.map((part, pi) => {
            const here = partNow === part;
            return (
              <section key={pi} aria-label={part.name} aria-current={here || undefined} className="flex flex-col gap-1.5">
                <h4 className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${here ? "text-sky-200" : "text-slate-500"}`}>
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${here ? "bg-sky-300 shadow-[0_0_8px] shadow-sky-400/80" : "bg-slate-700"}`} />
                  {part.name}
                </h4>
                <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {part.bars.map((bar) => {
                    const lit = slot?.bar === bar.index;
                    const first = chart.firstOf.get(bar.index) ?? 0;
                    const hue = chart.hueOf.get(bar.chords[0]) ?? "sky";
                    return (
                      <li key={bar.index} aria-current={lit || undefined} aria-label={shown ? undefined : `Bar ${bar.index + 1}`}
                        className={`relative flex min-h-14 min-w-0 items-stretch overflow-hidden rounded-lg border-l-2 border-y border-r transition duration-100 ${lit ? (shown ? HUE_TONES[hue].on : "border-sky-400/80 bg-sky-500/20") : "border-slate-700/70 border-l-slate-500 bg-slate-950/40"}`}>
                        {shown ? bar.chords.map((chord, ci) => {
                          const numeral = chart.written[first + ci] ?? null;
                          const rest = numeral === null;
                          const on = lit && slot!.chord === ci;
                          return (
                            <span key={ci} title={rest ? "The backing track rests here" : undefined} className={`relative flex min-w-0 flex-1 flex-col justify-center px-2 py-1.5 ${ci > 0 ? "border-l border-dashed border-slate-600/70" : ""} ${lit && !on ? "opacity-60" : ""}`}>
                              <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${STRIPE[chart.hueOf.get(chord) ?? "sky"]} ${on ? "" : "opacity-60"}`} />
                              <span className={`truncate text-base font-semibold leading-tight tracking-tight ${rest ? "text-amber-200 underline decoration-dotted underline-offset-4" : on ? "text-white" : "text-slate-100"}`}>{prettyChord(chord)}</span>
                              <span className={`text-[11px] font-medium leading-tight ${rest ? "text-amber-300/80" : on ? "text-white/80" : "text-slate-500"}`}>{rest ? "rests" : prettyNumeral(numeral)}</span>
                            </span>
                          );
                        }) : (
                          <span className={`flex flex-1 items-center justify-center text-sm font-semibold tabular-nums ${lit ? "text-white" : "text-slate-500"}`}>{bar.index + 1}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>

        {chart.unplayed.length > 0 && (
          <Notice tone="warn" icon={<Icon name="volume-x" size={14} />}>
            {shown
              ? `The backing track has no notes for ${listed(chart.unplayed.map(prettyChord))}, so it rests there. Play ${chart.unplayed.length === 1 ? "that chord" : "those chords"} yourself.`
              : `The backing track has no notes for a chord in bar ${listed(chart.restBars.map(String))}, so it rests there.`}
          </Notice>
        )}
      </PlayerCard>
      <BandMixer band={band} settings={settings} parts={parts} />
    </div>
  );
}
