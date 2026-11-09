"use client";

import { useStepPart } from "@/components/practice/exerciseStep";
import { BackingPlayer, PARTS, TONICS, findProgression, findStyle, useBand, type Part } from "@/features/backing";

/**
 * The backing tracks player, set up by the plan: `progression` and `style` are backing ids, `keyPc` the key's pitch class,
 * `numerals` the lesson's own chords in that key (they play instead of `progression`), `parts` each part's mode ("off" starts
 * muted, "always" has no mute, a part left out is silent and has no row; absent: all "on").
 * No style: the progression's own (ballad for numerals); no bpm: the style's. Nothing is saved, so it opens as the plan
 * set it every time. It is a "band" part of its step, so "Start exercise" can start it with the rest.
 */
export function View({ progression, numerals, keyPc, style, bpm, parts }: { progression?: string; numerals?: string[]; keyPc: number; style?: string; bpm?: number; parts?: Partial<Record<Part, "on" | "off" | "always">> }) {
  const styleId = style ?? (numerals?.length || !progression ? "ballad" : findProgression(progression).style);
  const { band, snap } = useBand({
    initial: {
      ...(progression ? { progression } : {}),
      numerals: numerals?.length ? numerals : null,
      tonic: TONICS[((keyPc % 12) + 12) % 12],
      style: styleId,
      bpm: bpm ?? findStyle(styleId).bpm,
      levels: Object.fromEntries(PARTS.map((p) => [p, { muted: !!parts && (!parts[p] || parts[p] === "off") }])),
    },
    storageKey: null,
  });
  const group = useStepPart({ kind: "band", on: snap.playing, start: () => band.start(), stop: () => band.stop() });
  return <BackingPlayer band={band} snap={snap} group={group} scale={false} parts={parts} />;
}
