"use client";

import { useEffect } from "react";
import { useAudioFocus } from "@/features/sound";
import { MAX_BPM, MIN_BPM } from "../jam/clock";
import { JAM_PARTS, type JamRig } from "../jam/rig";
import useJamRig from "../jam/useJamRig";
import BeatDots from "../jam/BeatDots";
import { NOTE_NAMES } from "../drone/drone";
import type { BandPart } from "./PracticeBand";

/**
 * A click and/or drone with no play button, started and stopped by its host's own control (the staff's Play beside its
 * mic): it plays while `on`. Shows what it plays and the beat dots. Another source taking the audio focus, or the backing
 * scrolling away, calls `onStop` so the host stops the rest with it. The host's setup wins over the save, as in `PracticeBand`.
 */
export default function PracticeBacking({ bpm, keyPc, parts, on, onStop, group }: { bpm: number; keyPc: number; parts: BandPart[]; on: boolean; onStop: () => void; /** the audio focus group it plays in (`useAudioFocus`) */ group?: string }) {
  const restore = (rig: JamRig) => {
    rig.setTempo(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)));
    rig.setDrone({ root: keyPc });
  };
  const { rig, snap, start } = useJamRig({ storageKey: "musickit.practiceBand", restore });
  const click = parts.includes("click");
  const jam = JAM_PARTS.filter((p) => parts.includes(p));

  useEffect(() => {
    if (!on) {
      rig.stop(JAM_PARTS);
      rig.setClick(false);
      return;
    }
    void start(jam).then(() => {
      if (!click) return;
      rig.setClickMuted(false);
      rig.setClick(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follows `on` only; the parts are the host's fixed setup
  }, [on, rig]);
  const focus = useAudioFocus(on, onStop, group);

  const what = [...(jam.includes("drone") ? [`Drone ${NOTE_NAMES[snap.parts.drone.state.drone.root]}`] : []), ...(click ? [`click ${snap.bpm} bpm`] : [])].join(" · ");
  return (
    <span ref={focus} className="inline-flex items-center gap-2 text-xs text-slate-400">
      {what}
      {click && <BeatDots rig={rig} playing={on} />}
    </span>
  );
}
