"use client";

import { useStepPart } from "@/components/practice/exerciseStep";
import { BackingPlayer, TONICS, findProgression, findStyle, useBand } from "@/features/backing";

/**
 * The backing tracks player, set up by the plan: `progression` and `style` are backing ids, `keyPc` the key's pitch class.
 * No style: the progression's own; no bpm: the style's. Nothing is saved, so it opens as the plan set it every time. It is
 * a "band" part of its step, so "Start exercise" can start it with the rest.
 */
export function View({ progression, keyPc, style, bpm }: { progression: string; keyPc: number; style?: string; bpm?: number }) {
  const styleId = style ?? findProgression(progression).style;
  const { band, snap } = useBand({
    initial: { progression, tonic: TONICS[((keyPc % 12) + 12) % 12], style: styleId, bpm: bpm ?? findStyle(styleId).bpm },
    storageKey: null,
  });
  const group = useStepPart({ kind: "band", on: snap.playing, start: () => band.start(), stop: () => band.stop() });
  return <BackingPlayer band={band} snap={snap} group={group} />;
}
