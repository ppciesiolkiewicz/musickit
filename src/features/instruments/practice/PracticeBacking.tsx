"use client";

import { useEffect } from "react";
import { useAudioFocus } from "@/features/sound";
import Icon from "@/components/Icon";
import { MAX_BPM, MIN_BPM } from "../jam/clock";
import { JAM_PARTS, type JamRig } from "../jam/rig";
import useJamRig from "../jam/useJamRig";
import BeatDots from "../jam/BeatDots";
import { NOTE_NAMES } from "../drone/drone";
import { MuteButton } from "../sequencer/PartLevel";
import type { BandPart } from "./PracticeBand";

/**
 * A click and/or drone backing component for practice exercises: it plays while `on`, provides start/stop and
 * mute controls for drone and click, and beat dots. Another source taking the audio focus, or the backing scrolling away,
 * calls `onStop` so the host stops the rest with it. The host's setup wins over the save, as in `PracticeBand`.
 */
export default function PracticeBacking({ bpm, keyPc, parts, on, onToggle, onStop, group }: { bpm: number; keyPc: number; parts: BandPart[]; on: boolean; onToggle?: () => void; onStop: () => void; /** the audio focus group it plays in (`useAudioFocus`) */ group?: string }) {
  const restore = (rig: JamRig) => {
    rig.setTempo(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)));
    rig.setDrone({ root: keyPc });
  };
  const { rig, snap, start } = useJamRig({ storageKey: "musickit.practiceBand", restore });
  const click = parts.includes("click");
  const jam = JAM_PARTS.filter((p) => parts.includes(p));
  const hasDrone = jam.includes("drone");
  const backingWords = hasDrone && click ? "drone and metronome" : hasDrone ? "drone" : "metronome";

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

  const what = [...(hasDrone ? [`Drone ${NOTE_NAMES[snap.parts.drone.state.drone.root]}`] : []), ...(click ? [`click ${snap.bpm} bpm`] : [])].join(" · ");
  return (
    <span ref={focus} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={on}
          title={on ? `Stop the ${backingWords}` : `Play the ${backingWords}`}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"}`}
        >
          <Icon name={on ? "square" : "play"} size={13} fill />
          {on ? "Stop" : "Play"}
        </button>
      )}
      {on && hasDrone && (
        <MuteButton
          name="drone"
          muted={snap.parts.drone.muted}
          onMute={(m) => rig.setLevel("drone", { muted: m })}
        />
      )}
      {on && click && (
        <MuteButton
          name="metronome"
          muted={snap.click.muted}
          onMute={(m) => rig.setClickMuted(m)}
        />
      )}
      <span className="tabular-nums">{what}</span>
      {click && <BeatDots rig={rig} playing={on} />}
    </span>
  );
}
