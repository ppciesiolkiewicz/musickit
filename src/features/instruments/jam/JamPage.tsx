"use client";

import { useEffect, useState } from "react";
import PracticeBand from "../band/PracticeBand";
import type { BandConfig } from "../band/config";
import { PART_TONE, PartCard } from "../band/views/PartCard";
import Loops from "../loops/LoopList";
import { LoopDeck } from "../loops/deck";
import useLoopDeck from "../loops/useLoopDeck";
import { loadJamPage, saveJamPage } from "./page";
import useJamRig from "./useJamRig";

const KEY = "musickit.jam";
/** where the drone page kept its drone before the jam: read when there is no jam save, so a saved sound is not lost */
const OLD_DRONE_KEY = "musickit.drone";
const CONFIG: BandConfig = { parts: ["click", "drone", "drums", "bass"] };

/** a stored value, or null when it is missing or broken */
function read(key: string): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

/**
 * The metronome-drone page's band: the `full` PracticeBand on a rig with a following click, and under it the loops (a `LoopDeck`
 * following the same rig). One save, `musickit.jam`: the rig's and the loops' settings beside it (`jam/page.ts`).
 */
export default function JamPage() {
  // made before the rig, so the rig's restore and save can reach it
  const [deck] = useState(() => new LoopDeck());
  const band = useJamRig({ storageKey: KEY, followClick: true, restore: (rig) => loadJamPage(rig, deck, read(KEY), read(OLD_DRONE_KEY)), save: (rig) => saveJamPage(rig, deck) });
  const loops = useLoopDeck(band.rig, deck);
  /** the audio of the parts and the loops, made on a person's click */
  const ready = async () => {
    await band.ready();
    loops.ready();
  };
  // names show only once the microphone is allowed; this never asks
  useEffect(() => void deck.refreshDevices(), [deck]);

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-8">
      <PracticeBand view="full" rig={band} ready={ready} storageKey={KEY} config={CONFIG} />
      <div className="px-1 sm:px-2 lg:px-4">
        <PartCard tone={PART_TONE.loops} label="Loops" tour="jam-loops">
          <Loops deck={deck} ready={ready} />
        </PartCard>
      </div>
    </div>
  );
}
