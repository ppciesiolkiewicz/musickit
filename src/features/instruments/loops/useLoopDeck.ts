"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getAudioContext, getOutputBus, openLiveInput, readDeviceChoice, subscribeDeviceChoice } from "@/features/sound";
import type { JamRig } from "../jam/rig";
import { LoopDeck } from "./deck";
import type { AppInput } from "./loops";

/** The app's one input, for the loops that record it. */
export const APP_INPUT: AppInput = { id: () => readDeviceChoice().input?.id ?? "", channel: () => readDeviceChoice().channel, subscribe: subscribeDeviceChoice, publish: openLiveInput };

/**
 * A `LoopDeck` on `rig`'s clock, for a page: the deck and its snapshot. It follows the rig while mounted and lets go of its audio when
 * unmounted (its settings stay). The host loads and saves its settings (`deck.load`, `deck.save`). `ready` makes its audio, on the app's
 * output with the app's input: call it from a person's click, after the rig's own `ready`. A host that loads the deck in the rig's
 * restore makes it first and hands it over as `given` (kept for the hook's life).
 */
export default function useLoopDeck(rig: JamRig, given?: LoopDeck) {
  const [deck] = useState(() => given ?? new LoopDeck());
  const snap = useSyncExternalStore(deck.subscribe, deck.snapshot, deck.snapshot);
  useEffect(() => {
    const unfollow = rig.follow(deck);
    return () => {
      unfollow();
      deck.dispose();
    };
  }, [rig, deck]);
  const ready = () => deck.attach(getAudioContext(), getOutputBus(), APP_INPUT);
  return { deck, snap, ready };
}
