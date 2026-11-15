"use client";

import { useState } from "react";
import { StarRating } from "@/components/ui";
import type { Stars } from "@/features/progress/stars";
import { MAX_REVIEW_WHY } from "../model/state";
import type { PlanReview } from "../model/types";

/** How much the player liked the plan as a whole: not the exercise scale (how well they can do it). `[0]` is 1 star. */
export const PLAN_REVIEW_LABELS = ["Not for me", "Not quite right", "It was fine", "Good for me", "Just what I needed"] as const;

/** Under this many stars the step asks why. */
const ASK_WHY_BELOW = 3;

const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";

/**
 * Plan next week's first screen once the week is over: stars for the whole plan and, under 1 or 2 stars, a box asking why.
 * The box keeps its own text, so spaces typed at the end stay while typing; the trimmed text goes up. Picking 3 stars or
 * more empties it (the why is kept only for a low review, `cleanReview`).
 */
export default function PlanReviewStep({ review, onReview }: {
  review: PlanReview | null;
  onReview: (r: { stars: Stars; why?: string } | null) => void;
}) {
  const [why, setWhy] = useState(review?.why ?? "");
  const stars = review?.stars ?? null;
  const asks = stars !== null && stars < ASK_WHY_BELOW;
  const pick = (v: number | null) => {
    const next = v as Stars | null;
    if (next === null || next >= ASK_WHY_BELOW) {
      setWhy("");
      onReview(next === null ? null : { stars: next });
    } else onReview(why.trim() ? { stars: next, why: why.trim() } : { stars: next });
  };
  const type = (text: string) => {
    setWhy(text);
    if (stars !== null) onReview(text.trim() ? { stars, why: text.trim() } : { stars });
  };
  return (
    <div className="flex h-full flex-col gap-4">
      <StarRating value={stars} onChange={pick} labels={PLAN_REVIEW_LABELS} label="How much you liked this plan" />
      {asks && (
        <label className="flex min-h-0 flex-1 flex-col gap-2 text-sm text-slate-200">
          Can you tell us why?
          <textarea className={`${field} min-h-0 flex-1`} value={why} maxLength={MAX_REVIEW_WHY} onChange={(e) => type(e.target.value)} placeholder="Too fast, too easy, not the music I play…" />
        </label>
      )}
    </div>
  );
}
