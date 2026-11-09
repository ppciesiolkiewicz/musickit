"use client";

import { useState } from "react";
import { AttentionRing, Button, HintToggle, Tour } from "@/components/ui";
import { visibleSteps, type TourStep } from "./tour";
import { useCoverage } from "./useCoverage";
import { useLevel } from "./useLevel";
import { useTourSeen } from "./useTourSeen";

function present(target: string): boolean {
  return !!document.querySelector(`[data-tour="${CSS.escape(target)}"]`);
}

/** The compass on the tour button. */
export function TourIcon({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M10.5 5.5 9 9 5.5 10.5 7 7Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * The page's help cluster for the title row: the tour button (wobbling until it is first clicked) and the hints "?"
 * (which shows only inside a HintProvider). The Simple / Standard switch lives in the theme picker.
 */
export default function PageHelp({ pageId, tour = [] }: { pageId: string; tour?: TourStep[] }) {
  const { level } = useLevel(pageId);
  const [seen, markSeen] = useTourSeen(pageId);
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  useCoverage({ tourSteps: tour.length }, { kind: "page", id: pageId });

  const startTour = () => {
    markSeen();
    const shown = visibleSteps(tour, level, present);
    if (shown.length) setSteps(shown);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tour.length > 0 && (
        <AttentionRing active={!seen}>
          <Button size="icon-sm" className="rounded-full!" onClick={startTour} title="Show me around this page" aria-label="Show me around this page">
            <TourIcon />
          </Button>
        </AttentionRing>
      )}
      <HintToggle />
      <Tour steps={steps ?? []} open={steps !== null} onClose={() => setSteps(null)} />
    </div>
  );
}
