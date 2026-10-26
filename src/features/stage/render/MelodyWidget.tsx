"use client";

import { useContext, type RefObject } from "react";
import MelodyStaff from "@/components/theory/singing/MelodyStaff";
import { TimelineContext } from "./TimelineContext";

/** nobody sings in a video: the staff's voice dot has no pitch to follow */
const NO_PITCH: RefObject<number | null> = { current: null };
const NOOP = () => {};

/** The host's melody on a following staff, `beats` across; nothing outside a timeline or between tunes. */
export default function MelodyWidget({ beats }: { beats?: number }) {
  const tl = useContext(TimelineContext);
  const m = tl?.melody;
  if (!tl || !m) return null;
  // keyed by the notes so a new tune starts clean
  const key = m.notes.map((n) => `${n.midi}@${n.at}`).join(",");
  return (
    <MelodyStaff
      key={key}
      notes={m.notes}
      ladder={m.ladder}
      clef={m.clef}
      live
      follow
      followBeats={beats ?? 10}
      pitch={NO_PITCH}
      playFrom={null}
      beatMs={m.beatMs}
      gridBeats={tl.gridBeats}
      tapped={null}
      onNote={NOOP}
    />
  );
}
