"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale } from "@tonaljs/tonal";
import Icon, { type IconName } from "@/components/Icon";
import { useAudioFocus } from "@/features/sound";
import { Button, Field, HUE_TONES, NumberField, Select, Slider, type Hue, type SelectGroup } from "@/components/ui";
import type { Band, BandSnapshot } from "../audio/band";
import type { Part } from "../model/arrange";
import { MAX_BPM, MIN_BPM } from "../model/clock";
import { MODES, PROGRESSIONS, findProgression } from "../model/progressions";
import { TONICS, bandMode } from "../model/settings";
import { STYLES, findStyle } from "../model/styles";
import { useBand } from "./useBand";

const PROGRESSION_GROUPS: SelectGroup<string>[] = MODES.map((m) => ({ label: m.label, options: PROGRESSIONS.filter((p) => p.mode === m.id).map((p) => ({ value: p.id, label: p.name })) })).filter((g) => g.options.length);
/** the progression picker's value for the band's own numerals (a plan's chords) */
const OWN = "own";
const TONIC_OPTIONS = TONICS.map((t) => ({ value: t, label: t.replace("b", "♭").replace("#", "♯") }));
const STYLE_OPTIONS = STYLES.map((s) => ({ value: s.id, label: s.name }));
/** the mixer's columns from sm up, by how many rows it shows */
const MIXER_COLS: Record<number, string> = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" };

const PART_INFO: Record<Part, { label: string; icon: IconName; hue: Hue }> = {
  drums: { label: "Drums", icon: "drum", hue: "rose" },
  bass: { label: "Bass", icon: "waves", hue: "violet" },
  keys: { label: "Keys", icon: "piano", hue: "amber" },
};
const BAND_BORDER: Partial<Record<Hue, string>> = { rose: "border-rose-500/30", violet: "border-violet-500/30", amber: "border-amber-500/30" };

