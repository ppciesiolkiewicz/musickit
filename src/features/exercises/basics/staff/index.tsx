"use client";

import { noteState, type Others } from "../../cues/visibility";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMicPitch } from "@/components/practice/useMicPitch";
import MicButton from "@/components/theory/singing/MicButton";
import InputChip from "@/components/InputChip";
import SingingStaff from "@/components/theory/singing/SingingStaff";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import ToolSettings from "@/components/practice/ToolSettings";
import { IN_TUNE_CENTS, VOICES, buildLadder, clefFor, hzToMidi, spellName, withNotesUnder } from "@/features/theory/singing";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import type { ExternalInput } from "@/features/tuner";
import { staffLabelSystem, type SingingLabels } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { useAccuracy } from "@/features/theory/useAccuracy";
import { Badge, Hint } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { useLevelAtLeast } from "@/features/guide/Tier";
import { useStepPart } from "@/components/practice/exerciseStep";
import dynamic from "next/dynamic";

const PracticeBacking = dynamic(() => import("@/features/instruments").then((m) => m.PracticeBacking), { ssr: false });

const FLAT = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];

/** frames without a pitch before the dot on the staff goes away */
const GAP_FRAMES = 6;

/**
 * The scale on a staff in the voice's range, with the microphone's pitch drawn on it; tap a note to hear it. "Start
 * microphone" switches the mic on and off. With `drone` and/or `click` it has its own backing with its own Play; in an
 * exercise step both are parts of the step's "Start exercise" (`useStepPart`), which starts them together. With the
 * mic the notes are labelled by degree or solfège (`labels`), never by bare name. Its settings show as tags (key, voice,
 * drone, click), and with the mic an accuracy row sets how close counts as on the note (the student's setting, shared).
 * Given an `external` input (the teacher studio's one audio input) it opens no microphone and shows no input chip: it draws that
 * input's pitch, and Start / Stop is the host's. Not a plan prop: plan output never sets it.
 */
