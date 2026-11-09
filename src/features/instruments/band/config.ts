import type { GrooveId } from "../sequencer/grooves";
import type { JamPart, JamRig } from "../jam/rig";

/** How the band looks: the whole jam page, the pocket tools' lines, one folded line, or the beat dots with the levels only. */
export type BandView = "full" | "pocket" | "bar" | "inline";
/** A part the band can play: the click or one of the jam's parts. `plan/model/tools.ts` keeps its own identical copy. */
export type BandPart = "click" | JamPart;
export type ShowFlag = "partChips" | "tempo" | "tempoSlider" | "beats" | "key" | "levels" | "groove" | "patterns" | "droneSound" | "more";

export interface BandConfig {
  parts: BandPart[];
  bpm?: number;
  keyPc?: number;
  groove?: GrooveId;
  droneOctave?: number;
  /** overrides single flags of the view's rules */
  show?: Partial<Record<ShowFlag, boolean>>;
}

const row = (partChips: boolean, tempo: boolean, tempoSlider: boolean, beats: boolean, key: boolean, levels: boolean, groove: boolean, patterns: boolean, droneSound: boolean, more: boolean): Record<ShowFlag, boolean> => ({
  partChips, tempo, tempoSlider, beats, key, levels, groove, patterns, droneSound, more,
});

/** What each view shows. In `bar`, the tempo slider, groove and patterns sit in the "More" fold; `more: false` hides it and they play at their defaults. */
export const VIEW_SHOW: Record<BandView, Record<ShowFlag, boolean>> = {
  full: row(false, true, true, true, true, true, true, true, true, false),
  pocket: row(false, true, true, true, false, true, true, true, true, false),
  bar: row(true, true, true, true, true, false, true, true, false, true),
  inline: row(false, false, false, true, false, true, false, false, false, false),
};

export const resolveShow = (view: BandView, show?: BandConfig["show"]): Record<ShowFlag, boolean> => ({ ...VIEW_SHOW[view], ...show });

/** In `bar` and `inline` the host sets bpm, key and groove, and wins over the save on every mount. */
export const hasHostSetup = (view: BandView): boolean => view === "bar" || view === "inline";

/** Applies only what the config gives: the tempo (the rig clamps it), the drone's key and octave, the groove. */
export function applySetup(rig: JamRig, c: BandConfig) {
  if (c.bpm !== undefined) rig.setTempo(c.bpm);
  const drone: { root?: number; octave?: number } = {};
  if (c.keyPc !== undefined) drone.root = c.keyPc;
  if (c.droneOctave !== undefined) drone.octave = c.droneOctave;
  if (Object.keys(drone).length) rig.setDrone(drone);
  if (c.groove !== undefined) rig.setGroove(c.groove);
}