/** Each scale degree keeps its colour in every key and progression (I always sky, V always amber), so a chord's place is seen at a glance. */
const DEGREE_HUES: Hue[] = ["sky", "teal", "violet", "emerald", "amber", "pink", "rose"];
const ROMAN = ["VII", "VI", "IV", "V", "III", "II", "I"];
const ROMAN_DEGREE: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };
const numeralHue = (numeral: string): Hue => {
  const n = numeral.replace(/^[b#♭♯]+/, "").toUpperCase();
  const r = ROMAN.find((x) => n.startsWith(x));
  return DEGREE_HUES[r ? ROMAN_DEGREE[r] : 0];
};
const STRIPE: Record<Hue, string> = {
  sky: "bg-sky-400", teal: "bg-teal-400", violet: "bg-violet-400", emerald: "bg-emerald-400",
  amber: "bg-amber-400", pink: "bg-pink-400", rose: "bg-rose-400", red: "bg-red-400",
};

const pretty = (s: string) => s.replace(/b(?=[^a-z]|$)/g, "♭").replace(/#/g, "♯");
const prettyChord = (s: string) => s.replace(/^([A-G])b/, "$1♭").replace(/^([A-G])#/, "$1♯").replace("m7b5", "m7♭5");

/** The band's place, read every frame; React re-renders only when the chord or the beat changes. */
function usePosition(band: Band, playing: boolean) {
  const [pos, setPos] = useState<{ chord: number; beat: number } | null>(null);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const p = band.position();
      const key = p ? `${p.chord}:${p.beat}` : "";
      if (key !== last) {
        last = key;
        setPos(p ? { chord: p.chord, beat: p.beat } : null);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [band, playing]);
  return playing ? pos : null;
}

/** Space plays and stops, unless a text field has the keyboard. Off when `on` is false. */
function useSpaceToggle(band: Band, on: boolean) {
  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return;
      e.preventDefault();
      band.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [band, on]);
}

/**
 * A backing track from a chord progression: drums, bass and chords in any key, mode and style, the tempo changed live
 * without losing sound quality (notes are scheduled, never stretched). Changes made while it plays come in on the next bar.
 */
export default function BackingTrack() {
  const { band, snap } = useBand();
  return <BackingPlayer band={band} snap={snap} spaceKey />;
}

/**
 * The player for a band someone else holds (`useBand`): play and tempo, progression, key and style, the chords, the mixer.
 * It holds the app's audio focus while it plays (another source starting, or the player scrolling away, stops it), in
 * `group` when an exercise step started it. `spaceKey`: Space plays and stops, for a page with one player. `scale`: the
 * key and its scale's notes under the chords (the page shows them; a plan exercise says what to play in its own text).
 * `parts`: the mixer rows shown, each "on" or "off" (the student mutes and unmutes it) or "always" (no mute button); a part
 * left out has no row and the host keeps it muted. Absent: every part, all switchable.
 */
export function BackingPlayer({ band, snap, group, spaceKey = false, scale: showScale = true, parts }: { band: Band; snap: BandSnapshot; group?: string; spaceKey?: boolean; scale?: boolean; parts?: Partial<Record<Part, "on" | "off" | "always">> }) {
  const { settings, playing, arrangement } = snap;
  const focus = useAudioFocus(playing, () => band.stop(), group);
  const style = findStyle(settings.style);
  const pos = usePosition(band, playing);
  useSpaceToggle(band, spaceKey);

  const mode = MODES.find((m) => m.id === bandMode(settings))!;
  const groups = useMemo(
    () => (settings.numerals ? [{ label: "This lesson", options: [{ value: OWN, label: settings.numerals.map(pretty).join("–") }] }, ...PROGRESSION_GROUPS] : PROGRESSION_GROUPS),
    [settings.numerals],
  );
  const scale = useMemo(() => Scale.get(`${settings.tonic} ${mode.scale}`).notes.map(pretty), [settings.tonic, mode.scale]);
  const bpb = arrangement.beatsPerBar;
  const shown = (Object.keys(PART_INFO) as Part[]).filter((p) => !parts || parts[p]);

  return (
    <div ref={focus} className="flex min-w-0 flex-col gap-4">
      <section aria-label="Backing track" className="relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-2xl border border-slate-700/70 bg-linear-to-b from-sky-500/[0.07] via-slate-900/70 to-slate-900/70 p-4 shadow-xl shadow-black/20 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-400/60 to-transparent" />
        <div data-tour="backing-play" className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <button type="button" onClick={() => band.toggle()} aria-pressed={playing} aria-label={playing ? "Stop" : "Play"} title={playing ? (spaceKey ? "Stop (Space)" : "Stop") : spaceKey ? "Play (Space)" : "Play"}
            className={`relative grid h-16 w-16 shrink-0 place-items-center rounded-full text-slate-950 shadow-lg transition active:scale-95 ${playing ? "bg-emerald-400 shadow-emerald-500/40 hover:bg-emerald-300" : "bg-sky-400 shadow-sky-500/40 hover:bg-sky-300"}`}>
            {playing && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30 [animation-duration:1.6s]" />}
            <Icon name={playing ? "square" : "play"} size={24} fill className={playing ? "" : "translate-x-0.5"} />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tempo</span>
              <Button size="icon-sm" aria-label="Slower" title="Slower" onClick={() => band.set({ bpm: band.getSnapshot().settings.bpm - 5 })}><Icon name="minus" size={14} /></Button>
              <NumberField value={settings.bpm} min={MIN_BPM} max={MAX_BPM} onCommit={(bpm) => band.set({ bpm })} aria-label="Tempo in beats per minute" className="w-16 text-center text-base font-semibold tabular-nums" />
              <Button size="icon-sm" aria-label="Faster" title="Faster" onClick={() => band.set({ bpm: band.getSnapshot().settings.bpm + 5 })}><Icon name="plus" size={14} /></Button>
              <span className="text-slate-500">bpm</span>
              {settings.bpm !== style.bpm && (
                <button type="button" className="ml-1 rounded-full border border-sky-500/40 px-2 py-0.5 text-xs text-sky-200 transition hover:bg-sky-500/15" onClick={() => band.set({ bpm: style.bpm })} title={`The ${style.name} style's usual tempo`}>
                  ↺ {style.bpm}
                </button>
              )}
            </div>
            <Slider value={settings.bpm} min={MIN_BPM} max={MAX_BPM} step={1} onChange={(bpm) => band.set({ bpm })} title="Tempo" aria-label="Tempo" className="max-w-md" />
          </div>
          <span className="flex h-10 items-end gap-1.5 rounded-xl border border-slate-700/60 bg-slate-950/50 px-3 py-2" aria-hidden>
            {Array.from({ length: bpb }, (_, i) => {
              const on = pos?.beat === i;
              const down = i === 0;
              return (
                <span key={i} className={`w-2 rounded-full transition-all duration-75 ${down ? "h-6" : "h-4"} ${down ? (on ? "bg-amber-300 shadow-[0_0_10px] shadow-amber-400/80" : "bg-amber-400/30") : on ? "bg-sky-300 shadow-[0_0_10px] shadow-sky-400/80" : "bg-sky-400/25"}`} />
              );
            })}
          </span>
        </div>

        <div data-tour="backing-choose" className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Field label="Progression">
            <Select value={settings.numerals ? OWN : settings.progression} groups={groups} onChange={(id) => id !== OWN && band.set({ progression: id, numerals: null, style: findProgression(id).style })} aria-label="Progression" className="w-full" />
          </Field>
          <Field label="Key">
            <Select value={settings.tonic} options={TONIC_OPTIONS} onChange={(tonic) => band.set({ tonic })} aria-label="Key" className="w-full" />
          </Field>
          <Field label="Style">
            <Select value={settings.style} options={STYLE_OPTIONS} onChange={(id) => band.set({ style: id })} aria-label="Style" className="w-full" />
          </Field>
        </div>

        <ol data-tour="backing-chords" aria-label="Chords" className="grid grid-cols-4 gap-2">
          {arrangement.chords.map((c, i) => {
            const on = pos?.chord === i;
            const hue = numeralHue(c.numeral);
            return (
              <li key={i} style={{ gridColumn: `span ${Math.min(4, Math.max(1, Math.round(c.beats / bpb)))}` }}
                className={`relative flex min-w-0 flex-col overflow-hidden rounded-xl border px-3 pb-2 pt-2.5 transition duration-100 ${on ? `${HUE_TONES[hue].on} -translate-y-0.5` : "border-slate-700/70 bg-slate-950/40"}`}>
                <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${STRIPE[hue]} ${on ? "" : "opacity-60"}`} />
                <span className={`truncate text-xl font-semibold tracking-tight ${on ? "text-white" : "text-slate-100"}`}>{prettyChord(c.symbol)}</span>
                <span className={`text-xs font-medium ${on ? "text-white/80" : HUE_TONES[hue].ink}`}>{pretty(c.numeral)}</span>
              </li>
            );
          })}
        </ol>
        {showScale && <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="mr-1.5 font-medium text-slate-200">{pretty(settings.tonic)} {mode.label.toLowerCase()}</span>
          {scale.map((n, i) => (
            <span key={n} className={`rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums ${i === 0 ? "border-sky-400/60 bg-sky-500/15 text-sky-100" : "border-slate-700/70 bg-slate-950/40 text-slate-300"}`}>{n}</span>
          ))}
        </div>}
      </section>

      {shown.length > 0 && <section data-tour="backing-band" aria-label="Band" className={`grid gap-3 ${MIXER_COLS[shown.length]}`}>
        {shown.map((p) => {
          const { volume, muted } = settings.levels[p];
          const { label, icon, hue } = PART_INFO[p];
          const fixed = parts?.[p] === "always";
          return (
            <div key={p} className={`flex min-w-0 items-center gap-3 rounded-2xl border bg-slate-900/60 p-3 transition ${muted ? "border-slate-800" : BAND_BORDER[hue]}`}>
              {fixed ? (
                <span className="grid h-7 w-7 shrink-0 place-items-center" title={`The ${p} always plays in this exercise`}>
                  <Icon name={icon} size={15} className={HUE_TONES[hue].ink} />
                </span>
              ) : (
              <Button size="icon-md" pressed={muted} aria-label={muted ? `Unmute the ${p}` : `Mute the ${p}`} title={muted ? "Unmute" : "Mute"} onClick={() => band.set({ levels: { [p]: { muted: !muted } } })}>
                <Icon name={muted ? "volume-x" : icon} size={15} className={muted ? "" : HUE_TONES[hue].ink} />
              </Button>
              )}
              <span className={`w-12 text-sm font-medium ${muted ? "text-slate-500 line-through decoration-slate-600" : "text-slate-200"}`}>{label}</span>
              <Slider value={volume} hue={hue} min={0} max={1} step={0.01} onChange={(v) => band.set({ levels: { [p]: { volume: v } } })} title={`${label} volume`} aria-label={`${label} volume`} className={`min-w-0 flex-1 transition-opacity ${muted ? "opacity-40" : ""}`} />
            </div>
          );
        })}
      </section>}
    </div>
  );
}
