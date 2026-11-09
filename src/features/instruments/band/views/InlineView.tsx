"use client";

import { useEffect } from "react";
import { useAudioFocus } from "@/features/sound";
import Icon from "@/components/Icon";
import { JAM_PARTS } from "../../jam/rig";
import BeatDots from "../../jam/BeatDots";
import { NOTE_NAMES } from "../../drone/drone";
import { MuteButton } from "../../sequencer/PartLevel";
import type { ViewProps } from "./types";

export interface InlineProps {
  /** plays while set: the host keeps it */
  on: boolean;
  /** the host's own Play beside it; none, no button */
  onToggle?: () => void;
  /** another source took the audio focus, or it scrolled away */
  onStop: () => void;
  /** the audio focus group it plays in (`useAudioFocus`) */
  group?: string;
}

/**
 * The band's parts with no part chips, started by its host (the staff's Play beside the mic): it plays while `on`, shows what
 * plays, a mute for the drone and the click, and the beat dots. Another source taking the audio focus, or the band scrolling
 * away, calls `onStop` so the host stops the rest with it.
 */
export default function InlineView({ band, config, show, on, onToggle, onStop, group }: ViewProps & InlineProps) {
  const { rig, snap, start } = band;
  const parts = config.parts;
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
      {show.levels && on && hasDrone && (
        <MuteButton
          name="drone"
          muted={snap.parts.drone.muted}
          onMute={(m) => rig.setLevel("drone", { muted: m })}
        />
      )}
      {show.levels && on && click && (
        <MuteButton
          name="metronome"
          muted={snap.click.muted}
          onMute={(m) => rig.setClickMuted(m)}
        />
      )}
      <span className="tabular-nums">{what}</span>
      {show.beats && click && <BeatDots rig={rig} playing={on} />}
    </span>
  );
}
