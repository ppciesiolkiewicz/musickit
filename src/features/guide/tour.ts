import { atLeast, type Level } from "./levels";

/** `target` is a `data-tour` attribute value. */
export type TourStep = {
  target: string;
  title: string;
  text: string;
  minLevel?: Level;
};

/** Steps shown at `level` whose target is on the page, in order. */
export function visibleSteps(
  steps: TourStep[],
  level: Level,
  present: (target: string) => boolean,
): TourStep[] {
  return steps.filter(
    (s) => (s.minLevel === undefined || atLeast(level, s.minLevel)) && present(s.target),
  );
}

export function seenKey(pageId: string): string {
  return `musickit.tour.${pageId}`;
}

export function parseSeen(raw: string | null): boolean {
  return raw === "1";
}
