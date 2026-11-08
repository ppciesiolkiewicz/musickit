"use client";

import { useState } from "react";
import { AttentionRing, Button, Chip, HintToggle, Tour } from "@/components/ui";
import { LEVELS, atLeast, type Level } from "./levels";
import { visibleSteps, type TourStep } from "./tour";
import { useCoverage } from "./useCoverage";
import { useLevel } from "./useLevel";
import { useTourSeen } from "./useTourSeen";

const LABEL: Record<Level, string> = { simple: "Simple", standard: "Standard" };
const TOP = LEVELS[LEVELS.length - 1];

/** "Show more" / "Show less": a quiet link-like button, so it reads as a footnote to the switch rather than another control. */
function TextLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    // padding gives the small text a tap-sized target; the negative margin keeps the row's spacing as it was
    <button type="button" onClick={onClick} title={`${children} on this page only`}
      className="-mx-2 -my-1.5 inline-flex min-h-8 items-center rounded-md px-2 py-1.5 text-[11px] text-sky-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-sky-400 pointer-coarse:min-h-11">
      {children}
    </button>
  );
}

function present(target: string): boolean {
  return !!document.querySelector(`[data-tour="${CSS.escape(target)}"]`);
}

/**
 * The page's help cluster for the title row: the Simple / Standard switch (the global level; switching clears every
 * page's own setting), a "Show more" / "Show less" link that moves only this page one step, the tour button (wobbling
 * until it is first clicked) and the hints "?" (which shows only inside a HintProvider).
 */
export default function PageHelp({ pageId, tour = [] }: { pageId: string; tour?: TourStep[] }) {
  const { level, global, setGlobal, showMore, showLess, overridden } = useLevel(pageId);
  const [seen, markSeen] = useTourSeen(pageId);
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  useCoverage({ tourSteps: tour.length }, { kind: "page", id: pageId });
  const more = !atLeast(level, TOP);
  // only while this page sits above the global level: "Show less" undoes a "Show more"
  const less = overridden && !atLeast(global, level);

  const startTour = () => {
    markSeen();
    const shown = visibleSteps(tour, level, present);
    if (shown.length) setSteps(shown);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Detail level" className="flex items-center gap-1">
        {LEVELS.map((l) => (
          <Chip key={l} on={global === l} onClick={() => setGlobal(l)} title={`${LABEL[l]} on every page`}>
            {LABEL[l]}
          </Chip>
        ))}
      </div>
      {less && <TextLink onClick={showLess}>Show less</TextLink>}
      {more && <TextLink onClick={showMore}>Show more</TextLink>}
      {tour.length > 0 && (
        <AttentionRing active={!seen}>
          <Button size="icon-sm" className="rounded-full!" onClick={startTour} title="Show me around this page" aria-label="Show me around this page">
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6.25" />
              <path d="M10.5 5.5 9 9 5.5 10.5 7 7Z" fill="currentColor" stroke="none" />
            </svg>
          </Button>
        </AttentionRing>
      )}
      <HintToggle />
      <Tour steps={steps ?? []} open={steps !== null} onClose={() => setSteps(null)} />
    </div>
  );
}
