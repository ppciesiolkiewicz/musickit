"use client";

import { useEffect, useState } from "react";
import { AttentionRing, Button, HintToggle, Popover, Tour } from "@/components/ui";
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
 * (which shows only inside a HintProvider). The Simple / Standard switch lives in the theme picker. With `nudge`, a note
 * beside the button points at it too, until the button is first pressed.
 */
export default function PageHelp({ pageId, tour = [], nudge = false }: { pageId: string; tour?: TourStep[]; nudge?: boolean }) {
  const { level } = useLevel(pageId);
  const [seen, markSeen] = useTourSeen(pageId);
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  useCoverage({ tourSteps: tour.length }, { kind: "page", id: pageId });
  // the note waits a moment after load: the seen flag is read from storage after hydration, so it never flashes for a
  // player who has pressed the button before
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!nudge) return;
    const t = setTimeout(() => setSettled(true), 800);
    return () => clearTimeout(t);
  }, [nudge]);

  const startTour = () => {
    markSeen();
    const shown = visibleSteps(tour, level, present);
    if (shown.length) setSteps(shown);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tour.length > 0 && (
        <Popover open={nudge && settled && !seen} side="corner" content="Press here for a tour of this page">
          <AttentionRing active={!seen}>
            <Button size="icon-sm" className="rounded-full!" onClick={startTour} title="Show me around this page" aria-label="Show me around this page">
              <TourIcon />
            </Button>
          </AttentionRing>
        </Popover>
      )}
      <HintToggle />
      <Tour steps={steps ?? []} open={steps !== null} onClose={() => setSteps(null)} />
    </div>
  );
}
