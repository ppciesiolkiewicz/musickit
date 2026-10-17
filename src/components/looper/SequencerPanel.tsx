"use client";

import { DroneControls, PatternBar, StepGrid } from "@/features/instruments";
import { INSTRUMENTS, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";
import type { SeqPatch } from "@/lib/looper/actions";
import { Slider, ibtn, Select } from "@/components/ui";

type Seq = LooperSnapshot["sequencers"][number];

/**
 * A sequencer's window: the step grid, or the drone's note and sound. It has no play button: a sequencer starts and stops from its
 * circle on the stage, on the beat, like a loop.
 */
export default function SequencerPanel({ engine, snap, id }: { engine: LooperEngine; snap: LooperSnapshot; id: string }) {
  const sq = snap.sequencers.find((x) => x.id === id);
  const seq = engine.getSequencer(id);
  if (!sq || !seq) return null;
  const head = <Routing engine={engine} snap={snap} id={id} sq={sq} />;
  if (sq.instrumentId === "drone") {
    return (
      <div className="flex min-w-0 flex-col gap-3 p-2">
        <DroneControls value={sq.drone} playing={sq.running} analyser={seq.droneAnalyser()} header={head} onChange={(drone) => engine.do({ type: "sequencer.set", id, patch: { drone } })} />
        <p className="text-[11px] text-slate-500">One held note made in the browser. It plays on the bus of the group its circle sits in, or master outside every group. Start and stop it from its circle; it joins on the next beat with a slow fade.</p>
      </div>
    );
  }
  const inst = INSTRUMENTS.find((i) => i.id === sq.instrumentId) ?? INSTRUMENTS[0];
  const strip = snap.inputs.find((i) => i.kind === "sequencer" && i.sourceId === id);
  const set = (patch: SeqPatch) => engine.do({ type: "sequencer.set", id, patch });
  return (
    <div className="flex min-w-0 flex-col gap-2 p-2">
      <PatternBar instrument={inst} bars={sq.bars} onPreset={(preset) => set({ preset })} onBars={(bars) => set({ bars })} onClear={() => set({ clear: true })}
        leading={head}
        trailing={strip && (
          <span className="flex items-center gap-1.5">
            <button type="button" className={`${ibtn} ${strip.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={strip.muted} onClick={() => engine.do({ type: "input.set", id: strip.id, patch: { muted: !strip.muted } })} title="Mute" aria-label={`Mute ${sq.name}`}>M</button>
            <Slider min={0} max={1} step={0.01} value={Math.min(1, strip.volume)} onChange={(v) => engine.do({ type: "input.set", id: strip.id, patch: { volume: v } })} className="w-24" aria-label={`Volume of ${sq.name}`} title={`Volume ${Math.round(strip.volume * 100)}%`} />
          </span>
        )} />
      <StepGrid instrument={inst} cells={sq.cells} steps={sq.steps} beatsPerBar={snap.metronome.beatsPerBar} position={() => seq.position()}
        onStep={(lane, step, value) => engine.do({ type: "sequencer.step", id, lane, step, value })} />
      <p className="text-[11px] text-slate-500">Sounds are made in the browser, nothing is downloaded. It plays in time with the click while you record or play, on the bus of the group its circle sits in, or master outside every group. Start and stop it from its circle; it joins on the next beat.</p>
    </div>
  );
}

/** The instrument and where the sound goes: the looper's own part of a sequencer's window. */
function Routing({ engine, snap, id, sq }: { engine: LooperEngine; snap: LooperSnapshot; id: string; sq: Seq }) {
  return (
    <>
      <Select value={sq.instrumentId} onChange={(instrument) => engine.do({ type: "sequencer.set", id, patch: { instrument } })} aria-label="Instrument" options={INSTRUMENTS.map((i) => ({ value: i.id, label: i.name }))} />
      <Select
        value={sq.dest}
        onChange={(dest) => engine.do({ type: "sequencer.dest", id, dest })}
        aria-label="Where the sound goes"
        title="Where the sound goes"
        options={[
          { value: "auto" as const, label: `${sq.groupId ? `To ${snap.groups.find((g) => g.id === sq.groupId)?.name ?? "its group"}` : "To master"} (by position)` },
          { value: "record" as const, label: "To the recorder (and master)" },
        ]}
      />
    </>
  );
}
