import type useJamRig from "../../jam/useJamRig";
import type { BandConfig, ShowFlag } from "../config";

/** What `useJamRig` gives: the rig, its snapshot and start helpers. */
export type Band = ReturnType<typeof useJamRig>;

/** What every view takes from the container. */
export interface ViewProps {
  band: Band;
  config: BandConfig;
  show: Record<ShowFlag, boolean>;
}