export function View({ slug, pc, voice, notes, under = false, enable, highlight, mute, hide, others, mic: micButton = true, drone = false, click = false, bpm = 60, labels, external }: { slug: string; pc: number; voice: keyof typeof VOICES; notes?: number[]; under?: boolean; enable?: number[]; highlight?: number[]; mute?: number[]; hide?: number[]; others?: Others; mic?: boolean; drone?: boolean; click?: boolean; bpm?: number; labels?: SingingLabels; external?: ExternalInput }) {
  useCoverage({ hints: 3 });
  const range = VOICES[voice];
  // three looks: highlighted notes ringed, enabled ones plain, muted ones faint
  const state = useMemo(() => {
    const pcs = (semis?: number[]) => semis?.map((semi) => (pc + semi) % 12);
    const v = { enable: pcs(enable), highlight: pcs(highlight), mute: pcs(mute), hide: pcs(hide), others };
    return (p: number) => noteState(v, p);
  }, [pc, enable, highlight, mute, hide, others]);
  const ringed = useMemo(() => {
    const on = Array.from({ length: 12 }, (_, p) => p).filter((p) => state(p) === "highlighted");
    return on.length ? new Set(on) : undefined;
  }, [state]);
  const picked = useMemo(() => {
    const ladder = pickLadder();
    // with `under`, the same notes an octave down, under the lowest Do (Ti under Do), as far as the voice goes
    return ladder && under ? withNotesUnder(ladder, range) : ladder;
  }, [slug, pc, range, notes, under]); // eslint-disable-line react-hooks/exhaustive-deps
  function pickLadder() {
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
  }
  // hidden notes leave the staff
  const ladder = useMemo(() => {
    if (!picked) return picked;
    const kept = picked.notes.filter((n) => state(n.midi % 12) !== "hidden");
    return kept.length > 1 ? { ...picked, notes: kept } : picked;
  }, [picked, state]);
  const backing = useMemo(() => [...(drone ? ["drone" as const] : []), ...(click ? ["click" as const] : [])], [drone, click]);
  const [micOn, setMicOn] = useState(false);
  const [backingOn, setBackingOn] = useState(false);
  const stopBacking = useCallback(() => setBackingOn(false), []);
  const startBacking = useCallback(() => {
    void wakeAudio();
    setBackingOn(true);
  }, []);
  const toggleBacking = useCallback(() => {
    if (backingOn) stopBacking();
    else startBacking();
  }, [backingOn, stopBacking, startBacking]);

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
  // the settings are a Standard control; hidden, the accuracy is the default one (the stored setting returns with them)
  const settings = useLevelAtLeast("standard");
  const [storedCents] = useAccuracy();
  const cents = settings ? storedCents : IN_TUNE_CENTS;
  const { status } = useMicPitch(micOn && micButton && !external, undefined, onPitch);
  const listening = external ? external.listening : micOn;
  // the host's pitch comes smoothed: drawn as it is
  const externalHz = external ? external.hz : undefined;
  useEffect(() => {
    if (externalHz !== undefined) pitch.current = externalHz === null ? null : hzToMidi(externalHz);
  }, [externalHz]);
  const startMic = useCallback(async () => {
    await wakeAudio();
    pitch.current = null;
    setMicOn(true);
    if (backing.length > 0 && !backingOn) {
      startBacking();
    }
  }, [backing.length, backingOn, startBacking]);
  const stopMic = useCallback(() => {
    setMicOn(false);
    if (backingOn) {
      stopBacking();
    }
  }, [backingOn, stopBacking]);
  useStepPart({ kind: micButton && !external && "mic", on: micOn, start: startMic, stop: stopMic });
  const group = useStepPart({ kind: backing.length > 0 && backing[0], on: backingOn, start: startBacking, stop: stopBacking });
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
        {micButton && (
          <span data-tour="staff-mic" className="inline-flex items-center gap-2">
            {/* the host's input has its own device dialog, so here it is only a switch */}
            {external ? (
              <Hint title="Mic" description="Listens to your voice and draws the note you sing on the staff.">
                <MicButton on={listening} onClick={external.onToggle} />
              </Hint>
            ) : (
              <Hint title="Mic" description="Draws the note you sing on the staff. Starts the microphone and opens the list of inputs, with each input's level. Stop it from the list.">
                <InputChip status={status} mic={{ on: micOn, onToggle: () => (micOn ? stopMic() : void startMic()) }} />
              </Hint>
            )}
          </span>
        )}
        {backing.length > 0 && (
          <span data-tour="staff-backing" className="inline-flex items-center gap-2">
            <PracticeBacking bpm={bpm} keyPc={pc} parts={backing} on={backingOn} onToggle={backingOn || !micButton || external ? toggleBacking : () => void startMic()} onStop={stopBacking} group={group} />
          </span>
        )}
        {status === "denied" && <span>microphone blocked in the browser</span>}
        <span className="ml-auto" />
        {/* labels written into the exercise don't follow the setting, so there is nothing to pick */}
        {settings && (
          <span data-tour="staff-settings">
            <Hint title="Settings" description="How the notes are named, how close counts as on the note, and the volume.">
              <ToolSettings labels={labels ? undefined : system} omit={micButton ? ["note"] : []} accuracy={micButton} />
            </Hint>
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{ladder.title}</Badge>
        <Badge>{VOICES[voice].label}</Badge>
        {drone && <Badge>Drone on {ladder.title.split(/[: ]/)[0]}</Badge>}
        {click && <Badge>Click {bpm} bpm</Badge>}
        {micButton && <Badge>Accuracy ±{cents}¢</Badge>}
      </div>
      <div data-tour="staff-notes">
      <SingingStaff ladder={ladder} clef={clefFor(range)} pitch={pitch} played={played} onNote={(i) => void tap(i)} cents={cents} highlight={ringed} muted={(i) => state(ladder.notes[i].midi % 12) === "muted"} labels={system} />
      </div>
    </div>
  );
}
