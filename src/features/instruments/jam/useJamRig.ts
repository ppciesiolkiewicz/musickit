"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getAudioContext, getOutputBus, wakeAudio } from "@/features/sound";
import { JamRig, type JamPart, type JamSaved } from "./rig";

/**
 * A `JamRig` for a page, the core both hosts share (the drone page's `Jam` and the `PocketTools`): the rig and its snapshot, the save
 * read back after hydration and written on every change, the audio made on a person's click (`ready`), and parts started and stopped
 * on the next beat. `restore` reads the host's save (older saves included); `save` turns the rig into what is stored.
 */
export default function useJamRig({ storageKey, followClick = false, restore, save = (rig) => rig.save() }: {
  storageKey: string;
  followClick?: boolean;
  restore: (rig: JamRig) => void;
  save?: (rig: JamRig) => Partial<JamSaved>;
}) {
  const [rig] = useState(() => new JamRig({ followClick }));
  const snap = useSyncExternalStore(rig.subscribe, rig.snapshot, rig.snapshot);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      restore(rig);
    } catch {
      /* storage blocked or a broken save: start fresh */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- saving starts once the save is back (after hydration)
    setRestored(true);
    return () => rig.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once, when the rig is made
  }, [rig]);
  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(save(rig)));
    } catch {
      /* private mode */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save is the host's, written on every change of the rig
  }, [rig, snap, restored, storageKey]);

  /** The audio, made on a person's click. */
  const ready = async () => {
    const ctx = getAudioContext();
    await wakeAudio();
    rig.attach(ctx, getOutputBus());
  };
  const start = async (parts: readonly JamPart[], withLoops = false) => {
    await ready();
    rig.start(parts, withLoops);
  };
  /** a part on or off, on the next beat */
  const toggle = (p: JamPart) => (snap.parts[p].state.playing ? rig.stop([p]) : void start([p]));

  return { rig, snap, restored, ready, start, toggle };
}
