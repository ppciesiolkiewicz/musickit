import type { PlanTool } from "@/features/plan/model/tools";
import { squeeze, type Sample } from "./clock";
import { hasOverlay, type Overlay } from "./overlay";
import type { KeptTake } from "./takeKey";
import { clickClock } from "./takeNotes";

/**
 * The overlay a take saves: the drawn tool and one clock. Recorded to the click, the click's grid is the clock, so the tool
 * moves with the video though it was never started. Without the click, the tool's own beat as sampled, when it was
 * started at all. None for a tool that isn't drawn over a video. Pure.
 */
export function takeOverlay(drawn: PlanTool | null, click: KeptTake["click"], samples: Sample[]): Overlay | null {
  if (!drawn || !hasOverlay(drawn)) return null;
  if (click) return { tool: drawn, clock: clickClock(click.downbeat, click.bpm) };
  return samples.some((s) => s.beat !== null) ? { tool: drawn, clock: squeeze(samples) } : null;
}
