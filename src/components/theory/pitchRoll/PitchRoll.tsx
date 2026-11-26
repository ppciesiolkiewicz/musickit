"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToolSettings } from "@/features/settings";
import { midiToName } from "@/features/sound";
import { PIANO_SCALES, makeKey, type ScaleId } from "@/features/theory/piano/key";
import { createHeldNotes } from "@/features/theory/heldNotes";
import { useAccuracy } from "@/features/theory/useAccuracy";
import { useVoicePitch } from "@/features/exercises/basics/voicePitch";
import { micStatusMessage } from "@/components/InputChip";
import MicButton from "@/components/theory/singing/MicButton";
import { FullScreenButton, FullScreenFrame } from "@/components/practice/fullScreen";
import { PianoSettings } from "@/components/theory/piano/PianoSettings";
import RollCanvas, { HI, LO, WINDOW_S, type Sample } from "./RollCanvas";

/**
 * A pitch detector drawn as a full piano roll: a row for every key of the piano, the keys down the left, and the pitch the
 * mic hears as a line that runs right to left over the last few seconds. A note held for a moment shows as a bar on its
 * row (caught by Easy's band), green when it is as close as the accuracy picked, as is the dot. The key and scale only
 * tint their keys and rows yellow. The controls sit above the roll (key, scale, volume and accuracy too: no side panel); Full screen makes it a page modal (Esc closes it).
 * The readings live here, so they carry on into full screen and back; the roll itself is `RollCanvas`.
 */
export default function PitchRoll() {
  const [tonicPc, setTonicPc] = useState(0);
  const [scale, setScale] = useState<ScaleId>("major");
  const [on, setOn] = useState(false);
  const [full, setFull] = useState(false);
  const closeFull = useCallback(() => setFull(false), []);
  const [heard, setHeard] = useState<{ midi: number; cents: number } | null>(null);
  const [cents] = useAccuracy();
  const key = useMemo(() => makeKey(tonicPc, scale), [tonicPc, scale]);
  const scaleName = `${key.tonic} ${PIANO_SCALES.find((s) => s.id === scale)?.name.toLowerCase()}`;
  const { pitch, status } = useVoicePitch(on);

  const samples = useRef<Sample[]>([]);
  const held = useRef(createHeldNotes());

  // listening: a reading a frame into the line and the held notes, the readout ten times a second
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let lastReadout = 0;
    const tick = () => {
      const now = performance.now();
      const midi = pitch.current;
      const inRange = midi !== null && midi >= LO - 0.5 && midi <= HI + 0.5 ? midi : null;
      samples.current.push({ t: now, midi: inRange });
      while (samples.current.length && now - samples.current[0].t > WINDOW_S * 1000 + 500) samples.current.shift();
      held.current.push(now, inRange);
      held.current.prune(now - WINDOW_S * 1000 - 500);
      if (now - lastReadout > 100) {
        lastReadout = now;
        setHeard(inRange === null ? null : { midi: Math.round(inRange), cents: Math.round((inRange - Math.round(inRange)) * 100) });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, pitch]);

  const toggle = () => {
    if (on) {
      samples.current = [];
      held.current.reset();
      setHeard(null);
    }
    setOn(!on);
  };

  const changeKey = (pc: number, s: ScaleId) => {
    setTonicPc(pc);
    setScale(s);
  };
  const message = micStatusMessage(status);
  return (
      <FullScreenFrame full={full} onClose={closeFull} label="Pitch roll">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-2">
          <MicButton on={on} onClick={toggle} />
          <div className="flex items-baseline gap-2 tabular-nums" aria-live="polite">
            <span className={`text-2xl font-semibold ${heard ? "text-slate-100" : "text-slate-600"}`}>{heard ? midiToName(heard.midi) : "–"}</span>
            {heard && (
              <span className={`text-sm ${Math.abs(heard.cents) <= cents ? "text-emerald-300" : "text-sky-300"}`}>
                {heard.cents > 0 ? "+" : ""}{heard.cents} cents
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <PianoSettings look="inline" tonicPc={tonicPc} scale={scale} onChange={changeKey} />
            <ToolSettings accuracy />
            <FullScreenButton full={full} onClick={() => setFull(!full)} description="Enlarges the piano roll. Esc closes it." />
          </div>
        </div>
        {message && <p className="text-sm text-amber-300">{message}</p>}
        <RollCanvas key={full ? "full" : "page"} full={full} live={on} samples={samples} held={held} cents={cents} keyContext={key} scaleName={scaleName} />
      </FullScreenFrame>
  );
}
