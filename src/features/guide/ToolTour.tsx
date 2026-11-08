"use client";

import { useState } from "react";
import { AttentionRing, Button, Tour } from "@/components/ui";
import { useAttentionTurn } from "./attention";
import { visibleSteps, type TourStep } from "./tour";
import { TOOL_TOURS, toolTourId } from "./toolTours";
import { useLevel } from "./useLevel";
import { useTourSeen } from "./useTourSeen";

/**
 * An exercise tool's own tour button, for the tool's frame: walks `TOOL_TOURS[type]` inside `root` only (the frame), so
 * two tools of a kind on one page each light up their own controls. Until it is first clicked (seen once per tool type)
 * it wobbles, but only when it is the first such button on the page; the rest wait their turn.
 */
export default function ToolTour({ type, root }: { type: string; root: HTMLElement | null }) {
  const tour = TOOL_TOURS[type as keyof typeof TOOL_TOURS];
  const { level } = useLevel();
  const [seen, markSeen] = useTourSeen(toolTourId(type));
  const turn = useAttentionTurn(!!tour && !seen, root);
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  if (!tour) return null;
  const name = type.replace(/-/g, " ");
  const start = () => {
    markSeen();
    const shown = visibleSteps(tour, level, (t) => !!root?.querySelector(`[data-tour="${CSS.escape(t)}"]`));
    if (shown.length) setSteps(shown);
  };
  return (
    <>
      <AttentionRing active={turn}>
        <Button size="icon-sm" className="rounded-full!" onClick={start} title={`How the ${name} works`} aria-label={`How the ${name} works`}>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6.25" />
            <path d="M10.5 5.5 9 9 5.5 10.5 7 7Z" fill="currentColor" stroke="none" />
          </svg>
        </Button>
      </AttentionRing>
      <Tour steps={steps ?? []} root={root ?? undefined} open={steps !== null} onClose={() => setSteps(null)} />
    </>
  );
}
