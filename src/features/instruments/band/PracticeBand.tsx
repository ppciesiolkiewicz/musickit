"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { JamRig, type JamSaved } from "../jam/rig";
import useJamRig from "../jam/useJamRig";
import type { GrooveId } from "../sequencer/grooves";
import type { PocketStatus } from "../pocket/PocketTools";
import { resolveShow, restoreBand, type BandConfig, type BandView } from "./config";
import BarView from "./views/BarView";
import InlineView from "./views/InlineView";
import type { Band } from "./views/types";

export interface PracticeBandProps {
  view: BandView;
  config: BandConfig;
  storageKey: string;
  /** share a rig made by the host (the jam page, for its loops); otherwise the band makes its own */
  rig?: Band;
  /** inline: played by the host */
  on?: boolean;
  onToggle?: () => void;
  onStop?: () => void;
  group?: string;
  /** pocket: PocketTools' host props */
  pocket?: { stacked?: boolean; clickAlways?: boolean; onStatus?: (s: PocketStatus) => void; lines?: ReactNode; className?: string };
}

const noop = () => {};

/**
 * The play-along band: click, drone, drums and bass on one `JamRig` clock, drawn by `view` (`config.ts` has what each view
 * shows). With `rig` it plays on the host's rig; otherwise it makes its own, restored from `storageKey` (`restoreBand`: in
 * `bar` and `inline` the host's setup wins over the save on every mount).
 */
export default function PracticeBand(props: PracticeBandProps): ReactNode {
  return props.rig ? <Views {...props} band={props.rig} /> : <OwnBand {...props} />;
}

function Views({ band, view, config, on, onToggle, onStop, group }: PracticeBandProps & { band: Band }) {
  const show = resolveShow(view, config.show);
  switch (view) {
    case "inline":
      return <InlineView band={band} config={config} show={show} on={on ?? false} onToggle={onToggle} onStop={onStop ?? noop} group={group} />;
    case "full": // TODO(Task 6): FullView
    case "pocket": // TODO(Task 7): PocketView
    case "bar":
      return <BarView band={band} config={config} show={show} />;
  }
}

/** what the hidden "More" fold keeps while its parts play at their defaults */
type Kept = { parts: JamSaved["parts"]; groove: GrooveId | null };

/** The band on its own rig. In `bar` with `show.more` false, the drone octave and the patterns play at a fresh rig's; the saved ones stay and return with "More". */
function OwnBand(props: PracticeBandProps) {
  const { view, config, storageKey } = props;
  const hideFold = view === "bar" && !resolveShow(view, config.show).more;
  const kept = useRef<Kept | null>(null);
  const [defaults] = useState(() => {
    const fresh = new JamRig();
    const p = fresh.save().parts;
    fresh.dispose();
    return p;
  });
  /** the drums, bass and drone octave from `next` (the host's groove over the defaults); the rest stays */
  const loadParts = (rig: JamRig, next: Kept) => {
    const now = rig.save();
    rig.load({ ...now, parts: { drums: next.parts.drums, bass: next.parts.bass }, groove: next.groove });
    const octave = next.parts.drone?.drone?.octave;
    if (octave !== undefined) rig.setDrone({ octave });
  };
  const atDefaults = (rig: JamRig) => {
    loadParts(rig, { parts: defaults, groove: null });
    if (config.groove) rig.setGroove(config.groove);
  };
  const keep = (rig: JamRig): Kept => ({ parts: rig.save().parts, groove: rig.snapshot().groove });

  const restore = (rig: JamRig) => {
    let saved: Partial<JamSaved> | null = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as Partial<JamSaved> | null;
    } catch {
      /* storage blocked or a broken save: the host's setup still applies */
    }
    restoreBand(rig, view, config, saved);
    if (!hideFold) return;
    kept.current = keep(rig);
    atDefaults(rig);
  };
  const save = (rig: JamRig): Partial<JamSaved> => {
    const s = rig.save();
    return kept.current ? { ...s, parts: kept.current.parts, groove: kept.current.groove } : s;
  };
  const band = useJamRig({ storageKey, restore, save });

  // "More" hidden or shown again while mounted (the plan's detail level changed)
  const wasHidden = useRef(hideFold);
  useEffect(() => {
    if (wasHidden.current === hideFold) return;
    wasHidden.current = hideFold;
    if (hideFold) {
      kept.current = keep(band.rig);
      atDefaults(band.rig);
    } else if (kept.current) {
      const back = kept.current;
      kept.current = null;
      loadParts(band.rig, back);
    }
  });

  return <Views {...props} band={band} />;
}
