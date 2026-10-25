"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BarRow, ScaleSettingsBar, WithSettings } from "@/components/chordKit/ScaleSettings";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { Button, Chip } from "@/components/ui";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { VOICES, buildLadder, hzToMidi, type Voice } from "@/features/theory/singing";
import SingingStaff from "./SingingStaff";
import { panel } from "@/components/practice/shared";

/** null readings in a row before the voice counts as stopped (about 100 ms), so one dropped frame doesn't break the line */
const GAP_FRAMES = 6;

/**
 * Sing the notes of a scale against its staff: pick the key, the scale and the voice range in the settings bar (with
 * the drone and the metronome from the scales pages), switch the mic on, and a dot follows your voice over the notes.
 */
export default function SingingApp() {
  const [tonicPc, setTonicPc] = useState(DEFAULT_KEY_PC);
  const [scale, setScale] = useState("major-ionian");
  const [voice, setVoice] = useState<Voice>("high");
  const [mic, setMic] = useState(false);
  const ladder = useMemo(() => buildLadder(scale, tonicPc, voice) ?? buildLadder("major-ionian", tonicPc, voice)!, [scale, tonicPc, voice]);

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
  const { status } = useMicPitch(mic, undefined, onPitch);

  const message =
    status === "asking" ? "Allow the microphone in your browser…"
    : status === "denied" ? "Microphone blocked. Allow it in the browser's site settings and try again."
    : status === "insecure" ? "The browser only allows the microphone on a secure (https) page."
    : status === "error" ? "No microphone found."
    : status === "on" ? "Listening. Sing the scale up from the root: the dot turns green on a note of the scale, red on a note outside it."
    : "Start the drone on the root if you like, then switch the mic on and sing.";

  return (
    <WithSettings
      side={false}
      bar={
        <ScaleSettingsBar tonicPc={tonicPc} onTonic={setTonicPc} scale={scale} onScale={setScale} labels={false}>
          <BarRow label="Voice">
            {(Object.keys(VOICES) as Voice[]).map((v) => (
              <Chip key={v} on={v === voice} onClick={() => setVoice(v)}>{VOICES[v].label}</Chip>
            ))}
          </BarRow>
        </ScaleSettingsBar>
      }
    >
      <section className={`${panel} flex flex-col gap-3`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-medium text-slate-100">{ladder.title}</h2>
          <Button size="sm" pressed={mic} onClick={() => { pitch.current = null; setMic((v) => !v); }} className={mic ? "!border-emerald-400/70 !bg-emerald-500/20 !text-emerald-100" : ""}>
            {mic ? "Stop the mic" : "Start the mic"}
          </Button>
          <p className="min-w-0 basis-full text-sm sm:basis-0 sm:flex-1 text-slate-400" aria-live="polite">{message}</p>
        </div>
        <SingingStaff ladder={ladder} clef={VOICES[voice].clef} pitch={pitch} />
      </section>
    </WithSettings>
  );
}
