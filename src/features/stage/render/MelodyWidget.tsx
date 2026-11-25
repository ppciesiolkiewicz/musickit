"use client";

import { useContext, type RefObject } from "react";
import MelodyStaff from "@/components/theory/singing/MelodyStaff";
import { TimelineContext } from "./TimelineContext";

/** nobody sings in a video: the staff's voice dot has no pitch to follow */
const NO_PITCH: RefObject<number | null> = { current: null };
const NOOP = () => {};
/** notes ride in from the right and off to the left through a fade, never cut through at the edge */
const FADE = "linear-gradient(to right, transparent, black 4%, black 86%, transparent)";

/**
 * The host's melody on a following staff, `beats` across, its view riding the bar steadily; nothing outside a timeline or
 * between tunes. The host writes every pass out, so there is no faded lead: the staff starts on beat 1. The clef and the
 * time signature ride off with the tune, so the notes have the whole width.
 */
export default function MelodyWidget({ beats }: { beats?: number }) {
  const tl = useContext(TimelineContext);
  const m = tl?.melody;
  if (!tl || !m) return null;
  // keyed by the notes so a new tune starts clean
  const key = m.notes.map((n) => `${n.midi}@${n.at}`).join(",");
  return (
    <div style={{ maskImage: FADE, WebkitMaskImage: FADE }}>
      <MelodyStaff
        key={key}
        notes={m.notes}
        chords={m.chords}
        ladder={m.ladder}
        clef={m.clef}
        live
        follow
        followBeats={beats ?? 10}
        steadyCamera
        headScrolls
        lead={false}
        pitch={NO_PITCH}
        playFrom={null}
        beatMs={m.beatMs}
        gridBeats={tl.gridBeats}
        tapped={null}
        onNote={NOOP}
      />
    </div>
  );
}
