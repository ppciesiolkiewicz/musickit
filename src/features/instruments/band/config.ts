import type { GrooveId } from "../sequencer/grooves";
import type { JamPart, JamRig, JamSaved } from "../jam/rig";
import type { ClickParams } from "../click/click";
import type { DroneParams } from "../drone/drone";

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

/**
 * A mount's restore: the save, then, in `bar` and `inline`, the host's setup over it; in `full` and `pocket` the save wins.
 * In `bar` and `inline` the saved part levels stay behind, so every part is heard (the bar has no mute to undo one).
 */
export function restoreBand(rig: JamRig, view: BandView, config: BandConfig, saved: Partial<JamSaved> | null) {
  if (view === "pocket" && saved && typeof saved === "object" && !saved.parts) {
    restoreOldPocket(rig, saved as OldPocketSave);
    return;
  }
  if (!hasHostSetup(view)) {
    rig.load(saved);
    return;
  }
  if (saved) rig.load({ ...saved, levels: undefined });
  applySetup(rig, config);
}

/** The first pocket save held only a drone and a click; read it so those settings are not lost. */
type OldPocketSave = { click?: Partial<ClickParams>; drone?: Partial<DroneParams> };

function restoreOldPocket(rig: JamRig, saved: OldPocketSave) {
  if (saved.drone) rig.loadDrone(saved.drone);
  if (typeof saved.click?.bpm === "number") rig.setTempo(saved.click.bpm);
  if (typeof saved.click?.volume === "number") rig.setClickVolume(saved.click.volume);
}
