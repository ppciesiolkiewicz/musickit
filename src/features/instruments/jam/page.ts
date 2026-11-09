import type { DroneParams } from "../drone/drone";
import type { LoopDeck } from "../loops/deck";
import type { LoopConfig } from "../loops/loops";
import type { JamRig, JamSaved } from "./rig";

/** The jam page's one save (`musickit.jam`): the rig's, and the loops' settings beside it (the rig knows nothing of loops). */
export type JamPageSave = Partial<JamSaved> & { loops?: Partial<LoopConfig>[] };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Open the jam page's save on its rig and deck. Without one, `oldDrone` (the drone page's `musickit.drone`, from before the jam)
 * sets the drone, so a saved sound is not lost. Saves from before the loops left the rig read the same.
 */
export function loadJamPage(rig: JamRig, deck: LoopDeck, saved: unknown, oldDrone: unknown) {
  if (isObject(saved)) {
    const s = saved as JamPageSave;
    rig.load(s);
    deck.load(s.loops);
    return;
  }
  if (isObject(oldDrone)) rig.loadDrone(oldDrone as Partial<DroneParams>);
}

/** The rig's save and the loops' settings, in one. */
export const saveJamPage = (rig: JamRig, deck: LoopDeck): JamPageSave => ({ ...rig.save(), loops: deck.save() });
