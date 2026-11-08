"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale } from "@tonaljs/tonal";
import Icon, { type IconName } from "@/components/Icon";
import { Button, Field, NumberField, Select, Slider, type SelectGroup } from "@/components/ui";
import type { Band } from "../audio/band";
import type { Part } from "../model/arrange";
import { MAX_BPM, MIN_BPM } from "../model/clock";
import { MODES, PROGRESSIONS, findProgression } from "../model/progressions";
import { TONICS } from "../model/settings";
import { STYLES, findStyle } from "../model/styles";
import { useBand } from "./useBand";

const PROGRESSION_GROUPS: SelectGroup<string>[] = MODES.map((m) => ({ label: m.label, options: PROGRESSIONS.filter((p) => p.mode === m.id).map((p) => ({ value: p.id, label: p.name })) })).filter((g) => g.options.length);
const TONIC_OPTIONS = TONICS.map((t) => ({ value: t, label: t.replace("b", "♭").replace("#", "♯") }));
const STYLE_OPTIONS = STYLES.map((s) => ({ value: s.id, label: s.name }));
const PART_INFO: Record<Part, { label: string; icon: IconName }> = { drums: { label: "Drums", icon: "drum" }, bass: { label: "Bass", icon: "waves" }, keys: { label: "Keys", icon: "piano" } };

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

/** Space plays and stops, unless a text field has the keyboard. */
function useSpaceToggle(band: Band) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return;
      e.preventDefault();
      band.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [band]);
}

/**
 * A backing track from a chord progression: drums, bass and chords in any key, mode and style, the tempo changed live
 * without losing sound quality (notes are scheduled, never stretched). Changes made while it plays come in on the next bar.
 */
export default function BackingTrack() {
  const { band, snap, focus } = useBand();
  const { settings, playing, arrangement } = snap;
  const progression = findProgression(settings.progression);
  const style = findStyle(settings.style);
  const pos = usePosition(band, playing);
  useSpaceToggle(band);

  const mode = MODES.find((m) => m.id === progression.mode)!;
  const scale = useMemo(() => Scale.get(`${settings.tonic} ${mode.scale}`).notes.map(pretty).join(" "), [settings.tonic, mode.scale]);
  const bpb = arrangement.beatsPerBar;

  return (
    <div ref={focus} className="flex min-w-0 flex-col gap-4">
      <section aria-label="Backing track" className="flex min-w-0 flex-col gap-5 rounded-2xl border border-sky-500/30 bg-slate-900/60 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => band.toggle()} aria-pressed={playing} aria-label={playing ? "Stop" : "Play"} title={playing ? "Stop (Space)" : "Play (Space)"}
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-full border transition ${playing ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-slate-900/60 text-sky-100 hover:bg-sky-500/15"}`}>
            <Icon name={playing ? "square" : "play"} size={22} fill />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-slate-500">Tempo</span>
              <Button size="icon-sm" aria-label="Slower" title="Slower" onClick={() => band.set({ bpm: band.getSnapshot().settings.bpm - 5 })}><Icon name="minus" size={14} /></Button>
              <NumberField value={settings.bpm} min={MIN_BPM} max={MAX_BPM} onCommit={(bpm) => band.set({ bpm })} aria-label="Tempo in beats per minute" className="w-16" />
              <Button size="icon-sm" aria-label="Faster" title="Faster" onClick={() => band.set({ bpm: band.getSnapshot().settings.bpm + 5 })}><Icon name="plus" size={14} /></Button>
              <span className="text-slate-500">bpm</span>
              {settings.bpm !== style.bpm && (
                <button type="button" className="ml-1 text-xs text-sky-300 hover:underline" onClick={() => band.set({ bpm: style.bpm })} title={`The ${style.name} style's usual tempo`}>
                  {style.bpm}
                </button>
              )}
            </div>
            <Slider value={settings.bpm} min={MIN_BPM} max={MAX_BPM} step={1} onChange={(bpm) => band.set({ bpm })} title="Tempo" aria-label="Tempo" className="max-w-md" />
          </div>
          <span className="flex items-center gap-2" aria-hidden>
            {Array.from({ length: bpb }, (_, i) => (
              <span key={i} className={`h-3 w-3 rounded-full transition-transform duration-75 ${i === 0 ? "bg-amber-400" : "bg-sky-400"} ${pos?.beat === i ? "scale-125 opacity-100" : "opacity-30"}`} />
            ))}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Field label="Progression">
            <Select value={settings.progression} groups={PROGRESSION_GROUPS} onChange={(id) => band.set({ progression: id, style: findProgression(id).style })} aria-label="Progression" className="w-full" />
          </Field>
          <Field label="Key">
            <Select value={settings.tonic} options={TONIC_OPTIONS} onChange={(tonic) => band.set({ tonic })} aria-label="Key" className="w-full" />
          </Field>
          <Field label="Style">
            <Select value={settings.style} options={STYLE_OPTIONS} onChange={(id) => band.set({ style: id })} aria-label="Style" className="w-full" />
          </Field>
        </div>

        <ol aria-label="Chords" className="grid grid-cols-4 gap-2">
          {arrangement.chords.map((c, i) => {
            const on = pos?.chord === i;
            return (
              <li key={i} style={{ gridColumn: `span ${Math.min(4, Math.max(1, Math.round(c.beats / bpb)))}` }}
                className={`flex min-w-0 flex-col rounded-xl border px-3 py-2 transition-colors ${on ? "border-amber-400/70 bg-amber-500/15" : "border-slate-700/70 bg-slate-950/40"}`}>
                <span className={`truncate text-lg ${on ? "text-amber-100" : "text-slate-100"}`}>{prettyChord(c.symbol)}</span>
                <span className="text-xs text-slate-500">{pretty(c.numeral)}</span>
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-slate-400">
          <span className="text-slate-300">{pretty(settings.tonic)} {mode.label.toLowerCase()}</span>
          <span className="mx-2 text-slate-600">·</span>
          {scale}
        </p>
      </section>

      <section aria-label="Band" className="grid gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 sm:grid-cols-3 sm:p-5">
        {(Object.keys(PART_INFO) as Part[]).map((p) => {
          const { volume, muted } = settings.levels[p];
          return (
            <div key={p} className="flex min-w-0 items-center gap-2">
              <Button size="icon-md" pressed={muted} aria-label={muted ? `Unmute the ${p}` : `Mute the ${p}`} title={muted ? "Unmute" : "Mute"} onClick={() => band.set({ levels: { [p]: { muted: !muted } } })}>
                <Icon name={muted ? "volume-x" : PART_INFO[p].icon} size={15} />
              </Button>
              <span className={`w-12 text-sm ${muted ? "text-slate-500" : "text-slate-300"}`}>{PART_INFO[p].label}</span>
              <Slider value={volume} min={0} max={1} step={0.01} onChange={(v) => band.set({ levels: { [p]: { volume: v } } })} title={`${PART_INFO[p].label} volume`} aria-label={`${PART_INFO[p].label} volume`} className="min-w-0 flex-1" />
            </div>
          );
        })}
      </section>
    </div>
  );
}
