"use client";

import { noteState, type Others } from "../../cues/visibility";
import { useCallback, useMemo, useRef, useState } from "react";
import { useMicPitch } from "@/components/practice/useMicPitch";
import MicButton from "@/components/theory/singing/MicButton";
import InputChip from "@/components/InputChip";
import SingingStaff from "@/components/theory/singing/SingingStaff";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import { ACCURACIES, VOICES, buildLadder, clefFor, hzToMidi, spellName } from "@/features/theory/singing";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { staffLabelSystem, type SingingLabels } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { useAccuracy } from "@/features/theory/useAccuracy";
import { Badge, Chip } from "@/components/ui";
import dynamic from "next/dynamic";

const PracticeBacking = dynamic(() => import("@/features/instruments").then((m) => m.PracticeBacking), { ssr: false });

const FLAT = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];

/** frames without a pitch before the dot on the staff goes away */
const GAP_FRAMES = 6;

/**
 * The scale on a staff in the voice's range, with the microphone's pitch drawn on it; tap a note to hear it. With `drone`
 * and/or `click` it has its own backing, and its one button starts (and stops) the backing and the mic together. With the
 * mic the notes are labelled by degree or solfège (`labels`), never by bare name. Its settings show as tags (key, voice,
 * drone, click), and with the mic an accuracy row sets how close counts as on the note (the student's setting, shared).
 */
export function View({ slug, pc, voice, notes, enable, highlight, mute, hide, others, mic: micButton = true, drone = false, click = false, bpm = 60, labels }: { slug: string; pc: number; voice: keyof typeof VOICES; notes?: number[]; enable?: number[]; highlight?: number[]; mute?: number[]; hide?: number[]; others?: Others; mic?: boolean; drone?: boolean; click?: boolean; bpm?: number; labels?: SingingLabels }) {
  const range = VOICES[voice];
  // a staff has two looks, lit and dimmed: lit are the highlighted notes, or (nothing highlighted) the enabled ones
  const state = useMemo(() => {
    const pcs = (semis?: number[]) => semis?.map((semi) => (pc + semi) % 12);
    const v = { enable: pcs(enable), highlight: pcs(highlight), mute: pcs(mute), hide: pcs(hide), others };
    return (p: number) => noteState(v, p);
  }, [pc, enable, highlight, mute, hide, others]);
  const lit = useMemo(() => {
    const all = Array.from({ length: 12 }, (_, p) => p);
    const on = all.filter((p) => state(p) === (highlight?.length ? "highlighted" : "normal"));
    return on.length < 12 ? new Set(on) : undefined;
  }, [state, highlight]);
  const picked = useMemo(() => {
    const full = buildLadder(slug, pc, range);
    if (!full || !notes?.length) return full;
    // only the degrees asked for (the chord tones, say), not the whole scale: a tone outside the scale (the ♭7 over a major scale) is added
    const root = full.notes[0];
    const below = full.notes.filter((n) => n.midi - root.midi < 12);
    const flats = full.signature < 0;
    const out: typeof full.notes = [];
    for (let o = 0; o < 4; o++)
      for (const semi of notes) {
        const midi = root.midi + 12 * o + semi;
        if (midi > range.high && out.length >= 2) break;
        const inScale = below.find((n) => n.midi - root.midi === semi);
        const under = below.filter((n) => n.midi - root.midi <= semi).pop() ?? root;
        const name = inScale?.spelled.name ?? (flats ? FLAT : SHARP)[(pc + semi) % 12];
        out.push({ midi, spelled: spellName(name, midi, SEMI_TEXT[semi]), degree: (inScale ?? under).degree, label: SEMI_TEXT[semi] });
      }
    return out.length > 1 ? { ...full, notes: out, pcs: new Set(notes.map((semi) => (pc + semi) % 12)), title: `${full.title.split(" ")[0]}: ${notes.map((v) => SEMI_TEXT[v]).join(" ")}` } : full;
  }, [slug, pc, range, notes]);
  // hidden notes leave the staff
  const ladder = useMemo(() => {
    if (!picked) return picked;
    const kept = picked.notes.filter((n) => state(n.midi % 12) !== "hidden");
    return kept.length > 1 ? { ...picked, notes: kept } : picked;
  }, [picked, state]);
  const backing = useMemo(() => [...(drone ? ["drone" as const] : []), ...(click ? ["click" as const] : [])], [drone, click]);
  const [on, setOn] = useState(false);
  const stop = useCallback(() => setOn(false), []);
  const [played, setPlayed] = useState<number | null>(null);
  const pitch = useRef<number | null>(null);
  const smoother = useRef(createSmoother());
  const gaps = useRef(0);
  const onPitch = useCallback((p: Pitch | null) => {
    if (!p) {
      if (++gaps.current >= GAP_FRAMES) {
        pitch.current = null;
        smoother.current.reset();
      }
      return;
    }
    gaps.current = 0;
    pitch.current = hzToMidi(smoother.current.push(p));
  }, []);
  const [setting] = useLabelSystem();
  const system = staffLabelSystem(labels, micButton, setting);
  const [cents, pickAccuracy] = useAccuracy();
  const { status } = useMicPitch(on && micButton, undefined, onPitch);
  if (!ladder) return null;
  const tap = async (i: number) => {
    await wakeAudio();
    const midi = ladder.notes[i].midi;
    const piano = getSharedPiano();
    piano.noteOn(midi);
    setPlayed(i);
    setTimeout(() => {
      piano.noteOff(midi);
      setPlayed((p) => (p === i ? null : p));
    }, 700);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {(micButton || backing.length > 0) && (
          <MicButton on={on} onClick={() => { pitch.current = null; if (!on && backing.length) void wakeAudio(); setOn((v) => !v); }}
            offLabel={backing.length ? "Start" : "Sing with the mic"} onLabel={backing.length ? "Stop" : undefined} />
        )}
        {micButton && <InputChip status={status} />}
        {backing.length > 0 && <PracticeBacking bpm={bpm} keyPc={pc} parts={backing} on={on} onStop={stop} />}
        {status === "denied" && <span>microphone blocked in the browser</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{ladder.title}</Badge>
        <Badge>{VOICES[voice].label}</Badge>
        {drone && <Badge>Drone on {ladder.title.split(/[: ]/)[0]}</Badge>}
        {click && <Badge>Click {bpm} bpm</Badge>}
      </div>
      {micButton && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="uppercase tracking-wider text-slate-500">Accuracy</span>
          {ACCURACIES.map((a) => <Chip key={a.title} on={a.cents === cents} onClick={() => pickAccuracy(a.cents)} title={`Within ${a.cents} cents counts as on the note`}>{a.title}</Chip>)}
          <span className="whitespace-nowrap pl-1 tabular-nums text-slate-500">±{cents}¢</span>
        </div>
      )}
      <SingingStaff ladder={ladder} clef={clefFor(range)} pitch={pitch} played={played} onNote={(i) => void tap(i)} cents={cents} highlight={lit} labels={system} />
    </div>
  );
}
